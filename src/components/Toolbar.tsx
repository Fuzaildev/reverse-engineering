import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  addImageFromFile,
  setCanvasBackground,
} from '../canvas/FabricCanvas'
import {
  IconCircle,
  IconEllipse,
  IconImage,
  IconRect,
  IconSelect,
  IconText,
} from './icons'
import {
  alignSelection,
  copyObjectStyle,
  flipSelection,
  pasteObjectStyle,
  rotateSelection,
} from '../lib/advancedEdit'
import {
  duplicateSelection,
  groupSelection,
  ungroupSelection,
} from '../lib/commands'
import { exportDesignPdf } from '../lib/exportPdf'
import { downloadBytes, downloadDataUrl, exportDataUrl } from '../lib/fabricBridge'
import { PRESETS } from '../lib/presets'
import { useEditorStore, type ToolId } from '../store/editorStore'

const TOOLS: { id: ToolId; label: string; shortcut: string; Icon: typeof IconSelect }[] = [
  { id: 'select', label: 'Select', shortcut: 'V', Icon: IconSelect },
  { id: 'text', label: 'Text', shortcut: 'T', Icon: IconText },
  { id: 'rect', label: 'Rectangle', shortcut: 'R', Icon: IconRect },
  { id: 'circle', label: 'Circle', shortcut: 'O', Icon: IconCircle },
  { id: 'ellipse', label: 'Ellipse', shortcut: 'E', Icon: IconEllipse },
  { id: 'image', label: 'Image', shortcut: 'I', Icon: IconImage },
]

interface ToolbarProps {
  onFind?: () => void
}

