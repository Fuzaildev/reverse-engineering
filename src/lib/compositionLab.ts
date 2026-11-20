import type {
  DesignDocument,
  DesignObject,
  LayerRole,
  TextObject,
} from './designSchema'
import { DESIGN_SCHEMA_VERSION } from './designSchema'
import { PRESETS, type PresetId } from './presets'

export const ROLE_OPTIONS: { id: LayerRole; label: string }[] = [
  { id: 'auto', label: 'Auto' },
  { id: 'headline', label: 'Headline' },
  { id: 'subhead', label: 'Subhead' },
  { id: 'kicker', label: 'Kicker' },
  { id: 'cta', label: 'CTA' },
  { id: 'body', label: 'Body' },
  { id: 'accent', label: 'Accent' },
  { id: 'frame', label: 'Frame' },
  { id: 'media', label: 'Media' },
]

export interface Gene {
  id: string
  role: Exclude<LayerRole, 'auto'>
  type: DesignObject['type']
  nx: number
  ny: number
  nw: number
  nh: number
  mass: number
  angle: number
  opacity: number
  fill?: string
  text?: string
  fontSize: number
  fontFamily?: string
  fontWeight?: string | number
  textAlign?: TextObject['textAlign']
  rx?: number
  source: DesignObject
}

export interface CompositionDNA {
  version: 1
  name: string
  sourcePresetId: PresetId
  width: number
  height: number
  background: string
  palette: string[]
  genes: Gene[]
  balance: BalanceReport
  extractedAt: number
}

export interface BalanceReport {
  cx: number
  cy: number
  score: number
  biasX: 'left' | 'center' | 'right'
  biasY: 'top' | 'middle' | 'bottom'
  contrast: number
  safeMargin: number
  fitLabel: string
}

export interface ReflowPackResult {
  sourceId: string
  variants: DesignDocument[]
  dna: CompositionDNA
}

const DNA_KEY = 'reverse.composition-dna'

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n))
}

