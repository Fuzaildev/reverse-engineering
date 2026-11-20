import type { DesignDocument, DesignObject, TextObject } from './designSchema'
import { DESIGN_SCHEMA_VERSION } from './designSchema'
import { extractDNA, inferRole, transplantDNA } from './compositionLab'
import { TEMPLATES } from '../templates'

/** Swap current design onto another template's structure, keeping role-matched copy. */
export function swapLayoutKeepCopy(
  current: DesignDocument,
  templateId: string,
): DesignDocument | null {
  const template = TEMPLATES.find((t) => t.id === templateId)
  if (!template) return null
  const hostLike: DesignDocument = {
    ...current,
    width: template.document.width,
    height: template.document.height,
    presetId: template.document.presetId,
    background: template.document.background,
  }
  const structureDNA = extractDNA({
    ...template.document,
    id: current.id,
    name: current.name,
    createdAt: current.createdAt,
    updatedAt: Date.now(),
  })
  const next = transplantDNA(structureDNA, {
    ...hostLike,
    objects: current.objects,
  })
  return {
    ...next,
    id: current.id,
    name: current.name,
    createdAt: current.createdAt,
    updatedAt: Date.now(),
    version: DESIGN_SCHEMA_VERSION,
  }
}

export function extractPalette(doc: DesignDocument, limit = 8): string[] {
  const colors = [doc.background]
  for (const obj of doc.objects) {
    if ('fill' in obj && typeof obj.fill === 'string' && obj.fill.startsWith('#')) {
      colors.push(obj.fill)
    }
    if (obj.stroke?.startsWith('#')) colors.push(obj.stroke)
  }
  const unique: string[] = []
  for (const color of colors) {
    const key = color.toLowerCase()
    if (!unique.some((c) => c.toLowerCase() === key)) unique.push(color)
    if (unique.length >= limit) break
  }
  return unique
}

export function replaceColorEverywhere(
  doc: DesignDocument,
  from: string,
  to: string,
): DesignDocument {
  const src = from.toLowerCase()
  const objects = doc.objects.map((obj) => {
    const next = { ...obj }
    if ('fill' in next && typeof next.fill === 'string' && next.fill.toLowerCase() === src) {
      next.fill = to
    }
    if (next.stroke && next.stroke.toLowerCase() === src) next.stroke = to
    if (next.shadow?.color?.toLowerCase().includes(src.replace('#', ''))) {
      next.shadow = { ...next.shadow, color: to }
    }
    return next
  })
  return {
    ...doc,
    background: doc.background.toLowerCase() === src ? to : doc.background,
    objects,
    updatedAt: Date.now(),
  }
}

export function bulkSetText(
  objects: DesignObject[],
  ids: string[],
  text: string,
): DesignObject[] {
  const set = new Set(ids)
  return objects.map((obj) => {
    if (obj.type !== 'text' || !set.has(obj.id)) return obj
    return { ...obj, text }
  })
}

export function scaleSelectionObjects(
  objects: DesignObject[],
  ids: string[],
  factor: number,
): DesignObject[] {
  const set = new Set(ids)
  return objects.map((obj) => {
    if (!set.has(obj.id)) return obj
    if (obj.type === 'text') {
      return { ...obj, fontSize: Math.max(10, Math.round(obj.fontSize * factor)) }
    }
    if (obj.type === 'circle') {
      return { ...obj, radius: Math.max(4, obj.radius * factor) }
    }
    if (obj.type === 'ellipse') {
      return { ...obj, rx: Math.max(4, obj.rx * factor), ry: Math.max(4, obj.ry * factor) }
    }
    if (obj.type === 'rect') {
      return {
        ...obj,
        width: Math.max(8, obj.width * factor),
        height: Math.max(8, obj.height * factor),
      }
    }
    if (obj.type === 'image') {
      return {
        ...obj,
        scaleX: (obj.scaleX ?? 1) * factor,
        scaleY: (obj.scaleY ?? 1) * factor,
      }
    }
    return obj
  })
}

export function templatesForSamePreset(presetId: DesignDocument['presetId']) {
  return TEMPLATES.filter((t) => t.presetId === presetId)
}

export function collectRoleText(doc: DesignDocument) {
  const map = new Map<string, string[]>()
  for (const obj of doc.objects) {
    if (obj.type !== 'text') continue
    const role = inferRole(obj, doc.objects, doc.width, doc.height)
    const list = map.get(role) ?? []
    list.push(obj.text)
    map.set(role, list)
  }
  return map
}