export function Toolbar({ onFind }: ToolbarProps) {
  const navigate = useNavigate()
  const fileRef = useRef<HTMLInputElement>(null)
  const exportRef = useRef<HTMLDivElement>(null)
  const [exportOpen, setExportOpen] = useState(false)
  const tool = useEditorStore((s) => s.tool)
  const zoom = useEditorStore((s) => s.zoom)
  const dirty = useEditorStore((s) => s.dirty)
  const document = useEditorStore((s) => s.document)
  const canvas = useEditorStore((s) => s.canvas)
  const canUndo = useEditorStore((s) => s.canUndo)
  const canRedo = useEditorStore((s) => s.canRedo)
  const history = useEditorStore((s) => s.history)
  const setTool = useEditorStore((s) => s.setTool)
  const setZoom = useEditorStore((s) => s.setZoom)
  const rename = useEditorStore((s) => s.rename)
  const persist = useEditorStore((s) => s.persist)

  useEffect(() => {
    if (!exportOpen) return
    const onPointer = (event: MouseEvent) => {
      if (!exportRef.current?.contains(event.target as Node)) setExportOpen(false)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setExportOpen(false)
    }
    window.addEventListener('mousedown', onPointer)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('mousedown', onPointer)
      window.removeEventListener('keydown', onKey)
    }
  }, [exportOpen])

  const onTool = (id: ToolId) => {
    if (id === 'image') {
      fileRef.current?.click()
      return
    }
    setTool(id)
  }

  const onExport = (format: 'png' | 'jpeg', multiplier: number) => {
    if (!canvas || !document) return
    const url = exportDataUrl(canvas, format, multiplier, document.width)
    const ext = format === 'jpeg' ? 'jpg' : 'png'
    downloadDataUrl(url, `${document.name || 'design'}-${multiplier}x.${ext}`)
    setExportOpen(false)
  }

  const onPdf = async () => {
    if (!canvas || !document) return
    const bytes = await exportDesignPdf(canvas, document.name, document.width, document.height)
    downloadBytes(bytes, `${document.name || 'design'}.pdf`, 'application/pdf')
    setExportOpen(false)
  }

  const zoomPct = Math.round(zoom * 100)
  const preset = PRESETS.find((item) => item.id === document?.presetId)

  return (
    <header className="toolbar">
      <div className="toolbar-row toolbar-top">
        <div className="toolbar-brand">
          <button type="button" className="ghost hub-back" onClick={() => navigate('/create')}>
            Library
          </button>
          <span className="toolbar-sep" aria-hidden />
          <input
            className="doc-name"
            aria-label="Design name"
            value={document?.name ?? ''}
            onChange={(e) => rename(e.target.value)}
            onBlur={() => void persist()}
          />
          <span className={`save-status ${dirty ? 'dirty' : ''}`}>{dirty ? 'Unsaved' : 'Saved'}</span>
        </div>

        <div className="toolbar-export">
          {document && (
            <span className="doc-size">
              {preset?.label ?? 'Custom'} · {document.width} × {document.height}
            </span>
          )}
          <label className="zoom-label">
            <span>{zoomPct}%</span>
            <input
              type="range"
              min={0.15}
              max={1}
              step={0.05}
              value={zoom}
              aria-label="Zoom"
              onChange={(e) => setZoom(Number(e.target.value))}
            />
          </label>
          <button type="button" onClick={() => void persist()}>
            Save
          </button>
          <div className="export-wrap" ref={exportRef}>
            <button
              type="button"
              className="primary"
              aria-expanded={exportOpen}
              aria-haspopup="menu"
              onClick={() => setExportOpen((open) => !open)}
            >
              Export
            </button>
            {exportOpen && (
              <div className="export-pop" role="menu">
                <button type="button" role="menuitem" onClick={() => onExport('png', 2)}>
                  PNG · 2×
                  <span>Recommended</span>
                </button>
                <button type="button" role="menuitem" onClick={() => onExport('png', 1)}>
                  PNG · 1×
                  <span>Document size</span>
                </button>
                <button type="button" role="menuitem" onClick={() => onExport('jpeg', 2)}>
                  JPG · 2×
                  <span>Smaller file</span>
                </button>
                <button type="button" role="menuitem" onClick={() => void onPdf()}>
                  PDF
                  <span>Single page</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="toolbar-row toolbar-bottom">
        <div className="toolbar-tools" role="toolbar" aria-label="Drawing tools">
          {TOOLS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={tool === item.id ? 'tool active' : 'tool'}
              title={`${item.label} (${item.shortcut})`}
              aria-pressed={tool === item.id}
              onClick={() => onTool(item.id)}
            >
              <item.Icon />
              <span className="tool-text">{item.label}</span>
            </button>
          ))}
          <label className="bg-label" title="Canvas background">
            Canvas
            <input
              type="color"
              value={normalizeColor(String(canvas?.backgroundColor ?? '#ffffff'))}
              onChange={(e) => setCanvasBackground(e.target.value)}
            />
          </label>
        </div>

        <div className="toolbar-edit" role="toolbar" aria-label="Edit">
          <button type="button" disabled={!canUndo} title="Undo (Ctrl+Z)" onClick={() => history?.undo()}>
            Undo
          </button>
          <button type="button" disabled={!canRedo} title="Redo (Ctrl+Y)" onClick={() => history?.redo()}>
            Redo
          </button>
          <button type="button" title="Duplicate (Ctrl+D)" onClick={() => void duplicateSelection()}>
            Duplicate
          </button>
          <button type="button" title="Group (Ctrl+G)" onClick={() => groupSelection()}>
            Group
          </button>
          <button type="button" title="Ungroup" onClick={() => ungroupSelection()}>
            Ungroup
          </button>
          <button type="button" title="Find (Ctrl+K)" onClick={() => onFind?.()}>
            Find
          </button>
        </div>

        <div className="toolbar-align" role="toolbar" aria-label="Align and transform">
          <button type="button" title="Align left" onClick={() => alignSelection('left')}>
            ⫷
          </button>
          <button type="button" title="Align center" onClick={() => alignSelection('center')}>
            ☰
          </button>
          <button type="button" title="Align right" onClick={() => alignSelection('right')}>
            ⫸
          </button>
          <button type="button" title="Align top" onClick={() => alignSelection('top')}>
            ⤒
          </button>
          <button type="button" title="Align middle" onClick={() => alignSelection('middle')}>
            ≡
          </button>
          <button type="button" title="Align bottom" onClick={() => alignSelection('bottom')}>
            ⤓
          </button>
          <button type="button" title="Distribute H" onClick={() => alignSelection('distribute-h')}>
            ⇆
          </button>
          <button type="button" title="Distribute V" onClick={() => alignSelection('distribute-v')}>
            ⇅
          </button>
          <button type="button" title="Flip H" onClick={() => flipSelection('x')}>
            ↔
          </button>
          <button type="button" title="Flip V" onClick={() => flipSelection('y')}>
            ↕
          </button>
          <button type="button" title="Rotate 90°" onClick={() => rotateSelection(90)}>
            ↻
          </button>
          <button type="button" title="Copy style" onClick={() => copyObjectStyle()}>
            Style
          </button>
          <button type="button" title="Paste style" onClick={() => pasteObjectStyle()}>
            Paste style
          </button>
        </div>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) void addImageFromFile(file)
          e.target.value = ''
          setTool('select')
        }}
      />
    </header>
  )
}

function normalizeColor(value: string): string {
  if (/^#[0-9a-fA-F]{6}$/.test(value)) return value
  return '#ffffff'
}
