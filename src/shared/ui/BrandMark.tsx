/**
 * Emblema do produto: hexágono técnico com linha de telemetria e marcas de precisão
 * (engenharia e controle de projetos), em moldura quadrada navy. Puramente vetorial.
 */
export function BrandMark({ title = 'Project Management Board' }: { title?: string }) {
  return (
    <span className="brand-mark" title={title} aria-hidden="true">
      <svg
        className="brand-emblem"
        width="20"
        height="20"
        viewBox="0 0 20 20"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polygon points="10,1.5 17.36,5.75 17.36,14.25 10,18.5 2.64,14.25 2.64,5.75" strokeWidth="1.5" />
        <path d="M10 4.4v1.4M10 14.2v1.4M5.2 10h.9M13.9 10h.9" strokeWidth="1" opacity="0.65" />
        <polyline points="5.2,11.2 7.4,11.2 8.8,7.6 10.9,12.8 12.3,9.6 14.8,9.6" strokeWidth="1.4" />
      </svg>
    </span>
  );
}
