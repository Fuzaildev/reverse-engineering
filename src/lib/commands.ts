import { ActiveSelection, FabricObject, FabricText, Group } from 'fabric'
import type { DesignObject, GroupObject } from './designSchema'
import { applyLock, designObjectToFabric, fabricToDesignObject, hydrateCanvas, serializeCanvas } from './fabricBridge'
import { applyThemeToDocument, type DesignMood } from './promptDesign'
import { useEditorStore } from '../store/editorStore'

let clipboard: DesignObject[] = []
let pasteIndex = 0

function canvasOf() {
  return useEditorStore.getState().canvas
}

function commit() {
  const history = useEditorStore.getState().history
  history?.commit()
  history?.syncSelection()
}

function shifted(obj: DesignObject, offset: number): DesignObject {
  const next: DesignObject = {
    ...obj,
    id: crypto.randomUUID(),
    left: obj.left + offset,
    top: obj.top + offset,
  }
  if (next.type === 'group') {
    const snapshot = structuredClone((obj as GroupObject).snapshot) as {
      left?: number
      top?: number
    }
    if (typeof snapshot.left === 'number') snapshot.left += offset
    if (typeof snapshot.top === 'number') snapshot.top += offset
    next.snapshot = snapshot
  }
  return next
}

export async function insertDesignObjects(objects: DesignObject[], offset: number) {
  const canvas = canvasOf()
  if (!canvas || objects.length === 0) return
  const state = useEditorStore.getState()
  state.beginBatch()
  const created: FabricObject[] = []
  try {
    for (const obj of objects) {
      const fabricObj = await designObjectToFabric(shifted(obj, offset))
      if (!fabricObj) continue
      canvas.add(fabricObj)
      created.push(fabricObj)
    }
  } finally {
    state.endBatch()
  }
  if (created.length === 1) canvas.setActiveObject(created[0])
  else if (created.length > 1) {
    canvas.setActiveObject(new ActiveSelection(created, { canvas }))
  }
  canvas.requestRenderAll()
  commit()
}

export function copySelection() {
  const canvas = canvasOf()
  if (!canvas) return
  const objects = canvas
    .getActiveObjects()
    .map(fabricToDesignObject)
    .filter((obj): obj is DesignObject => obj !== null)
  if (!objects.length) return
  clipboard = objects
  pasteIndex = 0
}

export async function pasteClipboard() {
  if (!clipboard.length) return
  pasteIndex += 1
  await insertDesignObjects(clipboard, 24 * pasteIndex)
}

export async function duplicateSelection() {
  const canvas = canvasOf()
  if (!canvas) return
  const objects = canvas
    .getActiveObjects()
    .map(fabricToDesignObject)
    .filter((obj): obj is DesignObject => obj !== null)
  await insertDesignObjects(objects, 24)
}

export function groupSelection() {
  const canvas = canvasOf()
  if (!canvas) return
  const active = canvas.getActiveObject()
  if (!(active instanceof ActiveSelection)) return
  const objects = [...active.getObjects()]
  if (objects.length < 2) return
  const state = useEditorStore.getState()
  state.beginBatch()
  canvas.discardActiveObject()
  objects.forEach((obj) => canvas.remove(obj))
  const group = new Group(objects)
  group.set({ ocId: crypto.randomUUID(), ocType: 'group' })
  canvas.add(group)
  canvas.setActiveObject(group)
  state.endBatch()
  canvas.requestRenderAll()
  commit()
}

export function ungroupSelection() {
  const canvas = canvasOf()
  if (!canvas) return
  const active = canvas.getActiveObject()
  if (!(active instanceof Group) || active instanceof ActiveSelection) return
  const state = useEditorStore.getState()
  state.beginBatch()
  const objects = active.removeAll()
  canvas.remove(active)
  objects.forEach((obj) => canvas.add(obj))
  state.endBatch()
  if (objects.length > 1) {
    canvas.setActiveObject(new ActiveSelection(objects, { canvas }))
  } else if (objects[0]) {
    canvas.setActiveObject(objects[0])
  }
  canvas.requestRenderAll()
  commit()
}

export function patchActive(patch: {
  fill?: string
  opacity?: number
  text?: string
  fontSize?: number
  fontFamily?: string
  textAlign?: 'left' | 'center' | 'right'
  locked?: boolean
  role?: import('./designSchema').LayerRole
}) {
  const canvas = canvasOf()
  if (!canvas) return
  const targets = canvas.getActiveObjects()
  if (!targets.length) return
  for (const obj of targets) {
    if (patch.opacity != null) obj.set('opacity', patch.opacity)
    if (patch.locked != null) applyLock(obj, patch.locked)
    if (patch.role != null) obj.set('ocRole', patch.role)
    if (patch.fill != null) obj.set('fill', patch.fill)
    if (obj instanceof FabricText) {
      if (patch.text != null) obj.set('text', patch.text)
      if (patch.fontSize != null) obj.set('fontSize', patch.fontSize)
      if (patch.fontFamily != null) obj.set('fontFamily', patch.fontFamily)
      if (patch.textAlign != null) obj.set('textAlign', patch.textAlign)
    }
    obj.setCoords()
  }
  canvas.requestRenderAll()
  commit()
}

const SNAP = 8

export function snapMoving(
  target: FabricObject,
  logicalWidth: number,
  logicalHeight: number,
) {
  const canvas = target.canvas
  if (!canvas || target.get('ocLocked')) return
  const width = target.getScaledWidth()
  const height = target.getScaledHeight()
  const guidesX = [0, logicalWidth / 2, logicalWidth]
  const guidesY = [0, logicalHeight / 2, logicalHeight]
  for (const other of canvas.getObjects()) {
    if (other === target) continue
    const ow = other.getScaledWidth()
    const oh = other.getScaledHeight()
    const ol = other.left ?? 0
    const ot = other.top ?? 0
    guidesX.push(ol - ow / 2, ol, ol + ow / 2)
    guidesY.push(ot - oh / 2, ot, ot + oh / 2)
  }
  const snapAxis = (value: number, size: number, guides: number[]) => {
    const points = [value - size / 2, value, value + size / 2]
    let best = value
    let bestDist = SNAP + 1
    for (const point of points) {
      for (const guide of guides) {
        const dist = Math.abs(point - guide)
        if (dist <= SNAP && dist < bestDist) {
          bestDist = dist
          best = value + (guide - point)
        }
      }
    }
    return best
  }
  target.set({
    left: snapAxis(target.left ?? 0, width, guidesX),
    top: snapAxis(target.top ?? 0, height, guidesY),
  })
}

export async function applyDocumentTheme(mood: Exclude<DesignMood, 'auto'>) {
  const state = useEditorStore.getState()
  const canvas = state.canvas
  const document = state.document
  if (!canvas || !document) return
  state.beginBatch()
  try {
    const current = serializeCanvas(canvas, document)
    const themed = applyThemeToDocument(current, mood)
    await hydrateCanvas(canvas, themed)
    state.setDocument(themed)
  } finally {
    state.endBatch()
  }
  commit()
  state.markDirty()
}
