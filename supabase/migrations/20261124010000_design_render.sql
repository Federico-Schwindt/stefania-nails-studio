-- Render fotorrealista de cada diseño sobre la mano modelo (img/disenos/<id>.webp)
alter table public.designs add column if not exists render_url text;

update public.designs set render_url = 'img/disenos/' || id || '.webp'
where render_url is null and id in (
  'firma-bordo', 'francesita-dorada', 'francesita-almendra', 'baby-boomer', 'baby-boomer-joya',
  'florcitas', 'dorado-chrome', 'corazones', 'animal-print', 'french-corta', 'natural-fino'
);
