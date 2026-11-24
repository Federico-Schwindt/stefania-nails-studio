# Conectar Stefania Nails Studio a Supabase

## 1. Creá el proyecto

Entrá al panel de Supabase, creá una organización con el plan **Free** y elegí **New project**. Usá el nombre `stefania-nails-studio`, guardá la contraseña de la base y esperá a que termine la creación. En **Connect** copiá la URL del proyecto y la clave pública para el navegador (`anon` o `sb_publishable_…`). La referencia del proyecto es el identificador que aparece antes de `.supabase.co`. [Planes de Supabase](https://supabase.com/pricing)

## 2. Cargá la base y el catálogo

Desde **SQL Editor → New query**, abrí los siguientes archivos y ejecutá el contenido completo de cada uno, en este orden.

1. [Migración inicial](../supabase/migrations/20261124000000_init.sql). Crea las tablas, las reglas de acceso, las funciones de reserva y los buckets de imágenes.
2. [Datos iniciales](../supabase/seed.sql). Carga cinco servicios, dos extras, once diseños, los siete días de atención y la configuración inicial con una seña fija de $5.000 y pagos simulados.

Si preferís usar la terminal, corré estos comandos desde la raíz del repositorio. Reemplazá `TU_PROJECT_REF` por la referencia de tu proyecto. La opción `--include-seed` carga también el catálogo. [Referencia de la CLI](https://supabase.com/docs/reference/cli/supabase-db-push)

```sh
npx supabase login
npx supabase link --project-ref TU_PROJECT_REF
npx supabase db push --include-seed
```

Podés comprobar la carga ejecutando esta consulta en SQL Editor.

```sql
select (select count(*) from public.services) as servicios,
       (select count(*) from public.extras) as extras,
       (select count(*) from public.designs) as disenos,
       (select data->>'paymentsMode' from public.settings where id = 1) as pagos;
```

## 3. Habilitá la cuenta administradora

En **Authentication → Users → Add user**, creá el usuario con el correo y la contraseña del estudio. Confirmá el correo al crearlo o completá la confirmación por email. Copiá el **User UID** y reemplazá el texto de ejemplo antes de ejecutar esta consulta.

```sql
insert into public.admins (user_id)
values ('UUID_DEL_USUARIO')
on conflict do nothing;
```

Ingresá al panel del estudio con ese correo y esa contraseña. Las clientas pueden reservar sin cuenta. El enlace de cada reserva contiene el UUID que da acceso a sus datos. Compartilo sólo con la clienta correspondiente.

## 4. Configurá Mercado Pago y desplegá las funciones

En **Mercado Pago Developers → Tus integraciones**, abrí la aplicación de Checkout Pro del estudio. Buscá el Access Token de prueba del vendedor. En **Webhooks**, seleccioná el entorno de prueba, activá el evento **Pagos** y pegá esta URL, con la referencia real de Supabase.

```text
https://TU_PROJECT_REF.supabase.co/functions/v1/mp-webhook
```

Guardá la configuración y copiá la **clave secreta de Webhooks** de ese entorno. La función usa esa clave para verificar la firma y consulta el estado del pago directamente en Mercado Pago. [Configuración de notificaciones](https://www.mercadopago.com.ar/developers/es/docs/checkout-pro-preferences/payment-notifications)

Si cargaste el SQL desde el navegador, ejecutá primero `npx supabase login` y `npx supabase link --project-ref TU_PROJECT_REF` desde la raíz del repo. Reemplazá los valores de ejemplo por el token y la clave de firma reales. Para `SITE_URL` usá la dirección pública del sitio con la ruta del repositorio y sin fragmento `#`.

```sh
npx supabase secrets set MP_ACCESS_TOKEN=TEST-... SITE_URL=https://federico-schwindt.github.io/stefania-nails-studio/ MP_WEBHOOK_SECRET=...
npx supabase functions deploy create-preference --no-verify-jwt
npx supabase functions deploy mp-webhook --no-verify-jwt
```

Supabase proporciona `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` al entorno de las funciones. Conservá la clave de servicio, el token de Mercado Pago y la clave de firma exclusivamente en el backend. [Secretos de Edge Functions](https://supabase.com/docs/guides/functions/secrets)

## 5. Conectá GitHub Pages

En el repositorio de GitHub, abrí **Settings → Secrets and variables → Actions → New repository secret** y creá estos dos secretos. [Secretos de GitHub Actions](https://docs.github.com/es/actions/how-tos/write-workflows/choose-what-workflows-do/use-secrets)

| Nombre | Valor |
| --- | --- |
| `VITE_SUPABASE_URL` | URL del proyecto, por ejemplo `https://TU_PROJECT_REF.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Clave pública del mismo proyecto |

Comprobá que el paso que compila Vite recibe ambos secretos como variables de entorno con esos nombres. Volvé a ejecutar el workflow de Pages para que el sitio publicado incorpore los valores. Abrí el sitio e iniciá sesión en el panel. En **Configuración → Pagos**, seleccioná **Mercado Pago** y guardá.

## 6. Probá un pago aprobado y uno rechazado

1. En **Tus integraciones → Cuentas de prueba**, ubicá un comprador de Argentina distinto del vendedor. Abrí el sitio en una ventana privada, creá una reserva e iniciá el pago de la seña. En Checkout, ingresá con el comprador de prueba. Para aplicaciones de Checkout Pro, el token del vendedor de prueba también puede comenzar con `APP_USR`. Usá el valor completo que muestra su entorno de prueba. [Cuentas de prueba](https://www.mercadopago.com.ar/developers/es/docs/checkout-pro-preferences/test-accounts)
2. Usá la Visa de prueba `4509 9535 6623 3704`, vencimiento `11/30`, código `123` y DNI `12345678`. Con el titular **APRO** el resultado esperado es aprobado. Verificá el importe de la seña y completá la compra. [Tarjetas y resultados de prueba](https://www.mercadopago.com.ar/developers/es/docs/checkout-pro-preferences/integration-test/test-purchases)
3. Al volver al sitio, la URL debe incluir `?reserva=<UUID>`. Buscá el turno en el panel y comprobá que figure como pagado. En **Table Editor → bookings**, los campos esperados son `status = paid`, `payment_status = approved` y `payment_method = mercadopago`. El webhook también debe acreditar el pago si la clienta cierra la pestaña antes de volver.
4. Creá otra reserva y repetí el pago con el titular **OTHE** para simular un rechazo. Comprobá que el turno siga en `pending_payment` y que figure `payment_status = rejected`. Si el resultado demora, consultá las entregas en **Webhooks** de Mercado Pago y las invocaciones de `mp-webhook` en Supabase.

El horario queda apartado durante 30 minutos desde la creación de la reserva. Si vence y otra clienta toma ese horario, la reserva anterior queda cancelada. Si después llega una acreditación para ese turno, el pago queda registrado en la reserva cancelada. Revisalo con la clienta para reprogramar o devolver la seña.

## 7. Pasá a producción

Activá las **credenciales de producción** de la cuenta vendedora del estudio. En el entorno de producción de Webhooks, configurá la misma URL de `mp-webhook`, habilitá **Pagos** y copiá la clave de firma correspondiente. Actualizá ambos secretos juntos y verificá que **Pagos** siga en **Mercado Pago**. [Credenciales de Mercado Pago](https://www.mercadopago.com.ar/developers/es/docs/your-integrations/credentials)

```sh
npx supabase secrets set MP_ACCESS_TOKEN=TOKEN_DE_PRODUCCION MP_WEBHOOK_SECRET=CLAVE_WEBHOOK_DE_PRODUCCION
```

En el primer cobro real, compará el ID y el importe del pago en la cuenta del estudio con `payment_id` y `deposit` de la reserva.