function luminance(hex: string) {
  const raw = hex.replace('#', '')
  if (raw.length !== 6) return 0.5
  const r = parseInt(raw.slice(0, 2), 16) / 255
  const g = parseInt(raw.slice(2, 4), 16) / 255
  const b = parseInt(raw.slice(4, 6), 16) / 255
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function objectBounds(obj: DesignObject, w: number, _h: number) {
  if (obj.type === 'text') {
    const approxW = Math.min(w * 0.9, Math.max(40, obj.text.length * obj.fontSize * 0.52))
    const approxH = obj.fontSize * 1.15
    const align = obj.textAlign ?? 'left'
    const left =
      align === 'center' ? obj.left - approxW / 2 : align === 'right' ? obj.left - approxW : obj.left
    return { left, top: obj.top, width: approxW, height: approxH, cx: left + approxW / 2, cy: obj.top + approxH / 2 }
  }
  if (obj.type === 'rect') {
    return {
      left: obj.left - obj.width / 2,
      top: obj.top - obj.height / 2,
      width: obj.width,
      height: obj.height,
      cx: obj.left,
      cy: obj.top,
    }
  }
  if (obj.type === 'circle') {
    const d = obj.radius * 2
    return { left: obj.left - obj.radius, top: obj.top - obj.radius, width: d, height: d, cx: obj.left, cy: obj.top }
  }
  if (obj.type === 'ellipse') {
    return {
      left: obj.left - obj.rx,
      top: obj.top - obj.ry,
      width: obj.rx * 2,
      height: obj.ry * 2,
      cx: obj.left,
      cy: obj.top,
    }
  }
  if (obj.type === 'image') {
    const width = 240 * (obj.scaleX ?? 1)
    const height = 240 * (obj.scaleY ?? 1)
    return {
      left: obj.left - width / 2,
      top: obj.top - height / 2,
      width,
      height,
      cx: obj.left,
      cy: obj.top,
    }
  }
  return { left: obj.left, top: obj.top, width: 80, height: 80, cx: obj.left, cy: obj.top }
}

function opticalMass(obj: DesignObject, bounds: ReturnType<typeof objectBounds>, canvasArea: number) {
  const area = Math.max(1, bounds.width * bounds.height)
  const fillL = 'fill' in obj && typeof obj.fill === 'string' ? luminance(obj.fill) : 0.5
  const contrast = Math.abs(fillL - 0.5) * 2
  const typeBoost =
    obj.type === 'text' ? 1.55 : obj.type === 'image' ? 1.2 : obj.type === 'circle' ? 1.05 : 1
  const sizeBoost = obj.type === 'text' ? clamp(obj.fontSize / 72, 0.6, 2.4) : 1
  return (area / canvasArea) * (0.55 + contrast) * typeBoost * sizeBoost * (obj.opacity ?? 1)
}

export function inferRole(obj: DesignObject, all: DesignObject[], w: number, h: number): Exclude<LayerRole, 'auto'> {
  if (obj.role && obj.role !== 'auto') return obj.role
  if (obj.type === 'image') return 'media'
  if (obj.type === 'rect' || obj.type === 'circle' || obj.type === 'ellipse') {
    const b = objectBounds(obj, w, h)
    const coverage = (b.width * b.height) / (w * h)
    if (coverage > 0.28 || b.width > w * 0.85 || b.height > h * 0.85) return 'frame'
    return 'accent'
  }
  if (obj.type !== 'text') return 'body'

  const texts = all.filter((item): item is TextObject => item.type === 'text')
  const maxSize = Math.max(...texts.map((t) => t.fontSize), obj.fontSize)
  const ratio = obj.fontSize / maxSize
  const y = obj.top / h
  const len = obj.text.trim().length

  if (ratio > 0.82) return 'headline'
  if (ratio > 0.55 && len < 48) return 'subhead'
  if (obj.fontSize <= 28 && y < 0.28) return 'kicker'
  if (obj.fontSize <= 30 && y > 0.72) return 'cta'
  if (len > 60) return 'body'
  if (y > 0.65) return 'cta'
  return 'body'
}

export function analyzeBalance(doc: DesignDocument): BalanceReport {
  const canvasArea = doc.width * doc.height
  let mx = 0
  let my = 0
  let mass = 0
  let minContrast = 1
  let edgePressure = 0

  for (const obj of doc.objects) {
    const b = objectBounds(obj, doc.width, doc.height)
    const m = opticalMass(obj, b, canvasArea)
    mx += b.cx * m
    my += b.cy * m
    mass += m
    if ('fill' in obj && typeof obj.fill === 'string') {
      minContrast = Math.min(minContrast, Math.abs(luminance(obj.fill) - luminance(doc.background)))
    }
    const margin = Math.min(b.left, b.top, doc.width - (b.left + b.width), doc.height - (b.top + b.height))
    if (margin < doc.width * 0.04) edgePressure += 1
  }

  const cx = mass > 0 ? mx / mass / doc.width : 0.5
  const cy = mass > 0 ? my / mass / doc.height : 0.5
  const drift = Math.hypot(cx - 0.5, cy - 0.48)
  const score = clamp(Math.round(100 - drift * 160 - edgePressure * 4 + minContrast * 18), 1, 99)

  const biasX = cx < 0.42 ? 'left' : cx > 0.58 ? 'right' : 'center'
  const biasY = cy < 0.4 ? 'top' : cy > 0.62 ? 'bottom' : 'middle'
  const safeMargin = clamp(1 - edgePressure / Math.max(1, doc.objects.length), 0, 1)
  const contrast = clamp(minContrast, 0, 1)
  const fitLabel =
    score >= 82 ? 'Ship-ready' : score >= 65 ? 'Almost there' : score >= 45 ? 'Needs air' : 'Crowded / tipped'

  return { cx, cy, score, biasX, biasY, contrast, safeMargin, fitLabel }
}

export function extractDNA(doc: DesignDocument): CompositionDNA {
  const canvasArea = doc.width * doc.height
  const genes: Gene[] = doc.objects.map((obj) => {
    const role = inferRole(obj, doc.objects, doc.width, doc.height)
    const b = objectBounds(obj, doc.width, doc.height)
    return {
      id: obj.id,
      role,
      type: obj.type,
      nx: b.cx / doc.width,
      ny: b.cy / doc.height,
      nw: b.width / doc.width,
      nh: b.height / doc.height,
      mass: opticalMass(obj, b, canvasArea),
      angle: obj.angle ?? 0,
      opacity: obj.opacity ?? 1,
      fill: 'fill' in obj ? String(obj.fill) : undefined,
      text: obj.type === 'text' ? obj.text : undefined,
      fontSize: obj.type === 'text' ? obj.fontSize : 0,
      fontFamily: obj.type === 'text' ? obj.fontFamily : undefined,
      fontWeight: obj.type === 'text' ? obj.fontWeight : undefined,
      textAlign: obj.type === 'text' ? obj.textAlign : undefined,
      rx: obj.type === 'rect' ? obj.rx : undefined,
      source: obj,
    }
  })

  const palette = [
    doc.background,
    ...genes.map((g) => g.fill).filter((c): c is string => Boolean(c)),
  ]
  const unique = [...new Set(palette.map((c) => c.toLowerCase()))]

  return {
    version: 1,
    name: doc.name,
    sourcePresetId: doc.presetId,
    width: doc.width,
    height: doc.height,
    background: doc.background,
    palette: unique.slice(0, 8),
    genes,
    balance: analyzeBalance(doc),
    extractedAt: Date.now(),
  }
}

function roleAnchor(role: Gene['role'], aspect: number): { nx: number; ny: number } {
  // Story (tall) stacks; wide formats push CTA right/bottom.
  const tall = aspect < 0.75
  const wide = aspect > 1.35
  switch (role) {
    case 'kicker':
      return { nx: tall ? 0.18 : 0.16, ny: tall ? 0.12 : 0.14 }
    case 'headline':
      return { nx: tall ? 0.2 : wide ? 0.28 : 0.22, ny: tall ? 0.28 : 0.32 }
    case 'subhead':
      return { nx: tall ? 0.2 : 0.24, ny: tall ? 0.42 : 0.48 }
    case 'body':
      return { nx: 0.22, ny: tall ? 0.55 : 0.58 }
    case 'cta':
      return { nx: wide ? 0.22 : 0.2, ny: tall ? 0.86 : 0.84 }
    case 'media':
      return { nx: wide ? 0.72 : 0.7, ny: 0.5 }
    case 'accent':
      return { nx: wide ? 0.78 : 0.76, ny: tall ? 0.28 : 0.3 }
    case 'frame':
      return { nx: 0.5, ny: tall ? 0.62 : 0.55 }
    default:
      return { nx: 0.5, ny: 0.5 }
  }
}

function placeFromGene(gene: Gene, width: number, height: number, scale: number): DesignObject {
  const cx = gene.nx * width
  const cy = gene.ny * height
  const base = {
    id: crypto.randomUUID(),
    angle: gene.angle,
    opacity: gene.opacity,
    role: gene.role as LayerRole,
  }

  if (gene.type === 'text') {
    const fontSize = Math.max(14, Math.round(gene.fontSize * scale))
    const align = gene.textAlign ?? 'left'
    return {
      ...base,
      type: 'text',
      left: cx,
      top: cy - fontSize * 0.15,
      text: gene.text ?? 'Text',
      fontSize,
      fontFamily: gene.fontFamily,
      fontWeight: gene.fontWeight,
      fill: gene.fill ?? '#111111',
      textAlign: align,
    }
  }

  if (gene.type === 'circle') {
    const radius = Math.max(8, (Math.min(gene.nw * width, gene.nh * height) / 2) * 0.92)
    return { ...base, type: 'circle', left: cx, top: cy, radius, fill: gene.fill ?? '#cccccc' }
  }

  if (gene.type === 'ellipse') {
    return {
      ...base,
      type: 'ellipse',
      left: cx,
      top: cy,
      rx: Math.max(8, (gene.nw * width) / 2),
      ry: Math.max(8, (gene.nh * height) / 2),
      fill: gene.fill ?? '#cccccc',
    }
  }

  if (gene.type === 'image') {
    const targetW = gene.nw * width
    const scaleX = targetW / 240
    return {
      ...base,
      type: 'image',
      left: cx,
      top: cy,
      src: gene.source.type === 'image' ? gene.source.src : '',
      scaleX,
      scaleY: scaleX,
    }
  }

  const rw = Math.max(12, gene.nw * width)
  const rh = Math.max(12, gene.nh * height)
  return {
    ...base,
    type: 'rect',
    left: cx,
    top: cy,
    width: rw,
    height: rh,
    fill: gene.fill ?? '#cccccc',
    rx: gene.rx ?? 0,
    ry: gene.rx ?? 0,
  }
}

export function reflowDNA(dna: CompositionDNA, presetId: PresetId, name?: string): DesignDocument {
  const preset = PRESETS.find((p) => p.id === presetId)!
  const sourceAspect = dna.width / dna.height
  const targetAspect = preset.width / preset.height
  const scale = Math.sqrt((preset.width * preset.height) / (dna.width * dna.height))
  const reflowBlend = clamp(Math.abs(Math.log(targetAspect / sourceAspect)) * 0.7, 0.12, 0.78)

  const objects = dna.genes.map((gene) => {
    const anchor = roleAnchor(gene.role, targetAspect)
    const nx = gene.nx * (1 - reflowBlend) + anchor.nx * reflowBlend
    const ny = gene.ny * (1 - reflowBlend) + anchor.ny * reflowBlend
    return placeFromGene({ ...gene, nx, ny }, preset.width, preset.height, scale)
  })

  const now = Date.now()
  return {
    version: DESIGN_SCHEMA_VERSION,
    id: crypto.randomUUID(),
    name: name ?? `${dna.name} → ${preset.label}`,
    presetId,
    width: preset.width,
    height: preset.height,
    background: dna.background,
    objects,
    createdAt: now,
    updatedAt: now,
  }
}

export function buildReflowPack(doc: DesignDocument): ReflowPackResult {
  const dna = extractDNA(doc)
  const variants = PRESETS.filter((p) => p.id !== doc.presetId).map((preset) =>
    reflowDNA(dna, preset.id, `${doc.name} · ${preset.label}`),
  )
  return { sourceId: doc.id, variants, dna }
}

/** Invert visual hierarchy — unique "twin" of the composition. */
export function inventHierarchyTwin(doc: DesignDocument): DesignDocument {
  const dna = extractDNA(doc)
  const texts = dna.genes.filter((g) => g.type === 'text').sort((a, b) => b.fontSize - a.fontSize)
  const sizes = texts.map((t) => t.fontSize)
  const mirrored = [...sizes].reverse()

  const objects = doc.objects.map((obj) => {
    if (obj.type !== 'text') {
      if (obj.type === 'rect' || obj.type === 'circle' || obj.type === 'ellipse') {
        // nudge accents to opposite quadrant
        return {
          ...obj,
          id: crypto.randomUUID(),
          left: doc.width - obj.left,
          top: doc.height - obj.top * 0.92,
        }
      }
      return { ...obj, id: crypto.randomUUID() }
    }
    const idx = texts.findIndex((g) => g.id === obj.id)
    const nextSize = idx >= 0 ? mirrored[idx] ?? obj.fontSize : obj.fontSize
    return {
      ...obj,
      id: crypto.randomUUID(),
      fontSize: nextSize,
      top: doc.height - (obj.top + obj.fontSize) * 0.9,
    }
  })

  const now = Date.now()
  return {
    ...doc,
    id: crypto.randomUUID(),
    name: `${doc.name} · Twin`,
    objects,
    createdAt: now,
    updatedAt: now,
  }
}

/** Apply saved DNA structure onto current document content (structure transplant). */
export function transplantDNA(dna: CompositionDNA, host: DesignDocument): DesignDocument {
  const hostDNA = extractDNA(host)
  const byRole = new Map<string, Gene[]>()
  for (const gene of hostDNA.genes) {
    const list = byRole.get(gene.role) ?? []
    list.push(gene)
    byRole.set(gene.role, list)
  }

  const used = new Set<string>()
  const objects = dna.genes.map((structureGene) => {
    const candidates = byRole.get(structureGene.role) ?? []
    const donor = candidates.find((c) => !used.has(c.id)) ?? candidates[0]
    if (donor) used.add(donor.id)

    const merged: Gene = {
      ...structureGene,
      text: donor?.text ?? structureGene.text,
      fill: donor?.fill ?? structureGene.fill,
      fontFamily: donor?.fontFamily ?? structureGene.fontFamily,
      fontWeight: donor?.fontWeight ?? structureGene.fontWeight,
      source: donor?.source ?? structureGene.source,
    }
    return placeFromGene(merged, host.width, host.height, host.width / dna.width)
  })

  const now = Date.now()
  return {
    ...host,
    id: crypto.randomUUID(),
    name: `${host.name} · DNA`,
    background: dna.background,
    objects,
    createdAt: now,
    updatedAt: now,
  }
}

export function saveDNAToClipboard(dna: CompositionDNA) {
  localStorage.setItem(DNA_KEY, JSON.stringify(dna))
}

export function loadDNAFromClipboard(): CompositionDNA | null {
  try {
    const raw = localStorage.getItem(DNA_KEY)
    if (!raw) return null
    return JSON.parse(raw) as CompositionDNA
  } catch {
    return null
  }
}

export function annotateDocumentRoles(doc: DesignDocument): DesignDocument {
  return {
    ...doc,
    objects: doc.objects.map((obj) => ({
      ...obj,
      role: inferRole(obj, doc.objects, doc.width, doc.height),
    })),
  }
}
