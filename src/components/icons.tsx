import type { ReactNode } from 'react'

type IconProps = { className?: string }

function Svg({ className, children }: IconProps & { children: ReactNode }) {
  return (
    <svg className={className} viewBox="0 0 24 24" width="16" height="16" aria-hidden>
      {children}
    </svg>
  )
}

export function IconSelect(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M6 3.5l9.5 8.2-4 .4 2.2 5.2-1.7.8-2.3-5.3L6 15.6V3.5z" fill="currentColor" />
    </Svg>
  )
}

export function IconText(props: IconProps) {
  return (
    <Svg {...props}>
      <path
        d="M5 6.5h14M12 6.5V18M8.5 18h7"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </Svg>
  )
}

export function IconRect(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="4.5" y="6" width="15" height="12" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.7" />
    </Svg>
  )
}

export function IconCircle(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.7" />
    </Svg>
  )
}

export function IconEllipse(props: IconProps) {
  return (
    <Svg {...props}>
      <ellipse cx="12" cy="12" rx="8" ry="5.2" fill="none" stroke="currentColor" strokeWidth="1.7" />
    </Svg>
  )
}

export function IconImage(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="4" y="5" width="16" height="14" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="9" cy="10" r="1.4" fill="currentColor" />
      <path d="M5.5 16.5l4-3.5 2.5 2 2.2-2 4.3 3.5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
    </Svg>
  )
}
