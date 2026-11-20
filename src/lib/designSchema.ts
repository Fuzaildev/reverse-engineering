import type { PresetId } from './presets'

export const DESIGN_SCHEMA_VERSION = 1 as const

export type DesignObjectType =
  | 'text'
  | 'rect'
  | 'circle'
  | 'ellipse'
  | 'image'
  | 'group'

/** Semantic intent for Composition Lab (DNA / reflow / balance). */
export type LayerRole =
  | 'auto'
  | 'headline'
  | 'subhead'
  | 'kicker'
  | 'cta'
  | 'body'
  | 'accent'
  | 'frame'
  | 'media'

export interface LayerShadow {
  color: string
  blur: number
  offsetX: number
  offsetY: number
}

export type BlendMode =
  | 'source-over'
  | 'multiply'
  | 'screen'
  | 'overlay'
  | 'darken'
  | 'lighten'
  | 'color-dodge'
  | 'color-burn'
  | 'hard-light'
  | 'soft-light'
  | 'difference'
  | 'exclusion'

export interface DesignObjectBase {
  id: string
  type: DesignObjectType
  left: number
  top: number
  angle?: number
  opacity?: number
  selectable?: boolean
  locked?: boolean
  visible?: boolean
  name?: string
  role?: LayerRole
  shadow?: LayerShadow | null
  blendMode?: BlendMode
  stroke?: string
  strokeWidth?: number
}

export interface TextObject extends DesignObjectBase {
  type: 'text'
  text: string
  fontSize: number
  fontFamily?: string
  fontWeight?: string | number
  fill: string
  textAlign?: 'left' | 'center' | 'right'
}

export interface RectObject extends DesignObjectBase {
  type: 'rect'
  width: number
  height: number
  fill: string
  rx?: number
  ry?: number
}

export interface CircleObject extends DesignObjectBase {
  type: 'circle'
  radius: number
  fill: string
}

export interface EllipseObject extends DesignObjectBase {
  type: 'ellipse'
  rx: number
  ry: number
  fill: string
}

export interface GroupObject extends DesignObjectBase {
  type: 'group'
  snapshot: Record<string, unknown>
}

export interface ImageObject extends DesignObjectBase {
  type: 'image'
  src: string
  scaleX?: number
  scaleY?: number
}

export type DesignObject =
  | TextObject
  | RectObject
  | CircleObject
  | EllipseObject
  | ImageObject
  | GroupObject

export interface DesignDocument {
  version: typeof DESIGN_SCHEMA_VERSION
  id: string
  name: string
  presetId: PresetId
  width: number
  height: number
  background: string
  objects: DesignObject[]
  updatedAt: number
  createdAt: number
}

export type TemplateCategory =
  | 'Launch'
  | 'Editorial'
  | 'Promo'
  | 'Quote'
  | 'Story'
  | 'Thumbnail'
  | 'Social'

export interface DesignTemplate {
  id: string
  name: string
  category: TemplateCategory
  summary: string
  presetId: PresetId
  thumbnailBg: string
  document: Omit<DesignDocument, 'id' | 'name' | 'updatedAt' | 'createdAt'>
}

export function createEmptyDesign(
  presetId: PresetId,
  width: number,
  height: number,
  name = 'Untitled',
): DesignDocument {
  const now = Date.now()
  return {
    version: DESIGN_SCHEMA_VERSION,
    id: crypto.randomUUID(),
    name,
    presetId,
    width,
    height,
    background: '#ffffff',
    objects: [],
    createdAt: now,
    updatedAt: now,
  }
}

export function templateToDesign(
  template: DesignTemplate,
  name?: string,
): DesignDocument {
  const now = Date.now()
  return {
    ...template.document,
    version: DESIGN_SCHEMA_VERSION,
    id: crypto.randomUUID(),
    name: name ?? template.name,
    createdAt: now,
    updatedAt: now,
  }
}
