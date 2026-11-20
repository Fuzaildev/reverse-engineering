import { useMemo, useState } from 'react'
import { FabricText } from 'fabric'
import {
  BG_PRESETS,
  ELEMENT_PRESETS,
  addBrandColor,
  loadBrandKit,
  saveBrandKit,
  textEffectPatch,
  type TextEffectId,
} from '../lib/brandKit'
import { setCanvasBackground } from '../canvas/FabricCanvas'
import {
  applyBlendMode,
  applyShadow,
  applyStroke,
  selectObjectsByIds,
  setSelectionLocked,
  unlockAllObjects,
} from '../lib/advancedEdit'
import { FONT_CHOICES, fontLabel } from '../lib/fonts'
import { hydrateCanvas, serializeCanvas } from '../lib/fabricBridge'
import { insertDesignObjects, patchActive } from '../lib/commands'
import {
  applyBrandTheme,
  autoFitHeadlines,
  extractPalette,
  findReplaceText,
  idsForRole,
  lockRoles,
  replaceColorEverywhere,
  rewriteAllTextByRole,
  swapLayoutKeepCopy,
  templatesForSamePreset,
  transformTextCase,
} from '../lib/templateStudio'
import { useEditorStore } from '../store/editorStore'
import { DesignPreview } from './DesignPreview'
import { TEMPLATES } from '../templates'