export function rewriteAllTextByRole(
  doc: DesignDocument,
  updates: Partial<Record<string, string>>,
): DesignDocument {
  const objects = doc.objects.map((obj) => {
    if (obj.type !== 'text') return obj
    const role = inferRole(obj, doc.objects, doc.width, doc.height)
    const next = updates[role]
    if (!next) return obj
    return { ...obj, text: next } satisfies TextObject
  })
  return { ...doc, objects, updatedAt: Date.now() }
}

export function findReplaceText(
  doc: DesignDocument,
  find: string,
  replace: string,
  opts?: { caseSensitive?: boolean },
): { doc: DesignDocument; hits: number } {
  const needle = find.trim()
  if (!needle) return { doc, hits: 0 }
  let hits = 0
  const objects = doc.objects.map((obj) => {
    if (obj.type !== 'text') return obj
    if (opts?.caseSensitive) {
      if (!obj.text.includes(needle)) return obj
      const parts = obj.text.split(needle)
      hits += parts.length - 1
      return { ...obj, text: parts.join(replace) } satisfies TextObject
    }
    const lower = obj.text.toLowerCase()
    const key = needle.toLowerCase()
    if (!lower.includes(key)) return obj
    let out = ''
    let i = 0
    while (i < obj.text.length) {
      if (lower.slice(i, i + key.length) === key) {
        out += replace
        hits += 1
        i += key.length
      } else {
        out += obj.text[i]
        i += 1
      }
    }
    return { ...obj, text: out } satisfies TextObject
  })
  return { doc: { ...doc, objects, updatedAt: Date.now() }, hits }
}

export type TextCaseMode = 'upper' | 'lower' | 'title'

export function transformTextCase(
  doc: DesignDocument,
  mode: TextCaseMode,
  ids?: string[],
): DesignDocument {
  const set = ids ? new Set(ids) : null
  const objects = doc.objects.map((obj) => {
    if (obj.type !== 'text') return obj
    if (set && !set.has(obj.id)) return obj
    const text =
      mode === 'upper'
        ? obj.text.toUpperCase()
        : mode === 'lower'
          ? obj.text.toLowerCase()
          : obj.text.replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    return { ...obj, text } satisfies TextObject
  })
  return { ...doc, objects, updatedAt: Date.now() }
}

function luminance(hex: string): number {
  const h = hex.replace('#', '')
  if (h.length < 6) return 0.5
  const r = parseInt(h.slice(0, 2), 16) / 255
  const g = parseInt(h.slice(2, 4), 16) / 255
  const b = parseInt(h.slice(4, 6), 16) / 255
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** Map live palette → brand kit by luminance rank (theme apply / shuffle). */
export function applyBrandTheme(
  doc: DesignDocument,
  brandColors: string[],
  shuffle = 0,
): DesignDocument {
  if (brandColors.length < 2) return doc
  const palette = extractPalette(doc, 10)
  const sortedPal = [...palette].sort((a, b) => luminance(a) - luminance(b))
  const sortedBrand = [...brandColors].sort((a, b) => luminance(a) - luminance(b))
  const rotated = [
    ...sortedBrand.slice(shuffle % sortedBrand.length),
    ...sortedBrand.slice(0, shuffle % sortedBrand.length),
  ]
  let next = doc
  sortedPal.forEach((from, i) => {
    const to = rotated[Math.min(i, rotated.length - 1)]!
    next = replaceColorEverywhere(next, from, to)
  })
  return next
}

export function idsForRole(doc: DesignDocument, role: string): string[] {
  return doc.objects
    .filter((obj) => {
      const r = inferRole(obj, doc.objects, doc.width, doc.height)
      return r === role || (role === 'headline' && r === 'subhead')
    })
    .map((obj) => obj.id)
}

export function lockRoles(
  doc: DesignDocument,
  roles: string[],
  locked: boolean,
): DesignDocument {
  const set = new Set(roles)
  const objects = doc.objects.map((obj) => {
    const role = inferRole(obj, doc.objects, doc.width, doc.height)
    if (!set.has(role)) return obj
    return { ...obj, locked, selectable: !locked }
  })
  return { ...doc, objects, updatedAt: Date.now() }
}

/** Fit oversized headlines down so they stay inside the frame width. */
export function autoFitHeadlines(doc: DesignDocument, maxRatio = 0.86): DesignDocument {
  const maxW = doc.width * maxRatio
  const objects = doc.objects.map((obj) => {
    if (obj.type !== 'text') return obj
    const role = inferRole(obj, doc.objects, doc.width, doc.height)
    if (role !== 'headline' && role !== 'subhead') return obj
    const approx = obj.fontSize * Math.max(1, obj.text.length) * 0.52
    if (approx <= maxW) return obj
    const nextSize = Math.max(18, Math.round(obj.fontSize * (maxW / approx)))
    return { ...obj, fontSize: nextSize } satisfies TextObject
  })
  return { ...doc, objects, updatedAt: Date.now() }
}
