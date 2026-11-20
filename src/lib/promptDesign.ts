import {
  DESIGN_SCHEMA_VERSION,
  type DesignDocument,
  type DesignObject,
  type DesignTemplate,
  type TemplateCategory,
  templateToDesign,
} from './designSchema'
import { PRESETS, type PresetId } from './presets'
import { TEMPLATES } from '../templates'

export type DesignMood = 'auto' | 'bold' | 'soft' | 'dark' | 'bright' | 'editorial'

export interface PromptIntent {
  prompt: string
  presetId: PresetId
  category: TemplateCategory | 'all'
  mood: DesignMood
  title: string
  subtitle: string
  kicker: string
  cta: string
  keywords: string[]
}

export interface GeneratedDesign {
  id: string
  name: string
  reason: string
  score: number
  document: DesignDocument
  sourceTemplateId: string
}

export const EXAMPLE_PROMPTS = [
  'Instagram post announcing a coffee shop spring menu launch',
  'YouTube thumbnail for a 12 minute Figma tutorial',
  'Dark quote story about finishing creative work',
  'X post shipping a new local-first design tool today',
  'Promo sale story with 40 percent off archive pieces',
  'Editorial magazine cover for issue twelve on quiet design',
] as const

export const MOOD_OPTIONS: { id: DesignMood; label: string }[] = [
  { id: 'auto', label: 'Auto' },
  { id: 'bold', label: 'Bold' },
  { id: 'soft', label: 'Soft' },
  { id: 'dark', label: 'Dark' },
  { id: 'bright', label: 'Bright' },
  { id: 'editorial', label: 'Editorial' },
]

const PRESET_HINTS: Array<{ id: PresetId; words: string[] }> = [
  { id: 'ig-story', words: ['story', 'stories', 'reel', 'reels', 'vertical', '9:16', 'tiktok'] },
  { id: 'yt-thumb', words: ['youtube', 'thumbnail', 'thumb', 'yt', '16:9 video', 'tutorial video'] },
  { id: 'x-post', words: ['twitter', 'tweet', 'x post', 'thread', 'banner', 'wide'] },
  { id: 'ig-post', words: ['instagram', 'ig post', 'square', 'carousel', 'feed', '1:1'] },
]

const CATEGORY_HINTS: Array<{ id: TemplateCategory; words: string[] }> = [
  { id: 'Launch', words: ['launch', 'release', 'shipping', 'announce', 'announcement', 'opening', 'event'] },
  { id: 'Promo', words: ['sale', 'promo', 'discount', 'offer', 'percent', '%', 'deal', 'members'] },
  { id: 'Quote', words: ['quote', 'manifesto', 'said', 'words', 'wisdom'] },
  { id: 'Editorial', words: ['editorial', 'magazine', 'issue', 'cover', 'journal', 'essay'] },
  { id: 'Story', words: ['countdown', 'story', 'before', 'after', 'swipe'] },
  { id: 'Thumbnail', words: ['thumbnail', 'tutorial', 'lesson', 'chapter', 'vs', 'versus'] },
  { id: 'Social', words: ['social', 'thread', 'stat', 'metric', 'shipping today'] },
]

const MOOD_HINTS: Array<{ id: Exclude<DesignMood, 'auto'>; words: string[] }> = [
  { id: 'dark', words: ['dark', 'night', 'noir', 'black', 'midnight'] },
  { id: 'bright', words: ['bright', 'sunny', 'fresh', 'clean', 'white'] },
  { id: 'soft', words: ['soft', 'quiet', 'calm', 'gentle', 'pastel', 'warm'] },
  { id: 'bold', words: ['bold', 'loud', 'punchy', 'impact', 'strong'] },
  { id: 'editorial', words: ['editorial', 'serif', 'magazine', 'literary'] },
]

const PALETTES: Record<Exclude<DesignMood, 'auto'>, string[]> = {
  bold: ['#10141c', '#e24b2a', '#f7f4ef', '#d7b56d', '#1c2433'],
  soft: ['#efe7d6', '#1f3d34', '#f4efe6', '#6f675e', '#c6a15b'],
  dark: ['#0c121c', '#f4efe6', '#d7b56d', '#9aa3b2', '#1c2433'],
  bright: ['#f6f3ee', '#111111', '#0b6e4f', '#e24b2a', '#161513'],
  editorial: ['#f3eee6', '#1c1915', '#ddd4c6', '#6f675e', '#10241f'],
}