export function TemplateStudio() {
  const canvas = useEditorStore((s) => s.canvas)
  const document = useEditorStore((s) => s.document)
  const selection = useEditorStore((s) => s.selection)
  const setDocument = useEditorStore((s) => s.setDocument)
  const markDirty = useEditorStore((s) => s.markDirty)
  const beginBatch = useEditorStore((s) => s.beginBatch)
  const endBatch = useEditorStore((s) => s.endBatch)
  const history = useEditorStore((s) => s.history)
  const [kit, setKit] = useState(() => loadBrandKit())
  const [bulkHeadline, setBulkHeadline] = useState('')
  const [bulkKicker, setBulkKicker] = useState('')
  const [bulkCta, setBulkCta] = useState('')
  const [findText, setFindText] = useState('')
  const [replaceText, setReplaceText] = useState('')
  const [themeShuffle, setThemeShuffle] = useState(0)
  const [status, setStatus] = useState<string | null>(null)
  const [picker, setPicker] = useState('#0b6e4f')

  const samePreset = useMemo(
    () => (document ? templatesForSamePreset(document.presetId) : []),
    [document],
  )

  const palette = useMemo(() => {
    if (!canvas || !document) return []
    return extractPalette(serializeCanvas(canvas, document))
  }, [canvas, document, selection, kit])

  const replaceDoc = async (next: NonNullable<typeof document>) => {
    if (!canvas) return
    beginBatch()
    try {
      await hydrateCanvas(canvas, next)
      setDocument(next)
      markDirty()
    } finally {
      endBatch()
    }
    history?.commit()
    history?.syncSelection()
  }

  if (!document || !canvas) {
    return (
      <section className="template-studio">
        <h2>Template Studio</h2>
        <p className="muted">Open a design to edit templates in place.</p>
      </section>
    )
  }

  return (
    <section className="template-studio">
      <h2>Template Studio</h2>
      <p className="comp-lab-lede">
        Advanced template editing: brand kit, find/replace, theme apply, role select/lock, layout
        swap, bulk copy, and palette surgery — local only.
      </p>

      <div className="ts-block">
        <span className="magic-write-label">Brand kit</span>
        <div className="brand-colors">
          {kit.colors.map((color) => (
            <button
              key={color}
              type="button"
              className="brand-swatch"
              style={{ background: color }}
              title={`Apply ${color}`}
              onClick={() => {
                if (selection) patchActive({ fill: color })
                else setCanvasBackground(color)
              }}
            />
          ))}
        </div>
        <div className="brand-add">
          <input type="color" value={picker} onChange={(e) => setPicker(e.target.value)} />
          <button
            type="button"
            className="magic-write-btn"
            onClick={() => setKit(addBrandColor(kit, picker))}
          >
            Save color
          </button>
          <button
            type="button"
            className="magic-write-btn"
            onClick={() => {
              const next = saveBrandKit({
                ...kit,
                colors: [...new Set([...palette, ...kit.colors])].slice(0, 12),
              })
              setKit(next)
              setStatus('Pulled live palette into brand kit')
            }}
          >
            Pull from design
          </button>
        </div>
        <div className="brand-fonts">
          {FONT_CHOICES.map((font) => (
            <button
              key={font}
              type="button"
              className="magic-write-btn"
              style={{ fontFamily: font }}
              onClick={() => patchActive({ fontFamily: font })}
            >
              {fontLabel(font)}
            </button>
          ))}
        </div>
      </div>

      <div className="ts-block">
        <span className="magic-write-label">Elements</span>
        <div className="element-grid">
          {ELEMENT_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              className="element-chip"
              onClick={() => {
                const cx = document.width * 0.5
                const cy = document.height * 0.45
                void insertDesignObjects(preset.build(cx, cy), 0)
                setStatus(`Added ${preset.label}`)
              }}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      <div className="ts-block">
        <span className="magic-write-label">Backgrounds</span>
        <div className="brand-colors">
          {BG_PRESETS.map((color) => (
            <button
              key={color}
              type="button"
              className="brand-swatch"
              style={{ background: color }}
              onClick={() => setCanvasBackground(color)}
            />
          ))}
        </div>
      </div>

      <div className="ts-block">
        <span className="magic-write-label">Text effects</span>
        <div className="magic-write-row">
          {(['none', 'shadow', 'outline', 'lift', 'glow'] as TextEffectId[]).map((effect) => (
            <button
              key={effect}
              type="button"
              className="magic-write-btn"
              onClick={() => {
                const patch = textEffectPatch(effect)
                applyShadow(patch.shadow)
                if (patch.stroke != null) applyStroke(patch.stroke, patch.strokeWidth ?? 0)
                else if (effect === 'none') applyStroke('#000000', 0)
                if (patch.blendMode) applyBlendMode(patch.blendMode)
                if (effect === 'none') applyBlendMode('source-over')
              }}
            >
              {effect}
            </button>
          ))}
        </div>
      </div>

      <div className="ts-block">
        <span className="magic-write-label">Bulk role copy</span>
        <label>
          Headline
          <input value={bulkHeadline} onChange={(e) => setBulkHeadline(e.target.value)} placeholder="All headlines" />
        </label>
        <label>
          Kicker
          <input value={bulkKicker} onChange={(e) => setBulkKicker(e.target.value)} placeholder="All kickers" />
        </label>
        <label>
          CTA
          <input value={bulkCta} onChange={(e) => setBulkCta(e.target.value)} placeholder="All CTAs" />
        </label>
        <button
          type="button"
          className="comp-lab-primary"
          onClick={() => {
            const current = serializeCanvas(canvas, document)
            const next = rewriteAllTextByRole(current, {
              headline: bulkHeadline || undefined,
              subhead: bulkHeadline || undefined,
              kicker: bulkKicker || undefined,
              cta: bulkCta || undefined,
            })
            void replaceDoc(next)
            setStatus('Bulk role copy applied')
          }}
        >
          Apply to roles
        </button>
      </div>

      <div className="ts-block">
        <span className="magic-write-label">Find &amp; replace text</span>
        <label>
          Find
          <input value={findText} onChange={(e) => setFindText(e.target.value)} placeholder="Exact phrase" />
        </label>
        <label>
          Replace with
          <input value={replaceText} onChange={(e) => setReplaceText(e.target.value)} placeholder="New copy" />
        </label>
        <button
          type="button"
          className="comp-lab-primary"
          onClick={() => {
            const current = serializeCanvas(canvas, document)
            const { doc: next, hits } = findReplaceText(current, findText, replaceText)
            if (!hits) {
              setStatus('No matches')
              return
            }
            void replaceDoc(next)
            setStatus(`Replaced ${hits} match${hits === 1 ? '' : 'es'}`)
          }}
        >
          Replace all
        </button>
        <div className="magic-write-row" style={{ marginTop: '0.45rem' }}>
          {(['upper', 'lower', 'title'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              className="magic-write-btn"
              onClick={() => {
                const current = serializeCanvas(canvas, document)
                const ids = selection?.ids?.length ? selection.ids : undefined
                void replaceDoc(transformTextCase(current, mode, ids))
                setStatus(`Case → ${mode}${ids ? ' (selection)' : ' (all text)'}`)
              }}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      <div className="ts-block">
        <span className="magic-write-label">Brand theme</span>
        <div className="magic-write-row">
          <button
            type="button"
            className="comp-lab-primary"
            onClick={() => {
              const current = serializeCanvas(canvas, document)
              const next = applyBrandTheme(current, kit.colors, themeShuffle)
              void replaceDoc(next)
              setStatus(`Brand theme applied · shuffle ${themeShuffle}`)
            }}
          >
            Apply brand colors
          </button>
          <button
            type="button"
            className="magic-write-btn"
            onClick={() => {
              const nextShuffle = themeShuffle + 1
              setThemeShuffle(nextShuffle)
              const current = serializeCanvas(canvas, document)
              const next = applyBrandTheme(current, kit.colors, nextShuffle)
              void replaceDoc(next)
              setStatus(`Shuffled brand mapping · ${nextShuffle}`)
            }}
          >
            Shuffle theme
          </button>
        </div>
      </div>

      <div className="ts-block">
        <span className="magic-write-label">Select &amp; lock by role</span>
        <div className="magic-write-row">
          {(['headline', 'kicker', 'cta', 'body', 'accent', 'frame'] as const).map((role) => (
            <button
              key={role}
              type="button"
              className="magic-write-btn"
              onClick={() => {
                const current = serializeCanvas(canvas, document)
                const ids = idsForRole(current, role)
                const n = selectObjectsByIds(ids)
                setStatus(n ? `Selected ${n} · ${role}` : `No ${role} layers`)
              }}
            >
              {role}
            </button>
          ))}
        </div>
        <div className="magic-write-row" style={{ marginTop: '0.45rem' }}>
          <button
            type="button"
            className="magic-write-btn"
            onClick={() => {
              setSelectionLocked(true)
              setStatus('Selection locked')
            }}
          >
            Lock selection
          </button>
          <button
            type="button"
            className="magic-write-btn"
            onClick={() => {
              unlockAllObjects()
              setStatus('All layers unlocked')
            }}
          >
            Unlock all
          </button>
          <button
            type="button"
            className="magic-write-btn"
            onClick={() => {
              const current = serializeCanvas(canvas, document)
              void replaceDoc(lockRoles(current, ['frame', 'accent'], true))
              setStatus('Brand frames & accents locked')
            }}
          >
            Lock brand frames
          </button>
          <button
            type="button"
            className="magic-write-btn"
            onClick={() => {
              const current = serializeCanvas(canvas, document)
              void replaceDoc(lockRoles(current, ['frame', 'accent'], false))
              setStatus('Brand frames unlocked')
            }}
          >
            Unlock frames
          </button>
        </div>
      </div>

      <div className="ts-block">
        <span className="magic-write-label">Palette surgery</span>
        <div className="brand-colors">
          {palette.map((color) => (
            <button
              key={color}
              type="button"
              className="brand-swatch"
              style={{ background: color }}
              title={`Replace ${color}`}
              onClick={() => {
                const nextColor = window.prompt(`Replace ${color} with`, color)
                if (!nextColor) return
                const current = serializeCanvas(canvas, document)
                const next = replaceColorEverywhere(current, color, nextColor)
                void replaceDoc(next)
                setStatus(`Replaced ${color} → ${nextColor}`)
              }}
            />
          ))}
        </div>
      </div>

      <div className="ts-block">
        <span className="magic-write-label">Swap layout · keep copy</span>
        <div className="swap-grid">
          {samePreset.slice(0, 6).map((template) => (
            <button
              key={template.id}
              type="button"
              className="swap-card"
              onClick={() => {
                const current = serializeCanvas(canvas, document)
                const next = swapLayoutKeepCopy(current, template.id)
                if (!next) return
                void replaceDoc(next)
                setStatus(`Swapped to ${template.name}`)
              }}
            >
              <DesignPreview
                className="swap-preview"
                width={template.document.width}
                height={template.document.height}
                background={template.document.background}
                objects={template.document.objects}
                title=""
              />
              <span>{template.name}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="ts-block">
        <span className="magic-write-label">Quick actions</span>
        <div className="magic-write-row">
          <button
            type="button"
            className="magic-write-btn"
            onClick={() => {
              const active = canvas.getActiveObject()
              if (!(active instanceof FabricText)) {
                setStatus('Select a text layer first')
                return
              }
              const size = Math.min(document.width * 0.12, (active.fontSize ?? 48) * 1.35)
              patchActive({ fontSize: Math.round(size) })
              setStatus('Scaled text up')
            }}
          >
            Punch type
          </button>
          <button
            type="button"
            className="magic-write-btn"
            onClick={() => {
              const current = serializeCanvas(canvas, document)
              const texts = current.objects.filter((o) => o.type === 'text')
              if (!texts.length) return
              const next = {
                ...current,
                objects: current.objects.map((obj) =>
                  obj.type === 'text'
                    ? { ...obj, fontSize: Math.max(12, Math.round(obj.fontSize * 0.85)) }
                    : obj,
                ),
              }
              void replaceDoc(next)
              setStatus('Tightened all type')
            }}
          >
            Tighten all type
          </button>
          <button
            type="button"
            className="magic-write-btn"
            onClick={() => {
              void insertDesignObjects(
                ELEMENT_PRESETS.find((p) => p.id === 'caption')!.build(
                  document.width * 0.2,
                  document.height * 0.88,
                ),
                0,
              )
            }}
          >
            Add caption
          </button>
          <button
            type="button"
            className="magic-write-btn"
            onClick={() => {
              const current = serializeCanvas(canvas, document)
              void replaceDoc(autoFitHeadlines(current))
              setStatus('Auto-fit headlines')
            }}
          >
            Auto-fit headlines
          </button>
        </div>
      </div>

      {status ? <p className="comp-lab-status">{status}</p> : null}
      <p className="comp-lab-dna-note">
        {samePreset.length} layouts in this size · {TEMPLATES.length} total · brand “{kit.name}”
      </p>
    </section>
  )
}
