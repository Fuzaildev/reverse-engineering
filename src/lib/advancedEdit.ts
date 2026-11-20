import { ActiveSelection, FabricObject, Shadow, type TFiller } from 'fabric'
import type { BlendMode, LayerShadow } from './designSchema'
import { refreshLayers, useEditorStore } from '../store/editorStore'

type AlignMode =
  | 'left'
  | 'center'
  | 'right'
  | 'top'
  | 'middle'
  | 'bottom'
  | 'distribute-h'
  | 'distribute-v'

interface StyleClipboard {
  fill?: string | TFiller
  opacity?: number
  fontFamily?: string
  fontSize?: number
  fontWeight?: string | number
  textAlign?: string
  stroke?: string
  strokeWidth?: number
  shadow?: LayerShadow | null
  blendMode?: BlendMode
}

let styleClipboard: StyleClipboard | null = null

function canvasOf() {
  return useEditorStore.getState().canvas
}

function commit() {
  const history = useEditorStore.getState().history
  history?.commit()
  history?.syncSelection()
  const canvas = canvasOf()
  if (canvas) refreshLayers(canvas)
}

function targets(): FabricObject[] {
  const canvas = canvasOf()
  if (!canvas) return []
  return canvas.getActiveObjects().filter((obj) => !obj.get('ocLocked'))
}

function boundsOf(obj: FabricObject) {
  const rect = obj.getBoundingRect()
  return {
    left: rect.left,
    top: rect.top,
    width: rect.width,
    height: rect.height,
    right: rect.left + rect.width,
    bottom: rect.top + rect.height,
    cx: rect.left + rect.width / 2,
    cy: rect.top + rect.height / 2,
  }
}

export function alignSelection(mode: AlignMode) {
  const canvas = canvasOf()
  const items = targets()
  if (!canvas || items.length === 0) return

  if (items.length === 1) {
    const doc = useEditorStore.getState().document
    if (!doc) return
    const obj = items[0]!
    const b = boundsOf(obj)
    const dx =
      mode === 'left'
        ? -b.left
        : mode === 'center'
          ? doc.width / 2 - b.cx
          : mode === 'right'
            ? doc.width - b.right
            : 0
    const dy =
      mode === 'top'
        ? -b.top
        : mode === 'middle'
          ? doc.height / 2 - b.cy
          : mode === 'bottom'
            ? doc.height - b.bottom
            : 0
    obj.set({ left: (obj.left ?? 0) + dx, top: (obj.top ?? 0) + dy })
    obj.setCoords()
    canvas.requestRenderAll()
    commit()
    return
  }

  const boxes = items.map((obj) => ({ obj, b: boundsOf(obj) }))
  const minL = Math.min(...boxes.map((x) => x.b.left))
  const maxR = Math.max(...boxes.map((x) => x.b.right))
  const minT = Math.min(...boxes.map((x) => x.b.top))
  const maxB = Math.max(...boxes.map((x) => x.b.bottom))
  const midX = (minL + maxR) / 2
  const midY = (minT + maxB) / 2

  if (mode === 'distribute-h' || mode === 'distribute-v') {
    const sorted =
      mode === 'distribute-h'
        ? [...boxes].sort((a, b) => a.b.cx - b.b.cx)
        : [...boxes].sort((a, b) => a.b.cy - b.b.cy)
    if (sorted.length < 3) return
    const first = sorted[0]!
    const last = sorted[sorted.length - 1]!
    const span =
      mode === 'distribute-h' ? last.b.cx - first.b.cx : last.b.cy - first.b.cy
    const step = span / (sorted.length - 1)
    sorted.forEach((item, index) => {
      if (index === 0 || index === sorted.length - 1) return
      const target = mode === 'distribute-h' ? first.b.cx + step * index : first.b.cy + step * index
      if (mode === 'distribute-h') {
        item.obj.set({ left: (item.obj.left ?? 0) + (target - item.b.cx) })
      } else {
        item.obj.set({ top: (item.obj.top ?? 0) + (target - item.b.cy) })
      }
      item.obj.setCoords()
    })
  } else {
    for (const item of boxes) {
      let dx = 0
      let dy = 0
      if (mode === 'left') dx = minL - item.b.left
      if (mode === 'center') dx = midX - item.b.cx
      if (mode === 'right') dx = maxR - item.b.right
      if (mode === 'top') dy = minT - item.b.top
      if (mode === 'middle') dy = midY - item.b.cy
      if (mode === 'bottom') dy = maxB - item.b.bottom
      item.obj.set({ left: (item.obj.left ?? 0) + dx, top: (item.obj.top ?? 0) + dy })
      item.obj.setCoords()
    }
  }

  canvas.requestRenderAll()
  commit()
}

