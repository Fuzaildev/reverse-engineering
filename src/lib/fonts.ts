/** Quoted stacks so canvas and SVG resolve the family name, not the first word. */
export const FONT_SANS = '"IBM Plex Sans", "Segoe UI", sans-serif'
export const FONT_SERIF = '"Instrument Serif", Georgia, serif'
export const FONT_DISPLAY = 'Syne, "Arial Narrow", sans-serif'

export const FONT_CHOICES = [FONT_SANS, FONT_SERIF, FONT_DISPLAY] as const

const FACES = [
  '400 16px "IBM Plex Sans"',
  '500 16px "IBM Plex Sans"',
  '600 16px "IBM Plex Sans"',
  '700 16px "IBM Plex Sans"',
  'italic 400 16px "IBM Plex Sans"',
  '400 16px "Instrument Serif"',
  'italic 400 16px "Instrument Serif"',
  '600 16px Syne',
  '700 16px Syne',
  '800 16px Syne',
]

export function fontLabel(stack: string): string {
  return stack.split(',')[0]?.replaceAll('"', '').trim() || stack
}

export function matchFontChoice(current: string): string {
  const exact = FONT_CHOICES.find((font) => font === current)
  if (exact) return exact
  const name = fontLabel(current).toLowerCase()
  return FONT_CHOICES.find((font) => font.toLowerCase().includes(name)) ?? current
}

/** Load every weight the templates and the editor actually set. */
export function ensureFonts(): Promise<void> {
  if (typeof document === 'undefined' || !document.fonts) return Promise.resolve()
  return Promise.all(FACES.map((face) => document.fonts.load(face))).then(() => undefined)
}
