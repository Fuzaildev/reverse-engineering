import { useEffect, useMemo, useState } from 'react'
import {
  alignSelection,
  applyBlendMode,
  applyShadow,
  bringToFront,
  copyObjectStyle,
  flipSelection,
  nudgeSelection,
  pasteObjectStyle,
  rotateSelection,
  selectAllObjects,
  selectObjectsByIds,
  sendToBack,
  setSelectionLocked,
  unlockAllObjects,
} from '../lib/advancedEdit'
import { ELEMENT_PRESETS, loadBrandKit } from '../lib/brandKit'
import {
  duplicateSelection,
  groupSelection,
  insertDesignObjects,
  ungroupSelection,
} from '../lib/commands'
import { hydrateCanvas, serializeCanvas } from '../lib/fabricBridge'
import {
  applyBrandTheme,
  autoFitHeadlines,
  findReplaceText,
  idsForRole,
  transformTextCase,
} from '../lib/templateStudio'
import { useEditorStore } from '../store/editorStore'

interface Command {
  id: string
  label: string
  hint?: string
  run: () => void | Promise<void>
}

interface Props {
  open: boolean
  onClose: () => void
}

export function CommandPalette({ open, onClose }: Props) {
  const [query, setQuery] = useState('')
  const persist = useEditorStore((s) => s.persist)
  const history = useEditorStore((s) => s.history)
  const setBalanceVisible = useEditorStore((s) => s.setBalanceVisible)
  const balanceVisible = useEditorStore((s) => s.balanceVisible)

  const commands = useMemo<Command[]>(
    () => [
      { id: 'select-all', label: 'Select all', hint: 'Ctrl+A', run: () => selectAllObjects() },
      { id: 'duplicate', label: 'Duplicate', hint: 'Ctrl+D', run: () => void duplicateSelection() },
      { id: 'group', label: 'Group', hint: 'Ctrl+G', run: () => groupSelection() },
      { id: 'ungroup', label: 'Ungroup', run: () => ungroupSelection() },
      { id: 'undo', label: 'Undo', hint: 'Ctrl+Z', run: () => history?.undo() },
      { id: 'redo', label: 'Redo', hint: 'Ctrl+Y', run: () => history?.redo() },
      { id: 'save', label: 'Save design', hint: 'Ctrl+S', run: () => void persist() },
      { id: 'align-left', label: 'Align left', run: () => alignSelection('left') },
      { id: 'align-center', label: 'Align center', run: () => alignSelection('center') },
      { id: 'align-right', label: 'Align right', run: () => alignSelection('right') },
      { id: 'align-top', label: 'Align top', run: () => alignSelection('top') },
      { id: 'align-middle', label: 'Align middle', run: () => alignSelection('middle') },
      { id: 'align-bottom', label: 'Align bottom', run: () => alignSelection('bottom') },
      { id: 'dist-h', label: 'Distribute horizontally', run: () => alignSelection('distribute-h') },
      { id: 'dist-v', label: 'Distribute vertically', run: () => alignSelection('distribute-v') },
      { id: 'flip-h', label: 'Flip horizontal', run: () => flipSelection('x') },
      { id: 'flip-v', label: 'Flip vertical', run: () => flipSelection('y') },
      { id: 'rot-cw', label: 'Rotate 90° clockwise', run: () => rotateSelection(90) },
      { id: 'rot-ccw', label: 'Rotate 90° counter-clockwise', run: () => rotateSelection(-90) },
      { id: 'front', label: 'Bring to front', run: () => bringToFront() },
      { id: 'back', label: 'Send to back', run: () => sendToBack() },
      { id: 'style-copy', label: 'Copy style', hint: 'Ctrl+Shift+C', run: () => copyObjectStyle() },
      { id: 'style-paste', label: 'Paste style', hint: 'Ctrl+Shift+V', run: () => pasteObjectStyle() },
      {
        id: 'shadow',
        label: 'Apply soft drop shadow',
        run: () =>
          applyShadow({ color: 'rgba(0,0,0,0.4)', blur: 28, offsetX: 0, offsetY: 14 }),
      },
      { id: 'shadow-clear', label: 'Clear shadow', run: () => applyShadow(null) },
      { id: 'blend-multiply', label: 'Blend · Multiply', run: () => applyBlendMode('multiply') },
      { id: 'blend-screen', label: 'Blend · Screen', run: () => applyBlendMode('screen') },
      { id: 'blend-normal', label: 'Blend · Normal', run: () => applyBlendMode('source-over') },
      {
        id: 'radar',
        label: balanceVisible ? 'Hide balance radar' : 'Show balance radar',
        run: () => setBalanceVisible(!balanceVisible),
      },
      { id: 'nudge-up', label: 'Nudge up 10px', run: () => nudgeSelection(0, -10) },
      { id: 'nudge-down', label: 'Nudge down 10px', run: () => nudgeSelection(0, 10) },
      {
        id: 'add-badge',
        label: 'Add badge element',
        run: () => {
          const doc = useEditorStore.getState().document
          if (!doc) return
          void insertDesignObjects(
            ELEMENT_PRESETS.find((p) => p.id === 'badge')!.build(doc.width * 0.78, doc.height * 0.22),
            0,
          )
        },
      },
      {
        id: 'add-pill',
        label: 'Add pill label',
        run: () => {
          const doc = useEditorStore.getState().document
          if (!doc) return
          void insertDesignObjects(
            ELEMENT_PRESETS.find((p) => p.id === 'pill')!.build(doc.width * 0.28, doc.height * 0.82),
            0,
          )
        },
      },
      {
        id: 'add-quote',
        label: 'Add quote mark',
        run: () => {
          const doc = useEditorStore.getState().document
          if (!doc) return
          void insertDesignObjects(
            ELEMENT_PRESETS.find((p) => p.id === 'quote')!.build(doc.width * 0.18, doc.height * 0.2),
            0,
          )
        },
      },
      {
        id: 'brand-theme',
        label: 'Apply brand theme colors',
        run: async () => {
          const state = useEditorStore.getState()
          const { canvas, document: doc } = state
          if (!canvas || !doc) return
          const kit = loadBrandKit()
          const next = applyBrandTheme(serializeCanvas(canvas, doc), kit.colors, 0)
          state.beginBatch()
          try {
            await hydrateCanvas(canvas, next)
            state.setDocument(next)
            state.markDirty()
          } finally {
            state.endBatch()
          }
          history?.commit()
          history?.syncSelection()
        },
      },
      {
        id: 'find-replace',
        label: 'Find & replace text…',
        run: async () => {
          const state = useEditorStore.getState()
          const { canvas, document: doc } = state
          if (!canvas || !doc) return
          const find = window.prompt('Find text')
          if (!find) return
          const replace = window.prompt('Replace with', '') ?? ''
          const { doc: next, hits } = findReplaceText(serializeCanvas(canvas, doc), find, replace)
          if (!hits) return
          state.beginBatch()
          try {
            await hydrateCanvas(canvas, next)
            state.setDocument(next)
            state.markDirty()
          } finally {
            state.endBatch()
          }
          history?.commit()
          history?.syncSelection()
        },
      },
      {
        id: 'select-headlines',
        label: 'Select all headlines',
        run: () => {
          const state = useEditorStore.getState()
          if (!state.canvas || !state.document) return
          const ids = idsForRole(serializeCanvas(state.canvas, state.document), 'headline')
          selectObjectsByIds(ids)
        },
      },
      {
        id: 'select-ctas',
        label: 'Select all CTAs',
        run: () => {
          const state = useEditorStore.getState()
          if (!state.canvas || !state.document) return
          const ids = idsForRole(serializeCanvas(state.canvas, state.document), 'cta')
          selectObjectsByIds(ids)
        },
      },
      {
        id: 'lock-selection',
        label: 'Lock selection',
        run: () => setSelectionLocked(true),
      },
      {
        id: 'unlock-all',
        label: 'Unlock all layers',
        run: () => unlockAllObjects(),
      },
      {
        id: 'case-upper',
        label: 'Uppercase all text',
        run: async () => {
          const state = useEditorStore.getState()
          const { canvas, document: doc } = state
          if (!canvas || !doc) return
          const next = transformTextCase(serializeCanvas(canvas, doc), 'upper')
          state.beginBatch()
          try {
            await hydrateCanvas(canvas, next)
            state.setDocument(next)
            state.markDirty()
          } finally {
            state.endBatch()
          }
          history?.commit()
          history?.syncSelection()
        },
      },
      {
        id: 'autofit',
        label: 'Auto-fit headlines',
        run: async () => {
          const state = useEditorStore.getState()
          const { canvas, document: doc } = state
          if (!canvas || !doc) return
          const next = autoFitHeadlines(serializeCanvas(canvas, doc))
          state.beginBatch()
          try {
            await hydrateCanvas(canvas, next)
            state.setDocument(next)
            state.markDirty()
          } finally {
            state.endBatch()
          }
          history?.commit()
          history?.syncSelection()
        },
      },
    ],
    [history, persist, balanceVisible, setBalanceVisible],
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return commands
    return commands.filter((cmd) => cmd.label.toLowerCase().includes(q) || cmd.id.includes(q))
  }, [commands, query])

  useEffect(() => {
    if (!open) setQuery('')
  }, [open])

  if (!open) return null

  return (
    <div className="cmdk-backdrop" role="presentation" onClick={onClose}>
      <div
        className="cmdk"
        role="dialog"
        aria-label="Find command"
        onClick={(event) => event.stopPropagation()}
      >
        <label className="cmdk-field">
          <span className="sr-only">Find</span>
          <input
            autoFocus
            value={query}
            placeholder="Find a command… (align, shadow, blend, twin)"
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Escape') onClose()
              if (event.key === 'Enter' && filtered[0]) {
                void filtered[0].run()
                onClose()
              }
            }}
          />
        </label>
        <ul className="cmdk-list">
          {filtered.length === 0 ? (
            <li className="cmdk-empty">No matching commands</li>
          ) : (
            filtered.map((cmd) => (
              <li key={cmd.id}>
                <button
                  type="button"
                  onClick={() => {
                    void cmd.run()
                    onClose()
                  }}
                >
                  <span>{cmd.label}</span>
                  {cmd.hint ? <kbd>{cmd.hint}</kbd> : null}
                </button>
              </li>
            ))
          )}
        </ul>
        <p className="cmdk-foot">Inspired by Photopea Find · local only</p>
      </div>
    </div>
  )
}