const STOP = new Set([
  'a', 'an', 'the', 'for', 'and', 'or', 'with', 'to', 'of', 'in', 'on', 'my', 'our',
  'a', 'new', 'design', 'post', 'about', 'from', 'this', 'that', 'make', 'create',
  'instagram', 'youtube', 'twitter', 'story', 'thumbnail', 'template',
])

function includesAny(haystack: string, words: string[]) {
  return words.some((word) => haystack.includes(word))
}

function titleCase(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function cleanPhrase(value: string) {
  return value.replace(/\s+/g, ' ').replace(/^[\s,.-]+|[\s,.-]+$/g, '').trim()
}

function extractQuoted(prompt: string) {
  const match = prompt.match(/["“](.+?)["”]/)
  return match?.[1]?.trim() ?? ''
}

function stripFormatWords(prompt: string) {
  let next = prompt
  for (const group of PRESET_HINTS) {
    for (const word of group.words) {
      next = next.replace(new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi'), ' ')
    }
  }
  return cleanPhrase(next)
}

export function parsePromptIntent(
  raw: string,
  overrides: Partial<Pick<PromptIntent, 'presetId' | 'mood' | 'category'>> = {},
): PromptIntent {
  const prompt = cleanPhrase(raw)
  const lower = prompt.toLowerCase()

  let presetId: PresetId = overrides.presetId ?? 'ig-post'
  if (!overrides.presetId) {
    for (const hint of PRESET_HINTS) {
      if (includesAny(lower, hint.words)) {
        presetId = hint.id
        break
      }
    }
  }

  let category: TemplateCategory | 'all' = overrides.category ?? 'all'
  if (!overrides.category || overrides.category === 'all') {
    for (const hint of CATEGORY_HINTS) {
      if (includesAny(lower, hint.words)) {
        category = hint.id
        break
      }
    }
  }

  let mood: DesignMood = overrides.mood ?? 'auto'
  if (!overrides.mood || overrides.mood === 'auto') {
    mood = 'auto'
    for (const hint of MOOD_HINTS) {
      if (includesAny(lower, hint.words)) {
        mood = hint.id
        break
      }
    }
  }

  const quoted = extractQuoted(prompt)
  const stripped = stripFormatWords(prompt)
  const withoutLead = stripped
    .replace(/^(announcing|announce|for a|for an|for|about|promoting|promo|sale|launching)\s+/i, '')
    .trim()

  const titleSource = quoted || withoutLead || prompt
  const words = titleSource.split(/\s+/).filter(Boolean)
  const title =
    words.length <= 5
      ? titleCase(titleSource)
      : titleCase(words.slice(0, Math.min(6, Math.max(3, Math.ceil(words.length / 2)))).join(' '))

  const subtitle =
    words.length > 5
      ? titleCase(words.slice(Math.min(6, Math.max(3, Math.ceil(words.length / 2)))).join(' '))
      : category === 'Promo'
        ? 'Limited time'
        : category === 'Launch'
          ? 'Opens this week'
          : 'Made for this feed'

  const kicker =
    category === 'Promo'
      ? 'OFFER'
      : category === 'Launch'
        ? 'LAUNCH'
        : category === 'Quote'
          ? 'NOTE'
          : category === 'Thumbnail'
            ? 'TUTORIAL'
            : category === 'Editorial'
              ? 'ISSUE'
              : 'NEW'

  const cta =
    category === 'Promo'
      ? 'Shop the archive'
      : category === 'Launch'
        ? 'Save the date'
        : category === 'Thumbnail'
          ? 'Watch now'
          : 'Learn more'

  const keywords = lower
    .split(/[^a-z0-9+#%]+/)
    .filter((word) => word.length > 2 && !STOP.has(word))

  return {
    prompt,
    presetId,
    category,
    mood,
    title: title.slice(0, 48) || 'Untitled idea',
    subtitle: subtitle.slice(0, 64),
    kicker,
    cta,
    keywords,
  }
}

function luminance(hex: string) {
  const raw = hex.replace('#', '')
  if (raw.length !== 6) return 0.5
  const r = parseInt(raw.slice(0, 2), 16) / 255
  const g = parseInt(raw.slice(2, 4), 16) / 255
  const b = parseInt(raw.slice(4, 6), 16) / 255
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function scoreTemplate(template: DesignTemplate, intent: PromptIntent) {
  let score = 0
  if (template.presetId === intent.presetId) score += 8
  if (intent.category !== 'all' && template.category === intent.category) score += 6
  const blob = `${template.name} ${template.summary} ${template.category}`.toLowerCase()
  for (const keyword of intent.keywords) {
    if (blob.includes(keyword)) score += 2
  }
  const bg = luminance(template.document.background)
  if (intent.mood === 'dark' && bg < 0.35) score += 3
  if (intent.mood === 'bright' && bg > 0.7) score += 3
  if (intent.mood === 'soft' && bg > 0.55 && bg < 0.9) score += 2
  if (intent.mood === 'editorial' && template.category === 'Editorial') score += 3
  if (intent.mood === 'bold' && (template.category === 'Promo' || template.category === 'Thumbnail')) {
    score += 2
  }
  return score
}

function collectColors(doc: Pick<DesignDocument, 'background' | 'objects'>) {
  const colors = [doc.background]
  for (const object of doc.objects) {
    if ('fill' in object && typeof object.fill === 'string' && object.fill.startsWith('#')) {
      colors.push(object.fill)
    }
  }
  return [...new Set(colors)]
}

function mapPalette(source: string[], target: string[]) {
  const map = new Map<string, string>()
  source.forEach((color, index) => {
    map.set(color.toLowerCase(), target[index % target.length]!)
  })
  return map
}

function recolorDocument(
  doc: DesignDocument,
  mood: DesignMood,
): DesignDocument {
  if (mood === 'auto') return doc
  const palette = PALETTES[mood]
  const source = collectColors(doc)
  const map = mapPalette(source, palette)
  const objects = doc.objects.map((object) => {
    if (!('fill' in object) || typeof object.fill !== 'string') return object
    const next = map.get(object.fill.toLowerCase())
    return next ? { ...object, fill: next } : object
  })
  return {
    ...doc,
    background: map.get(doc.background.toLowerCase()) ?? palette[0]!,
    objects,
  }
}

function splitHeadline(title: string) {
  const parts = title.split(/\s+/)
  if (parts.length <= 2) return [title, '']
  const mid = Math.ceil(parts.length / 2)
  return [parts.slice(0, mid).join(' '), parts.slice(mid).join(' ')]
}

function rewriteTextObjects(objects: DesignObject[], intent: PromptIntent): DesignObject[] {
  const texts = objects
    .map((object, index) => ({ object, index }))
    .filter((item): item is { object: Extract<DesignObject, { type: 'text' }>; index: number } => {
      return item.object.type === 'text'
    })
    .sort((a, b) => b.object.fontSize - a.object.fontSize)

  if (texts.length === 0) return objects

  const next = objects.map((object) => ({ ...object })) as DesignObject[]
  const [line1, line2] = splitHeadline(intent.title)

  const largest = texts[0]
  if (largest) {
    const target = next[largest.index] as Extract<DesignObject, { type: 'text' }>
    target.text = line1 || intent.title
  }

  const second = texts[1]
  if (second && line2) {
    const target = next[second.index] as Extract<DesignObject, { type: 'text' }>
    if (second.object.fontSize >= largest!.object.fontSize * 0.55) {
      target.text = line2
    } else {
      target.text = intent.subtitle
    }
  }

  const small = texts.filter((item) => item.object.fontSize <= 28)
  if (small[0]) {
    ;(next[small[0].index] as Extract<DesignObject, { type: 'text' }>).text = intent.kicker
  }
  if (small[1]) {
    ;(next[small[1].index] as Extract<DesignObject, { type: 'text' }>).text = intent.cta
  }
  if (small[2]) {
    ;(next[small[2].index] as Extract<DesignObject, { type: 'text' }>).text = intent.subtitle
  }

  return next
}

function cloneWithIntent(template: DesignTemplate, intent: PromptIntent, index: number): GeneratedDesign {
  const base = templateToDesign(template, `${intent.title}`)
  const rewritten: DesignDocument = {
    ...base,
    name: `${intent.title} · ${template.name}`,
    objects: rewriteTextObjects(base.objects, intent),
  }
  const themed = recolorDocument(rewritten, intent.mood === 'auto' ? guessMood(template) : intent.mood)
  return {
    id: `gen-${crypto.randomUUID()}`,
    name: themed.name,
    reason: explainMatch(template, intent),
    score: scoreTemplate(template, intent) - index * 0.1,
    document: {
      ...themed,
      version: DESIGN_SCHEMA_VERSION,
      id: crypto.randomUUID(),
      updatedAt: Date.now(),
      createdAt: Date.now(),
    },
    sourceTemplateId: template.id,
  }
}

function guessMood(template: DesignTemplate): DesignMood {
  const bg = luminance(template.document.background)
  if (bg < 0.3) return 'dark'
  if (template.category === 'Editorial' || template.category === 'Quote') return 'editorial'
  if (template.category === 'Promo' || template.category === 'Thumbnail') return 'bold'
  if (bg > 0.75) return 'bright'
  return 'soft'
}

function explainMatch(template: DesignTemplate, intent: PromptIntent) {
  const bits = [PRESETS.find((p) => p.id === template.presetId)?.label ?? template.presetId]
  if (template.category === intent.category) bits.push(template.category.toLowerCase())
  else bits.push(template.category.toLowerCase())
  if (intent.mood !== 'auto') bits.push(`${intent.mood} mood`)
  return bits.join(' · ')
}

export function generateDesignsFromPrompt(
  rawPrompt: string,
  options: {
    presetId?: PresetId | 'all'
    mood?: DesignMood
    category?: TemplateCategory | 'all'
    limit?: number
  } = {},
): { intent: PromptIntent; results: GeneratedDesign[] } {
  const intent = parsePromptIntent(rawPrompt, {
    presetId: options.presetId && options.presetId !== 'all' ? options.presetId : undefined,
    mood: options.mood,
    category: options.category,
  })

  const ranked = [...TEMPLATES]
    .map((template) => ({ template, score: scoreTemplate(template, intent) }))
    .sort((a, b) => b.score - a.score)

  const preferred = ranked.filter((item) => item.template.presetId === intent.presetId)
  const pool = (preferred.length >= 3 ? preferred : ranked).slice(0, Math.max(options.limit ?? 6, 3))

  const results = pool.map((item, index) => cloneWithIntent(item.template, intent, index))
  return { intent, results }
}

/** Magic Write–style local copy helpers for selected text. */
export type WriteAction =
  | 'shorten'
  | 'expand'
  | 'punchier'
  | 'softer'
  | 'titlecase'
  | 'uppercase'

export function rewriteCopy(text: string, action: WriteAction): string {
  const value = text.trim()
  if (!value) return value

  switch (action) {
    case 'shorten': {
      const words = value.split(/\s+/)
      if (words.length <= 3) return value
      return words.slice(0, Math.max(2, Math.ceil(words.length * 0.6))).join(' ')
    }
    case 'expand': {
      if (/[.!?]$/.test(value)) return `${value} Made for people who finish the work.`
      return `${value} — ready when you are.`
    }
    case 'punchier': {
      return value
        .replace(/\bvery\b/gi, '')
        .replace(/\breally\b/gi, '')
        .replace(/\s+/g, ' ')
        .replace(/\.$/, '')
        .trim()
        .toUpperCase()
        .slice(0, 48)
    }
    case 'softer': {
      const soft = value.replace(/!$/, '.').replace(/\bNOW\b/g, 'soon')
      return soft.charAt(0).toUpperCase() + soft.slice(1)
    }
    case 'titlecase':
      return titleCase(value.toLowerCase())
    case 'uppercase':
      return value.toUpperCase()
    default:
      return value
  }
}

export function applyThemeToDocument(doc: DesignDocument, mood: Exclude<DesignMood, 'auto'>): DesignDocument {
  return recolorDocument(doc, mood)
}
