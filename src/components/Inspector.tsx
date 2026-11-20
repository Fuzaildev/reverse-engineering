import {
  applyBlendMode,
  applyShadow,
  applyStroke,
  setObjectTransform,
} from '../lib/advancedEdit'
import { applyDocumentTheme, patchActive } from '../lib/commands'
import { ROLE_OPTIONS } from '../lib/compositionLab'
import type { BlendMode, LayerRole } from '../lib/designSchema'
import { FONT_CHOICES, fontLabel, matchFontChoice } from '../lib/fonts'
import { rewriteCopy, type WriteAction } from '../lib/promptDesign'
import { useEditorStore } from '../store/editorStore'

const WRITE_ACTIONS: { id: WriteAction; label: string }[] = [
  { id: 'shorten', label: 'Shorten' },
  { id: 'expand', label: 'Expand' },
  { id: 'punchier', label: 'Punchier' },
  { id: 'softer', label: 'Softer' },
  { id: 'titlecase', label: 'Title' },
  { id: 'uppercase', label: 'Caps' },
]

const THEMES = [
  { id: 'bold' as const, label: 'Bold' },
  { id: 'soft' as const, label: 'Soft' },
  { id: 'dark' as const, label: 'Dark' },
  { id: 'bright' as const, label: 'Bright' },
  { id: 'editorial' as const, label: 'Editorial' },
]

const BLENDS: BlendMode[] = [
  'source-over',
  'multiply',
  'screen',
  'overlay',
  'darken',
  'lighten',
  'soft-light',
  'hard-light',
  'difference',
]

