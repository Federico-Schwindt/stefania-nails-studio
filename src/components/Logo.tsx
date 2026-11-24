import logoRaw from '../../brand/identidad/logo.svg?raw'

// SVG maestro de la marca (no se redibuja): sólo se cambia el relleno por currentColor
// para poder usarlo en bordó o en blanco.
const svg = logoRaw
  .replace('fill="#570314"', 'fill="currentColor"')
  .replace(/width="820" height="323"/, 'width="100%" height="100%"')
  .replace('role="img" aria-labelledby="name"', 'aria-hidden="true" focusable="false"')
  .replace(/<title[^>]*>.*?<\/title>/, '')

export function Logo({ className = '', label = 'Stefania Nails Studio' }: { className?: string; label?: string }) {
  return (
    <span role="img" aria-label={label} className={`inline-block aspect-[820/323] ${className}`} dangerouslySetInnerHTML={{ __html: svg }} />
  )
}
