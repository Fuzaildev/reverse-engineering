import type { DesignTemplate } from '../lib/designSchema'
import { DESIGN_SCHEMA_VERSION } from '../lib/designSchema'
import { getPreset, type PresetId } from '../lib/presets'
import { TEMPLATE_SPECS } from './layouts'

export const TEMPLATES: DesignTemplate[] = TEMPLATE_SPECS.map((spec, index) => {
  const preset = getPreset(spec.presetId)
  return {
    id: `tpl-${index + 1}`,
    name: spec.name,
    category: spec.category,
    summary: spec.summary,
    presetId: spec.presetId,
    thumbnailBg: spec.background,
    document: {
      version: DESIGN_SCHEMA_VERSION,
      presetId: spec.presetId,
      width: preset.width,
      height: preset.height,
      background: spec.background,
      objects: spec.build(preset.width, preset.height).map((object) => ({
        ...object,
        id: `${spec.presetId}-${index}-${object.id}`,
      })),
    },
  }
})

export function getTemplate(id: string): DesignTemplate | undefined {
  return TEMPLATES.find((t) => t.id === id)
}

export function templatesForPreset(presetId: PresetId): DesignTemplate[] {
  return TEMPLATES.filter((t) => t.presetId === presetId)
}
