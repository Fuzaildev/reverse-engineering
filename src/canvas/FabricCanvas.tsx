import { useEffect, useRef } from 'react'
import {
  Canvas,
  Circle,
  Ellipse,
  FabricImage,
  FabricText,
  Rect,
  type FabricObject,
  type TPointerEventInfo,
} from 'fabric'
import {
  copyObjectStyle,
  nudgeSelection,
  pasteObjectStyle,
  selectAllObjects,
} from '../lib/advancedEdit'
import {
  copySelection,
  duplicateSelection,
  groupSelection,
  pasteClipboard,
  snapMoving,
  ungroupSelection,
} from '../lib/commands'
import type { DesignDocument } from '../lib/designSchema'
import { CanvasOverlays } from '../components/CanvasOverlays'
import { applyBackground, hydrateCanvas, remeasureText } from '../lib/fabricBridge'
import { ensureFonts, FONT_SANS } from '../lib/fonts'
import { refreshLayers, useEditorStore, type SelectionState } from '../store/editorStore'

const MAX_HISTORY = 40

interface Props {
  design: DesignDocument
}

export function FabricCanvas({ design }: Props) {
  const hostRef = useRef<HTMLCanvasElement | null>(null)
  const fabricRef = useRef<Canvas | null>(null)
  const historyRef = useRef<string[]>([])
  const indexRef = useRef(-1)
  const restoringRef = useRef(false)
  const commitTimer = useRef<number | null>(null)
  const tool = useEditorStore((s) => s.tool)
  const zoom = useEditorStore((s) => s.zoom)
  const setCanvas = useEditorStore((s) => s.setCanvas)
  const markDirty = useEditorStore((s) => s.markDirty)
  const setHistoryFlags = useEditorStore((s) => s.setHistoryFlags)
  const setHistory = useEditorStore((s) => s.setHistory)
  const setSelection = useEditorStore((s) => s.setSelection)
  const persist = useEditorStore((s) => s.persist)

  useEffect(() => {
    if (!hostRef.current) return

    const canvas = new Canvas(hostRef.current, {
      width: design.width,
      height: design.height,
      backgroundColor: design.background,
      preserveObjectStacking: true,
      selection: true,
    })
    fabricRef.current = canvas
    setCanvas(canvas)

    let disposed = false

    const publishSelection = () => {
      const active = canvas.getActiveObject()
      if (!active) {
        setSelection(null)
        return
      }
      const objects = canvas.getActiveObjects()
      const text = active instanceof FabricText ? active : null
      const box = active.getBoundingRect()
      const shadow = active.shadow as { color?: string; blur?: number; offsetX?: number; offsetY?: number } | null
      const selection: SelectionState = {
        count: objects.length,
        ids: objects.map((obj) => String(obj.get('ocId') ?? '')),
        type: objects.length > 1 ? 'selection' : String(active.get('ocType') || active.type),
        fill: String(active.fill ?? '#111827'),
        opacity: active.opacity ?? 1,
        text: text?.text ?? '',
        fontSize: text?.fontSize ?? 48,
        fontFamily: text?.fontFamily ?? FONT_SANS,
        textAlign: (text?.textAlign as SelectionState['textAlign']) ?? 'left',
        locked: Boolean(active.get('ocLocked')),
        role: (active.get('ocRole') as SelectionState['role']) || 'auto',
        left: Math.round(active.left ?? 0),
        top: Math.round(active.top ?? 0),
        angle: Math.round(active.angle ?? 0),
        width: Math.round(box.width),
        height: Math.round(box.height),
        blendMode: (active.globalCompositeOperation as SelectionState['blendMode']) || 'source-over',
        shadow: shadow
          ? {
              color: String(shadow.color ?? 'rgba(0,0,0,0.35)'),
              blur: shadow.blur ?? 0,
              offsetX: shadow.offsetX ?? 0,
              offsetY: shadow.offsetY ?? 0,
            }
          : null,
        stroke: typeof active.stroke === 'string' ? active.stroke : '#000000',
        strokeWidth: active.strokeWidth ?? 0,
        visible: active.visible !== false,
      }
      setSelection(selection)
    }

    const pushHistory = () => {
      if (restoringRef.current || disposed) return
      if (useEditorStore.getState().suspendHistory > 0) return
      const json = JSON.stringify(canvas.toJSON())
      if (historyRef.current[indexRef.current] === json) {
        setHistoryFlags(indexRef.current > 0, indexRef.current < historyRef.current.length - 1)
        return
      }
      const next = historyRef.current.slice(0, indexRef.current + 1)
      next.push(json)
      if (next.length > MAX_HISTORY) next.shift()
      historyRef.current = next
      indexRef.current = next.length - 1
      setHistoryFlags(indexRef.current > 0, false)
    }

    const flushCommit = () => {
      if (commitTimer.current != null) {
        window.clearTimeout(commitTimer.current)
        commitTimer.current = null
      }
      pushHistory()
      void persist()
    }

    const scheduleCommit = () => {
      if (restoringRef.current || disposed) return
      if (useEditorStore.getState().suspendHistory > 0) return
      refreshLayers(canvas)
      publishSelection()
      markDirty()
      if (commitTimer.current != null) window.clearTimeout(commitTimer.current)
      commitTimer.current = window.setTimeout(flushCommit, 160)
    }

    const boot = async () => {
      useEditorStore.getState().beginBatch()
      try {
        await ensureFonts()
        await hydrateCanvas(canvas, design)
        remeasureText(canvas)
      } finally {
        useEditorStore.getState().endBatch()
      }
      if (disposed) return
      // Re-apply zoom after hydrate so dimensions match the document.
      const z = useEditorStore.getState().zoom
      canvas.setZoom(z)
      canvas.setDimensions({
        width: design.width * z,
        height: design.height * z,
      })
      refreshLayers(canvas)
      historyRef.current = [JSON.stringify(canvas.toJSON())]
      indexRef.current = 0
      setHistoryFlags(false, false)
      canvas.on('object:modified', scheduleCommit)
      canvas.on('object:added', scheduleCommit)
      canvas.on('object:removed', scheduleCommit)
      canvas.on('selection:created', publishSelection)
      canvas.on('selection:updated', publishSelection)
      canvas.on('selection:cleared', publishSelection)
      canvas.requestRenderAll()
    }
    void boot()

    const restore = async (i: number) => {
      restoringRef.current = true
      await canvas.loadFromJSON(JSON.parse(historyRef.current[i]))
      canvas.requestRenderAll()
      refreshLayers(canvas)
      publishSelection()
      setHistoryFlags(i > 0, i < historyRef.current.length - 1)
      markDirty()
      void persist()
      restoringRef.current = false
    }

    const undo = async () => {
      flushCommit()
      if (indexRef.current <= 0) return
      indexRef.current -= 1
      await restore(indexRef.current)
    }

    const redo = async () => {
      flushCommit()
      if (indexRef.current >= historyRef.current.length - 1) return
      indexRef.current += 1
      await restore(indexRef.current)
    }

    setHistory({
      undo: () => void undo(),
      redo: () => void redo(),
      commit: scheduleCommit,
      syncSelection: publishSelection,
    })

    const onKey = (e: KeyboardEvent) => {
      const meta = e.ctrlKey || e.metaKey
      const active = globalThis.document.activeElement
      const typing =
        active instanceof HTMLInputElement ||
        active instanceof HTMLTextAreaElement ||
        (active instanceof HTMLElement && active.isContentEditable)

      if (meta && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault()
        void undo()
        return
      }
      if (
        meta &&
        (e.key.toLowerCase() === 'y' ||
          (e.key.toLowerCase() === 'z' && e.shiftKey))
      ) {
        e.preventDefault()
        void redo()
        return
      }
      if (meta && e.key.toLowerCase() === 'c' && e.shiftKey && !typing) {
        e.preventDefault()
        copyObjectStyle()
        return
      }
      if (meta && e.key.toLowerCase() === 'v' && e.shiftKey && !typing) {
        e.preventDefault()
        pasteObjectStyle()
        return
      }
      if (meta && e.key.toLowerCase() === 'c' && !typing) {
        copySelection()
        return
      }
      if (meta && e.key.toLowerCase() === 'v' && !typing) {
        e.preventDefault()
        void pasteClipboard()
        return
      }
      if (meta && e.key.toLowerCase() === 'a' && !typing) {
        e.preventDefault()
        selectAllObjects()
        return
      }
      if (meta && e.key.toLowerCase() === 'd' && !typing) {
        e.preventDefault()
        void duplicateSelection()
        return
      }
      if (meta && e.key.toLowerCase() === 'g' && !typing) {
        e.preventDefault()
        if (e.shiftKey) ungroupSelection()
        else groupSelection()
        return
      }
      if (!typing && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault()
        const step = e.shiftKey ? 10 : 1
        const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0
        const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0
        nudgeSelection(dx, dy)
        return
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && !typing) {
        const objs = canvas.getActiveObjects()
        if (!objs.length) return
        e.preventDefault()
        objs.forEach((o) => canvas.remove(o))
        canvas.discardActiveObject()
        canvas.requestRenderAll()
      }
    }

    const onMoving = (opt: { target?: FabricObject }) => {
      if (!opt.target) return
      snapMoving(opt.target, design.width, design.height)
    }
    canvas.on('object:moving', onMoving)
    window.addEventListener('keydown', onKey)

    return () => {
      disposed = true
      if (commitTimer.current != null) window.clearTimeout(commitTimer.current)
      window.removeEventListener('keydown', onKey)
      setHistory(null)
      setSelection(null)
      canvas.dispose()
      fabricRef.current = null
      setCanvas(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [design.id])

  useEffect(() => {
    const canvas = fabricRef.current
    if (!canvas) return
    canvas.setZoom(zoom)
    canvas.setDimensions({
      width: design.width * zoom,
      height: design.height * zoom,
    })
    canvas.requestRenderAll()
  }, [zoom, design.width, design.height])

  useEffect(() => {
    const canvas = fabricRef.current
    if (!canvas) return

    const onMouseDown = (opt: TPointerEventInfo) => {
      if (opt.target || tool === 'select' || tool === 'image') return
      const pointer = canvas.getScenePoint(opt.e)
      const id = crypto.randomUUID()

      if (tool === 'text') {
        const text = new FabricText('Double-click to edit', {
          left: pointer.x,
          top: pointer.y,
          originX: 'left',
          originY: 'top',
          fontSize: 48,
          fill: '#111827',
          fontFamily: FONT_SANS,
          fontWeight: 700,
          ocId: id,
          ocType: 'text',
          ocRole: 'auto',
        })
        canvas.add(text)
        canvas.setActiveObject(text)
        useEditorStore.getState().setTool('select')
      } else if (tool === 'rect') {
        const rect = new Rect({
          left: pointer.x,
          top: pointer.y,
          originX: 'center',
          originY: 'center',
          width: 240,
          height: 160,
          fill: '#0f766e',
          rx: 16,
          ry: 16,
          ocId: id,
          ocType: 'rect',
          ocRole: 'auto',
        })
        canvas.add(rect)
        canvas.setActiveObject(rect)
        useEditorStore.getState().setTool('select')
      } else if (tool === 'circle') {
        const circle = new Circle({
          left: pointer.x,
          top: pointer.y,
          originX: 'center',
          originY: 'center',
          radius: 90,
          fill: '#b45309',
          ocId: id,
          ocType: 'circle',
          ocRole: 'auto',
        })
        canvas.add(circle)
        canvas.setActiveObject(circle)
        useEditorStore.getState().setTool('select')
      } else if (tool === 'ellipse') {
        const ellipse = new Ellipse({
          left: pointer.x,
          top: pointer.y,
          originX: 'center',
          originY: 'center',
          rx: 140,
          ry: 80,
          fill: '#1d4ed8',
          ocId: id,
          ocType: 'ellipse',
          ocRole: 'auto',
        })
        canvas.add(ellipse)
        canvas.setActiveObject(ellipse)
        useEditorStore.getState().setTool('select')
      }
      canvas.requestRenderAll()
    }

    canvas.on('mouse:down', onMouseDown)
    return () => {
      canvas.off('mouse:down', onMouseDown)
    }
  }, [tool])

  return (
    <div className="canvas-stage">
      <div className="canvas-stack">
        <canvas ref={hostRef} />
        <CanvasOverlays />
      </div>
    </div>
  )
}

export async function addImageFromFile(file: File) {
  const canvas = useEditorStore.getState().canvas
  if (!canvas) return
  const dataUrl = await readFileAsDataUrl(file)
  const img = await FabricImage.fromURL(dataUrl)
  const logical = useEditorStore.getState().document?.width ?? canvas.getWidth()
  const maxW = logical * 0.5
  if ((img.width ?? 0) > maxW) img.scaleToWidth(maxW)
  img.set({
    left: logical * 0.25,
    top: 80,
    ocId: crypto.randomUUID(),
    ocType: 'image',
    ocRole: 'media',
  })
  canvas.add(img)
  canvas.setActiveObject(img)
  canvas.requestRenderAll()
}

export function setCanvasBackground(color: string) {
  const canvas = useEditorStore.getState().canvas
  if (!canvas) return
  applyBackground(canvas, color)
  useEditorStore.getState().history?.commit()
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}