export function flipSelection(axis: 'x' | 'y') {
  const canvas = canvasOf()
  const items = targets()
  if (!canvas || items.length === 0) return
  for (const obj of items) {
    if (axis === 'x') obj.set('flipX', !obj.flipX)
    else obj.set('flipY', !obj.flipY)
    obj.setCoords()
  }
  canvas.requestRenderAll()
  commit()
}

export function rotateSelection(delta: number) {
  const canvas = canvasOf()
  const items = targets()
  if (!canvas || items.length === 0) return
  for (const obj of items) {
    obj.set('angle', (obj.angle ?? 0) + delta)
    obj.setCoords()
  }
  canvas.requestRenderAll()
  commit()
}

export function nudgeSelection(dx: number, dy: number) {
  const canvas = canvasOf()
  const items = targets()
  if (!canvas || items.length === 0) return
  for (const obj of items) {
    obj.set({ left: (obj.left ?? 0) + dx, top: (obj.top ?? 0) + dy })
    obj.setCoords()
  }
  canvas.requestRenderAll()
  commit()
}

export function bringToFront() {
  const canvas = canvasOf()
  const items = targets()
  if (!canvas || items.length === 0) return
  for (const obj of items) canvas.bringObjectToFront(obj)
  canvas.requestRenderAll()
  commit()
}

export function sendToBack() {
  const canvas = canvasOf()
  const items = targets()
  if (!canvas || items.length === 0) return
  for (const obj of items) canvas.sendObjectToBack(obj)
  canvas.requestRenderAll()
  commit()
}

export function setLayerVisible(index: number, visible: boolean) {
  const canvas = canvasOf()
  if (!canvas) return
  const obj = canvas.getObjects()[index]
  if (!obj) return
  obj.set('visible', visible)
  if (!visible && canvas.getActiveObjects().includes(obj)) {
    canvas.discardActiveObject()
  }
  canvas.requestRenderAll()
  commit()
}

export function renameLayer(index: number, name: string) {
  const canvas = canvasOf()
  if (!canvas) return
  const obj = canvas.getObjects()[index]
  if (!obj) return
  obj.set('ocName', name)
  canvas.requestRenderAll()
  commit()
}

export function copyObjectStyle() {
  const items = targets()
  if (items.length !== 1) return false
  const obj = items[0]!
  const shadow = obj.shadow as Shadow | null
  styleClipboard = {
    fill: obj.fill ?? undefined,
    opacity: obj.opacity,
    stroke: typeof obj.stroke === 'string' ? obj.stroke : undefined,
    strokeWidth: obj.strokeWidth,
    blendMode: (obj.globalCompositeOperation as BlendMode) || 'source-over',
    shadow: shadow
      ? {
          color: String(shadow.color ?? 'rgba(0,0,0,0.35)'),
          blur: shadow.blur ?? 0,
          offsetX: shadow.offsetX ?? 0,
          offsetY: shadow.offsetY ?? 0,
        }
      : null,
    fontFamily: 'fontFamily' in obj ? String((obj as { fontFamily?: string }).fontFamily) : undefined,
    fontSize: 'fontSize' in obj ? Number((obj as { fontSize?: number }).fontSize) : undefined,
    fontWeight: 'fontWeight' in obj ? (obj as { fontWeight?: string | number }).fontWeight : undefined,
    textAlign: 'textAlign' in obj ? String((obj as { textAlign?: string }).textAlign) : undefined,
  }
  return true
}

export function pasteObjectStyle() {
  const canvas = canvasOf()
  const items = targets()
  if (!canvas || !styleClipboard || items.length === 0) return false
  for (const obj of items) {
    if (styleClipboard.fill != null) obj.set('fill', styleClipboard.fill)
    if (styleClipboard.opacity != null) obj.set('opacity', styleClipboard.opacity)
    if (styleClipboard.stroke != null) obj.set('stroke', styleClipboard.stroke)
    if (styleClipboard.strokeWidth != null) obj.set('strokeWidth', styleClipboard.strokeWidth)
    if (styleClipboard.blendMode) obj.set('globalCompositeOperation', styleClipboard.blendMode)
    if (styleClipboard.shadow) {
      obj.set(
        'shadow',
        new Shadow({
          color: styleClipboard.shadow.color,
          blur: styleClipboard.shadow.blur,
          offsetX: styleClipboard.shadow.offsetX,
          offsetY: styleClipboard.shadow.offsetY,
        }),
      )
    } else if (styleClipboard.shadow === null) {
      obj.set('shadow', null)
    }
    if ('fontFamily' in obj && styleClipboard.fontFamily) obj.set('fontFamily', styleClipboard.fontFamily)
    if ('fontSize' in obj && styleClipboard.fontSize) obj.set('fontSize', styleClipboard.fontSize)
    if ('fontWeight' in obj && styleClipboard.fontWeight != null) {
      obj.set('fontWeight', styleClipboard.fontWeight)
    }
    if ('textAlign' in obj && styleClipboard.textAlign) obj.set('textAlign', styleClipboard.textAlign)
    obj.setCoords()
  }
  canvas.requestRenderAll()
  commit()
  return true
}

