import type { BlendMode } from './designSchema'
import { FONT_DISPLAY, FONT_SANS, FONT_SERIF } from './fonts'

const KEY = 'reverse.brand-kit.v1'

export interface BrandKit {
  name: string
  colors: string[]
  fonts: string[]
  updatedAt: number
}

export const DEFAULT_BRAND: BrandKit = {
  name: 'Studio kit',
  colors: ['#14120f', '#f6f1e8', '#c6a15b', '#0b6e4f', '#e24b2a', '#10241f'],
  fonts: [FONT_SERIF, FONT_SANS, FONT_DISPLAY],
  updatedAt: Date.now(),
}

export function loadBrandKit(): BrandKit {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { ...DEFAULT_BRAND, colors: [...DEFAULT_BRAND.colors], fonts: [...DEFAULT_BRAND.fonts] }
    const parsed = JSON.parse(raw) as BrandKit
    return {
      name: parsed.name || DEFAULT_BRAND.name,
      colors: parsed.colors?.length ? parsed.colors.slice(0, 12) : [...DEFAULT_BRAND.colors],
      fonts: parsed.fonts?.length ? parsed.fonts : [...DEFAULT_BRAND.fonts],
      updatedAt: parsed.updatedAt || Date.now(),
    }
  } catch {
    return { ...DEFAULT_BRAND, colors: [...DEFAULT_BRAND.colors], fonts: [...DEFAULT_BRAND.fonts] }
  }
}

export function saveBrandKit(kit: BrandKit) {
  const next = { ...kit, updatedAt: Date.now() }
  localStorage.setItem(KEY, JSON.stringify(next))
  return next
}

export function addBrandColor(kit: BrandKit, color: string): BrandKit {
  const normalized = color.toLowerCase()
  if (kit.colors.map((c) => c.toLowerCase()).includes(normalized)) return kit
  return saveBrandKit({ ...kit, colors: [color, ...kit.colors].slice(0, 12) })
}

export type ElementPresetId =
  | 'rule-h'
  | 'rule-v'
  | 'badge'
  | 'pill'
  | 'frame'
  | 'dot'
  | 'quote'
  | 'caption'

export interface ElementPreset {
  id: ElementPresetId
  label: string
  build: (cx: number, cy: number) => import('./designSchema').DesignObject[]
}

export const ELEMENT_PRESETS: ElementPreset[] = [
  {
    id: 'rule-h',
    label: 'Rule',
    build: (cx, cy) => [
      {
        id: crypto.randomUUID(),
        type: 'rect',
        left: cx,
        top: cy,
        width: 220,
        height: 3,
        fill: '#c6a15b',
        role: 'accent',
      },
    ],
  },
  {
    id: 'rule-v',
    label: 'Spine',
    build: (cx, cy) => [
      {
        id: crypto.randomUUID(),
        type: 'rect',
        left: cx,
        top: cy,
        width: 4,
        height: 280,
        fill: '#c6a15b',
        role: 'accent',
      },
    ],
  },
  {
    id: 'badge',
    label: 'Badge',
    build: (cx, cy) => [
      {
        id: crypto.randomUUID(),
        type: 'circle',
        left: cx,
        top: cy,
        radius: 54,
        fill: '#e24b2a',
        role: 'accent',
      },
      {
        id: crypto.randomUUID(),
        type: 'text',
        left: cx,
        top: cy - 12,
        text: 'NEW',
        fontSize: 18,
        fill: '#ffffff',
        fontWeight: 800,
        textAlign: 'center',
        fontFamily: FONT_DISPLAY,
        role: 'kicker',
      },
    ],
  },
  {
    id: 'pill',
    label: 'Pill',
    build: (cx, cy) => [
      {
        id: crypto.randomUUID(),
        type: 'rect',
        left: cx,
        top: cy,
        width: 160,
        height: 42,
        fill: '#0b6e4f',
        rx: 21,
        ry: 21,
        role: 'accent',
      },
      {
        id: crypto.randomUUID(),
        type: 'text',
        left: cx,
        top: cy - 10,
        text: 'LABEL',
        fontSize: 14,
        fill: '#ffffff',
        fontWeight: 700,
        textAlign: 'center',
        fontFamily: FONT_SANS,
        role: 'cta',
      },
    ],
  },
  {
    id: 'frame',
    label: 'Frame',
    build: (cx, cy) => [
      {
        id: crypto.randomUUID(),
        type: 'rect',
        left: cx,
        top: cy,
        width: 320,
        height: 220,
        fill: '#f4efe6',
        stroke: '#14120f',
        strokeWidth: 2,
        role: 'frame',
      },
    ],
  },
  {
    id: 'dot',
    label: 'Dot',
    build: (cx, cy) => [
      {
        id: crypto.randomUUID(),
        type: 'circle',
        left: cx,
        top: cy,
        radius: 10,
        fill: '#c6a15b',
        role: 'accent',
      },
    ],
  },
  {
    id: 'quote',
    label: 'Quote',
    build: (cx, cy) => [
      {
        id: crypto.randomUUID(),
        type: 'text',
        left: cx,
        top: cy,
        text: '“',
        fontSize: 120,
        fill: '#ddd4c6',
        fontWeight: 400,
        fontFamily: FONT_SERIF,
        role: 'accent',
      },
    ],
  },
  {
    id: 'caption',
    label: 'Caption',
    build: (cx, cy) => [
      {
        id: crypto.randomUUID(),
        type: 'text',
        left: cx,
        top: cy,
        text: 'Add a short caption',
        fontSize: 22,
        fill: '#6f675e',
        fontWeight: 500,
        fontFamily: FONT_SANS,
        role: 'body',
      },
    ],
  },
]

export const BG_PRESETS = [
  '#ffffff',
  '#f3f1ec',
  '#14120f',
  '#0c121c',
  '#10241f',
  '#1a1024',
  '#f6f3ee',
  '#efe7d6',
]

export type TextEffectId = 'none' | 'shadow' | 'outline' | 'lift' | 'glow'

export function textEffectPatch(effect: TextEffectId): {
  shadow: import('./designSchema').LayerShadow | null
  stroke?: string
  strokeWidth?: number
  blendMode?: BlendMode
} {
  switch (effect) {
    case 'shadow':
      return { shadow: { color: 'rgba(0,0,0,0.45)', blur: 18, offsetX: 0, offsetY: 10 } }
    case 'outline':
      return { shadow: null, stroke: '#14120f', strokeWidth: 2 }
    case 'lift':
      return { shadow: { color: 'rgba(0,0,0,0.28)', blur: 32, offsetX: 0, offsetY: 18 } }
    case 'glow':
      return {
        shadow: { color: 'rgba(198,161,91,0.65)', blur: 26, offsetX: 0, offsetY: 0 },
        blendMode: 'screen',
      }
    default:
      return { shadow: null, stroke: undefined, strokeWidth: 0 }
  }
}
