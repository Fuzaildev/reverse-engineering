import type { DesignObject } from '../lib/designSchema'
import { FONT_SANS } from '../lib/fonts'

type Props = {
  width: number
  height: number
  background: string
  objects: DesignObject[]
  className?: string
  title?: string
  fit?: 'slice' | 'meet'
}

export function DesignPreview({
  width,
  height,
  background,
  objects,
  className,
  title,
  fit = 'slice',
}: Props) {
  return (
    <svg
      className={className}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio={fit === 'meet' ? 'xMidYMid meet' : 'xMidYMid slice'}
      role={title ? 'img' : undefined}
      aria-label={title}
    >
      <rect width={width} height={height} fill={background} />
      {objects.map((obj) => (
        <PreviewObject key={obj.id} obj={obj} />
      ))}
    </svg>
  )
}

function PreviewObject({ obj }: { obj: DesignObject }) {
  const opacity = obj.opacity ?? 1
  const angle = obj.angle ?? 0

  if (obj.type === 'rect') {
    const x = obj.left - obj.width / 2
    const y = obj.top - obj.height / 2
    return (
      <rect
        x={x}
        y={y}
        width={obj.width}
        height={obj.height}
        rx={obj.rx ?? 0}
        ry={obj.ry ?? 0}
        fill={obj.fill}
        opacity={opacity}
        transform={`rotate(${angle} ${obj.left} ${obj.top})`}
      />
    )
  }

  if (obj.type === 'circle') {
    return (
      <circle
        cx={obj.left}
        cy={obj.top}
        r={obj.radius}
        fill={obj.fill}
        opacity={opacity}
        transform={`rotate(${angle} ${obj.left} ${obj.top})`}
      />
    )
  }

  if (obj.type === 'ellipse') {
    return (
      <ellipse
        cx={obj.left}
        cy={obj.top}
        rx={obj.rx}
        ry={obj.ry}
        fill={obj.fill}
        opacity={opacity}
        transform={`rotate(${angle} ${obj.left} ${obj.top})`}
      />
    )
  }

  if (obj.type === 'text') {
    const lines = obj.text.split('\n')
    const lineHeight = obj.fontSize * 1.12
    const anchor =
      obj.textAlign === 'center'
        ? 'middle'
        : obj.textAlign === 'right'
          ? 'end'
          : 'start'
    // Schema uses top-left (or align-based) text anchors, matching Fabric origins.
    const x = obj.left
    const y = obj.top + obj.fontSize * 0.8

    return (
      <text
        x={x}
        y={y}
        fill={obj.fill}
        fontSize={obj.fontSize}
        fontWeight={obj.fontWeight ?? 600}
        fontFamily={obj.fontFamily ?? FONT_SANS}
        style={{
          fontFamily: obj.fontFamily ?? FONT_SANS,
          fontWeight: obj.fontWeight ?? 600,
          fontSize: obj.fontSize,
        }}
        textAnchor={anchor}
        opacity={opacity}
        transform={`rotate(${angle} ${obj.left} ${obj.top})`}
      >
        {lines.map((line, index) => (
          <tspan key={index} x={x} dy={index === 0 ? 0 : lineHeight}>
            {line}
          </tspan>
        ))}
      </text>
    )
  }

  return null
}