export function applyShadow(shadow: LayerShadow | null) {
  const canvas = canvasOf()
  const items = targets()
  if (!canvas || items.length === 0) return
  for (const obj of items) {
    if (!shadow || (shadow.blur <= 0 && shadow.offsetX === 0 && shadow.offsetY === 0)) {
      obj.set('shadow', null)
    } else {
      obj.set(
        'shadow',
        new Shadow({
          color: shadow.color,
          blur: shadow.blur,
          offsetX: shadow.offsetX,
          offsetY: shadow.offsetY,
        }),
      )
    }
  }
  canvas.requestRenderAll()
  commit()
}

export function applyBlendMode(mode: BlendMode) {
  const canvas = canvasOf()
  const items = targets()
  if (!canvas || items.length === 0) return
  for (const obj of items) obj.set('globalCompositeOperation', mode)
  canvas.requestRenderAll()
  commit()
}

export function applyStroke(color: string, width: number) {
  const canvas = canvasOf()
  const items = targets()
  if (!canvas || items.length === 0) return
  for (const obj of items) {
    obj.set({ stroke: color, strokeWidth: width })
    obj.setCoords()
  }
  canvas.requestRenderAll()
  commit()
}

export function setObjectTransform(patch: {
  left?: number
  top?: number
  angle?: number
  width?: number
  height?: number
  scaleX?: number
  scaleY?: number
}) {
  const canvas = canvasOf()
  const items = targets()
  if (!canvas || items.length !== 1) return
  const obj = items[0]!
  if (patch.left != null) obj.set('left', patch.left)
  if (patch.top != null) obj.set('top', patch.top)
  if (patch.angle != null) obj.set('angle', patch.angle)
  if (patch.scaleX != null) obj.set('scaleX', patch.scaleX)
  if (patch.scaleY != null) obj.set('scaleY', patch.scaleY)
  if (patch.width != null && 'width' in obj) {
    const current = (obj.width ?? 1) * (obj.scaleX ?? 1)
    if (current > 0) obj.set('scaleX', patch.width / (obj.width ?? 1))
  }
  if (patch.height != null && 'height' in obj) {
    const current = (obj.height ?? 1) * (obj.scaleY ?? 1)
    if (current > 0) obj.set('scaleY', patch.height / (obj.height ?? 1))
  }
  obj.setCoords()
  canvas.requestRenderAll()
  commit()
}

export function selectAllObjects() {
  const canvas = canvasOf()
  if (!canvas) return
  const objects = canvas.getObjects().filter((obj) => obj.visible !== false && !obj.get('ocLocked'))
  if (objects.length === 0) return
  if (objects.length === 1) canvas.setActiveObject(objects[0]!)
  else canvas.setActiveObject(new ActiveSelection(objects, { canvas }))
  canvas.requestRenderAll()
  useEditorStore.getState().history?.syncSelection()
}

export function selectObjectsByIds(ids: string[]) {
  const canvas = canvasOf()
  if (!canvas || ids.length === 0) return 0
  const want = new Set(ids)
  const objects = canvas
    .getObjects()
    .filter((obj) => want.has(String(obj.get('ocId') ?? '')) && obj.visible !== false)
  if (objects.length === 0) return 0
  if (objects.length === 1) canvas.setActiveObject(objects[0]!)
  else canvas.setActiveObject(new ActiveSelection(objects, { canvas }))
  canvas.requestRenderAll()
  useEditorStore.getState().history?.syncSelection()
  return objects.length
}

export function setSelectionLocked(locked: boolean) {
  const canvas = canvasOf()
  if (!canvas) return
  const items = canvas.getActiveObjects()
  if (!items.length) return
  for (const obj of items) {
    obj.set({
      ocLocked: locked,
      lockMovementX: locked,
      lockMovementY: locked,
      lockScalingX: locked,
      lockScalingY: locked,
      lockRotation: locked,
      hasControls: !locked,
    })
  }
  if (locked) canvas.discardActiveObject()
  canvas.requestRenderAll()
  commit()
}

export function unlockAllObjects() {
  const canvas = canvasOf()
  if (!canvas) return
  for (const obj of canvas.getObjects()) {
    if (!obj.get('ocLocked')) continue
    obj.set({
      ocLocked: false,
      lockMovementX: false,
      lockMovementY: false,
      lockScalingX: false,
      lockScalingY: false,
      lockRotation: false,
      hasControls: true,
    })
  }
  canvas.requestRenderAll()
  commit()
}

export function hasStyleClipboard() {
  return Boolean(styleClipboard)
}
