export type PresetId = 'ig-post' | 'ig-story' | 'yt-thumb' | 'x-post'

export interface CanvasPreset {
  id: PresetId
  label: string
  width: number
  height: number
  description: string
}

export const PRESETS: CanvasPreset[] = [
  {
    id: 'ig-post',
    label: 'Instagram Post',
    width: 1080,
    height: 1080,
    description: '1:1 square',
  },
  {
    id: 'ig-story',
    label: 'Instagram Story',
    width: 1080,
    height: 1920,
    description: '9:16 vertical',
  },
  {
    id: 'yt-thumb',
    label: 'YouTube Thumbnail',
    width: 1280,
    height: 720,
    description: '16:9 landscape',
  },
  {
    id: 'x-post',
    label: 'X / Twitter Post',
    width: 1600,
    height: 900,
    description: '16:9 landscape',
  },
]

export function getPreset(id: PresetId): CanvasPreset {
  const preset = PRESETS.find((p) => p.id === id)
  if (!preset) throw new Error(`Unknown preset: ${id}`)
  return preset
}
