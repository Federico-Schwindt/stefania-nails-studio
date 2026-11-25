import { Check } from '@phosphor-icons/react'
import { motion } from 'motion/react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Img } from '../../components/Img'
import { Skeleton } from '../../components/ui'
import { thumbUrl } from '../../lib/api'
import { useCatalog } from '../../lib/store'
import type { Design } from '../../lib/types'
import { BTN_GHOST, SectionHead, WRAP, reveal } from './parts'

/** Tarjeta: foto real del trabajo; al pasar el mouse muestra el mismo diseño en la mano modelo. */
export function DesignCard({
  d,
  active,
  onPreview,
  onSelect,
  compact,
}: {
  d: Design
  active: boolean
  onPreview: (d: Design) => void
  onSelect: (d: Design) => void
  compact?: boolean
}) {
  const img = d.photoUrl ?? d.renderUrl
  return (
    <button
      type="button"
      onMouseEnter={() => onPreview(d)}
      onFocus={() => onPreview(d)}
      onClick={() => onSelect(d)}
      aria-pressed={active}
      aria-label={`${d.name}. ${d.description ?? ''}`}
      className="group block w-full text-left"
    >
      <div
        className={`${compact ? 'aspect-square' : 'aspect-[4/5]'} relative overflow-hidden rounded-[10px] bg-[#151314] transition ${
          active ? 'ring-2 ring-ink ring-offset-2 ring-offset-coal' : ''
        }`}
      >
        {img ? (
          <Img src={img.startsWith('img:') ? img : thumbUrl(img)} alt="" className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.03]" loading="lazy" />
        ) : (
          <div className="flex h-full w-full items-center justify-center p-4 text-center">
            <span className="font-serif text-2xl text-bone">{d.name}</span>
          </div>
        )}
        {d.renderUrl && d.photoUrl && (
          <img
            src={thumbUrl(d.renderUrl)}
            alt=""
            className="absolute inset-0 h-full w-full bg-[#f4f2ef] object-cover opacity-0 transition duration-500 group-hover:opacity-100"
            loading="lazy"
          />
        )}
      </div>
      <div className="mt-2.5 flex items-center justify-between gap-2">
        <span className={`truncate font-serif leading-tight text-ink ${compact ? 'text-[17px]' : 'text-[20px]'}`}>{d.name}</span>
        {active && <Check size={16} weight="bold" className="shrink-0 text-ink" />}
      </div>
    </button>
  )
}

export function Designs() {
  const { designs, loaded } = useCatalog()
  const navigate = useNavigate()
  const [all, setAll] = useState(false)
  const list = designs.filter((d) => d.photoUrl)
  const shown = all ? list : list.slice(0, 8)

  return (
    <section id="disenos" className={`${WRAP} scroll-mt-20 py-16 md:py-24`}>
      <SectionHead
        label="Diseños"
        title="Trabajos del estudio"
        text="Fotos reales de clientas. Tocá una para reservar con ese diseño; en la compu, pasá el mouse para verlo en mano."
      />
      {!loaded ? (
        <div className="mt-12 grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 lg:mt-16 lg:grid-cols-4">
          {Array.from({ length: 8 }, (_, i) => (
            <Skeleton key={i} className="aspect-[4/5] rounded-[10px]" />
          ))}
        </div>
      ) : (
        <div className="mt-12 grid grid-cols-2 gap-x-3 gap-y-7 sm:gap-x-4 md:grid-cols-3 lg:mt-16 lg:grid-cols-4 lg:gap-x-5 lg:gap-y-10">
          {shown.map((d, i) => (
            <motion.div key={d.id} {...reveal(i % 4)}>
              <DesignCard d={d} active={false} onPreview={() => {}} onSelect={(x) => navigate(`/reservar?diseno=${x.id}`)} />
            </motion.div>
          ))}
        </div>
      )}
      {loaded && list.length > shown.length && (
        <div className="mt-12 flex justify-center">
          <button onClick={() => setAll(true)} className={BTN_GHOST}>
            Ver los {list.length} diseños
          </button>
        </div>
      )}
    </section>
  )
}
