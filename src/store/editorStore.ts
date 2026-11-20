import { create } from 'zustand'
import type { Canvas, FabricObject } from 'fabric'
import type { BlendMode, DesignDocument, LayerRole, LayerShadow } from '../lib/designSchema'
import { saveDesign } from '../lib/db'
import { serializeCanvas } from '../lib/fabricBridge'

export type ToolId = 'select' | 'text' | 'rect' | 'circle' | 'ellipse' | 'image'

export interface SelectionState {
  count: number
  ids: string[]
  type: string
  fill: string
  opacity: number
  text: string
  fontSize: number
  fontFamily: string
  textAlign: 'left' | 'center' | 'right'
  locked: boolean
  role: LayerRole
  left: number
  top: number
  angle: number
  width: number
  height: number
  blendMode: BlendMode
  shadow: LayerShadow | null
  stroke: string
  strokeWidth: number
  visible: boolean
}

export interface HistoryHandlers {
  undo: () => void
  redo: () => void
  commit: () => void
  syncSelection: () => void
}

interface LayerInfo {
  id: string
  label: string
  index: number
  role: LayerRole
  visible: boolean
}

interface EditorState {
  canvas: Canvas | null
  document: DesignDocument | null
  tool: ToolId
  zoom: number
  layers: LayerInfo[]
  canUndo: boolean
  canRedo: boolean
  dirty: boolean
  selection: SelectionState | null
  suspendHistory: number
  history: HistoryHandlers | null
  hauntDataUrl: string | null
  balanceVisible: boolean
  setCanvas: (canvas: Canvas | null) => void
  setDocument: (doc: DesignDocument | null) => void
  setTool: (tool: ToolId) => void
  setZoom: (zoom: number) => void
  setLayers: (layers: LayerInfo[]) => void
  setHistoryFlags: (canUndo: boolean, canRedo: boolean) => void
  setSelection: (selection: SelectionState | null) => void
  setHistory: (history: HistoryHandlers | null) => void
  setHauntDataUrl: (url: string | null) => void
  setBalanceVisible: (visible: boolean) => void
  beginBatch: () => void
  endBatch: () => void
  rename: (name: string) => void
  markDirty: () => void
  persist: () => Promise<void>
}

export const useEditorStore = create<EditorState>((set, get) => ({
  canvas: null,
  document: null,
  tool: 'select',
  zoom: 0.45,
  layers: [],
  canUndo: false,
  canRedo: false,
  dirty: false,
  selection: null,
  suspendHistory: 0,
  history: null,
  hauntDataUrl: null,
  balanceVisible: true,
  setCanvas: (canvas) => set({ canvas }),
  setDocument: (document) => set({ document, dirty: false }),
  setTool: (tool) => set({ tool }),
  setZoom: (zoom) => set({ zoom }),
  setLayers: (layers) => set({ layers }),
  setHistoryFlags: (canUndo, canRedo) => set({ canUndo, canRedo }),
  setSelection: (selection) => set({ selection }),
  setHistory: (history) => set({ history }),
  setHauntDataUrl: (hauntDataUrl) => set({ hauntDataUrl }),
  setBalanceVisible: (balanceVisible) => set({ balanceVisible }),
  beginBatch: () =>
    set((state) => ({ suspendHistory: state.suspendHistory + 1 })),
  endBatch: () =>
    set((state) => ({
      suspendHistory: Math.max(0, state.suspendHistory - 1),
    })),
  rename: (name) => {
    const document = get().document
    if (!document) return
    set({ document: { ...document, name }, dirty: true })
  },
  markDirty: () => set({ dirty: true }),
  persist: async () => {
    const { canvas, document } = get()
    if (!canvas || !document) return
    const next = serializeCanvas(canvas, document)
    await saveDesign(next)
    set({ document: next, dirty: false })
  },
}))

export function refreshLayers(canvas: Canvas) {
  const objects = canvas.getObjects()
  const layers = objects
    .map((obj, index) => ({
      id: (obj.get('ocId') as string) || `obj-${index}`,
      label: layerName(obj),
      index,
      role: ((obj.get('ocRole') as LayerRole) || 'auto') as LayerRole,
      visible: obj.visible !== false,
    }))
    .reverse()
  useEditorStore.getState().setLayers(layers)
}

function layerName(obj: FabricObject): string {
  const named = String(obj.get('ocName') ?? '').trim()
  if (named) return named
  const type = (obj.get('ocType') as string) || obj.type || 'object'
  if (obj.type === 'text') {
    const text = String((obj as { text?: string }).text ?? '').slice(0, 28)
    return text || 'Text'
  }
  return type.charAt(0).toUpperCase() + type.slice(1)
}