export function Inspector() {
  const selection = useEditorStore((s) => s.selection)
  if (!selection) {
    return (
      <section className="inspector">
        <h2>Properties</h2>
        <p className="muted">Select type or a shape to edit fill, size, and effects.</p>
        <ThemePanel />
      </section>
    )
  }

  const single = selection.count === 1
  const isText = single && selection.type === 'text'
  const multiText = !single && selection.type === 'selection' && Boolean(selection.text)
  const shadow = selection.shadow ?? { color: 'rgba(0,0,0,0.35)', blur: 0, offsetX: 0, offsetY: 0 }

  return (
    <section className="inspector">
      <h2>{single ? labelFor(selection.type) : `${selection.count} selected`}</h2>
      {!single ? (
        <div className="magic-write">
          <span className="magic-write-label">Multi-edit</span>
          <label>
            Shared text
            <textarea
              rows={2}
              placeholder="Set the same copy on every selected text layer"
              onChange={(e) => {
                if (e.target.value) patchActive({ text: e.target.value })
              }}
            />
          </label>
          {multiText ? (
            <p className="muted" style={{ fontSize: '0.72rem', margin: '0 0 0.55rem' }}>
              Typing updates all selected text layers together.
            </p>
          ) : null}
        </div>
      ) : null}
      <label>
        Role
        <select
          value={selection.role}
          onChange={(e) => patchActive({ role: e.target.value as LayerRole })}
        >
          {ROLE_OPTIONS.map((role) => (
            <option key={role.id} value={role.id}>
              {role.label}
            </option>
          ))}
        </select>
      </label>

      {single ? (
        <div className="transform-grid">
          <label>
            X
            <input
              type="number"
              value={selection.left}
              onChange={(e) => setObjectTransform({ left: Number(e.target.value) })}
            />
          </label>
          <label>
            Y
            <input
              type="number"
              value={selection.top}
              onChange={(e) => setObjectTransform({ top: Number(e.target.value) })}
            />
          </label>
          <label>
            W
            <input
              type="number"
              value={selection.width}
              onChange={(e) => setObjectTransform({ width: Number(e.target.value) })}
            />
          </label>
          <label>
            H
            <input
              type="number"
              value={selection.height}
              onChange={(e) => setObjectTransform({ height: Number(e.target.value) })}
            />
          </label>
          <label>
            °
            <input
              type="number"
              value={selection.angle}
              onChange={(e) => setObjectTransform({ angle: Number(e.target.value) })}
            />
          </label>
        </div>
      ) : null}

      {isText && (
        <>
          <label>
            Text
            <textarea
              rows={3}
              value={selection.text}
              onChange={(e) => patchActive({ text: e.target.value })}
            />
          </label>
          <div className="magic-write">
            <span className="magic-write-label">Magic Write</span>
            <div className="magic-write-row">
              {WRITE_ACTIONS.map((action) => (
                <button
                  key={action.id}
                  type="button"
                  className="magic-write-btn"
                  onClick={() =>
                    patchActive({ text: rewriteCopy(selection.text, action.id) })
                  }
                >
                  {action.label}
                </button>
              ))}
            </div>
          </div>
          <label>
            Size
            <input
              type="number"
              min={8}
              max={400}
              value={Math.round(selection.fontSize)}
              onChange={(e) => patchActive({ fontSize: Number(e.target.value) })}
            />
          </label>
          <label>
            Font
            <select
              value={matchFontChoice(selection.fontFamily)}
              onChange={(e) => patchActive({ fontFamily: e.target.value })}
            >
              {FONT_CHOICES.map((font) => (
                <option key={font} value={font}>
                  {fontLabel(font)}
                </option>
              ))}
            </select>
          </label>
          <label>
            Align
            <select
              value={selection.textAlign}
              onChange={(e) =>
                patchActive({
                  textAlign: e.target.value as 'left' | 'center' | 'right',
                })
              }
            >
              <option value="left">Left</option>
              <option value="center">Center</option>
              <option value="right">Right</option>
            </select>
          </label>
        </>
      )}
      {single && selection.type !== 'image' && selection.type !== 'group' && (
        <label>
          Fill
          <input
            type="color"
            value={toHex(selection.fill)}
            onChange={(e) => patchActive({ fill: e.target.value })}
          />
        </label>
      )}
      <label>
        Opacity
        <input
          type="range"
          min={0.1}
          max={1}
          step={0.05}
          value={selection.opacity}
          onChange={(e) => patchActive({ opacity: Number(e.target.value) })}
        />
      </label>

      <div className="effects-block">
        <span className="magic-write-label">Layer style</span>
        <label>
          Blend
          <select
            value={selection.blendMode}
            onChange={(e) => applyBlendMode(e.target.value as BlendMode)}
          >
            {BLENDS.map((mode) => (
              <option key={mode} value={mode}>
                {mode === 'source-over' ? 'Normal' : mode}
              </option>
            ))}
          </select>
        </label>
        <label>
          Stroke
          <span className="stroke-row">
            <input
              type="color"
              value={toHex(selection.stroke)}
              onChange={(e) => applyStroke(e.target.value, Math.max(selection.strokeWidth, 1))}
            />
            <input
              type="number"
              min={0}
              max={40}
              value={selection.strokeWidth}
              onChange={(e) => applyStroke(selection.stroke, Number(e.target.value))}
            />
          </span>
        </label>
        <label>
          Shadow blur
          <input
            type="range"
            min={0}
            max={80}
            value={shadow.blur}
            onChange={(e) =>
              applyShadow({
                ...shadow,
                blur: Number(e.target.value),
                offsetY: shadow.offsetY || 10,
              })
            }
          />
        </label>
        <div className="magic-write-row">
          <button
            type="button"
            className="magic-write-btn"
            onClick={() =>
              applyShadow({ color: 'rgba(0,0,0,0.4)', blur: 28, offsetX: 0, offsetY: 14 })
            }
          >
            Soft shadow
          </button>
          <button type="button" className="magic-write-btn" onClick={() => applyShadow(null)}>
            Clear
          </button>
        </div>
      </div>

      <label className="check">
        <input
          type="checkbox"
          checked={selection.locked}
          onChange={(e) => patchActive({ locked: e.target.checked })}
        />
        Lock position
      </label>
      <ThemePanel />
    </section>
  )
}

function ThemePanel() {
  return (
    <div className="theme-panel">
      <span className="magic-write-label">Restyle canvas</span>
      <div className="magic-write-row">
        {THEMES.map((theme) => (
          <button
            key={theme.id}
            type="button"
            className="magic-write-btn"
            onClick={() => void applyDocumentTheme(theme.id)}
          >
            {theme.label}
          </button>
        ))}
      </div>
    </div>
  )
}

function labelFor(type: string) {
  if (type === 'circle') return 'Circle'
  if (type === 'ellipse') return 'Ellipse'
  if (type === 'rect') return 'Rectangle'
  if (type === 'text') return 'Text'
  if (type === 'image') return 'Image'
  if (type === 'group') return 'Group'
  return 'Object'
}

function toHex(value: string) {
  return /^#[0-9a-fA-F]{6}$/.test(value) ? value : '#111827'
}
