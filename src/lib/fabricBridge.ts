import {
  Canvas,
  Circle,
  Ellipse,
  FabricImage,
  FabricObject,
  FabricText,
  Group,
  Rect,
  Shadow,
  util,
} from 'fabric'
import type { BlendMode, DesignDocument, DesignObject, LayerShadow } from './designSchema'
import { FONT_SANS } from './fonts'

FabricObject.customProperties = ['ocId', 'ocType', 'ocLocked', 'ocRole', 'ocName']

function uid(): string {
  return crypto.randomUUID()
}

function isFabricObject(value: object): value is FabricObject {
  return 'set' in value && 'canvas' in value
}

export function applyBackground(canvas: Canvas, color: string) {
  canvas.backgroundColor = color
  canvas.requestRenderAll()
}

export function remeasureText(canvas: Canvas) {
  const visit = (obj: FabricObject) => {
    if (obj instanceof FabricText) {
      obj.initDimensions()
      obj.setCoords()
    }
    if (obj instanceof Group) obj.forEachObject(visit)
  }
  canvas.forEachObject(visit)
  canvas.requestRenderAll()
}

export function applyLock(obj: FabricObject, locked: boolean) {
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

export async function hydrateCanvas(
  canvas: Canvas,
  doc: DesignDocument,
): Promise<void> {
  canvas.clear()
  canvas.setDimensions({ width: doc.width, height: doc.height })
  applyBackground(canvas, doc.background)

  const created = await Promise.all(
    doc.objects.map((obj) => designObjectToFabric(obj)),
  )
  for (const fabricObj of created) {
    if (fabricObj) canvas.add(fabricObj)
  }
  canvas.requestRenderAll()
}

export async function designObjectToFabric(
  obj: DesignObject,
): Promise<FabricObject | null> {
  if (obj.type === 'group') {
    try {
      const [enlivened] = await util.enlivenObjects([obj.snapshot])
      if (!enlivened || !isFabricObject(enlivened)) return null
      enlivened.set({
        ocId: obj.id,
        ocType: 'group',
        ocRole: obj.role ?? 'auto',
        ocName: obj.name ?? '',
        visible: obj.visible !== false,
        globalCompositeOperation: obj.blendMode ?? 'source-over',
      })
      applyEffects(enlivened, obj)
      applyLock(enlivened, Boolean(obj.locked))
      return enlivened
    } catch {
      return null
    }
  }

  const common = {
    left: obj.left,
    top: obj.top,
    angle: obj.angle ?? 0,
    opacity: obj.opacity ?? 1,
    visible: obj.visible !== false,
    ocId: obj.id,
    ocType: obj.type,
    ocRole: obj.role ?? 'auto',
    ocName: obj.name ?? '',
    globalCompositeOperation: obj.blendMode ?? 'source-over',
    stroke: obj.stroke,
    strokeWidth: obj.strokeWidth ?? 0,
  }

  let fabricObj: FabricObject | null = null

  switch (obj.type) {
    case 'text': {
      const align = obj.textAlign ?? 'left'
      fabricObj = new FabricText(obj.text, {
        ...common,
        originX: align === 'center' ? 'center' : align === 'right' ? 'right' : 'left',
        originY: 'top',
        fontSize: obj.fontSize,
        fontFamily: obj.fontFamily ?? FONT_SANS,
        fontWeight: obj.fontWeight ?? 'normal',
        fill: obj.fill,
        textAlign: align,
      })
      break
    }
    case 'rect':
      fabricObj = new Rect({
        ...common,
        originX: 'center',
        originY: 'center',
        width: obj.width,
        height: obj.height,
        fill: obj.fill,
        rx: obj.rx ?? 0,
        ry: obj.ry ?? 0,
      })
      break
    case 'circle':
      fabricObj = new Circle({
        ...common,
        originX: 'center',
        originY: 'center',
        radius: obj.radius,
        fill: obj.fill,
      })
      break
    case 'ellipse':
      fabricObj = new Ellipse({
        ...common,
        originX: 'center',
        originY: 'center',
        rx: obj.rx,
        ry: obj.ry,
        fill: obj.fill,
      })
      break
    case 'image': {
      try {
        const img = await FabricImage.fromURL(obj.src, {
          crossOrigin: 'anonymous',
        })
        img.set({
          ...common,
          originX: 'center',
          originY: 'center',
          scaleX: obj.scaleX ?? 1,
          scaleY: obj.scaleY ?? 1,
        })
        fabricObj = img
      } catch {
        return null
      }
      break
    }
    default:
      return null
  }

  if (fabricObj) {
    applyEffects(fabricObj, obj)
    applyLock(fabricObj, Boolean(obj.locked))
  }
  return fabricObj
}

function applyEffects(fabricObj: FabricObject, obj: DesignObject) {
  if (obj.shadow) {
    fabricObj.set(
      'shadow',
      new Shadow({
        color: obj.shadow.color,
        blur: obj.shadow.blur,
        offsetX: obj.shadow.offsetX,
        offsetY: obj.shadow.offsetY,
      }),
    )
  } else {
    fabricObj.set('shadow', null)
  }
}

function readShadow(obj: FabricObject): LayerShadow | null {
  const shadow = obj.shadow as Shadow | null | undefined
  if (!shadow) return null
  return {
    color: String(shadow.color ?? 'rgba(0,0,0,0.35)'),
    blur: shadow.blur ?? 0,
    offsetX: shadow.offsetX ?? 0,
    offsetY: shadow.offsetY ?? 0,
  }
}

export function fabricToDesignObject(obj: FabricObject): DesignObject | null {
  if (obj instanceof Group) {
    return {
      id: (obj.get('ocId') as string) || uid(),
      type: 'group',
      left: obj.left ?? 0,
      top: obj.top ?? 0,
      angle: obj.angle ?? 0,
      opacity: obj.opacity ?? 1,
      locked: Boolean(obj.get('ocLocked')),
      visible: obj.visible !== false,
      name: String(obj.get('ocName') ?? ''),
      role: (obj.get('ocRole') as DesignObject['role']) || 'auto',
      blendMode: (obj.globalCompositeOperation as BlendMode) || 'source-over',
      shadow: readShadow(obj),
      snapshot: obj.toObject() as unknown as Record<string, unknown>,
    }
  }

  const ocId = (obj.get('ocId') as string) || uid()
  const ocType = obj.get('ocType') as DesignObject['type'] | undefined
  const left = obj.left ?? 0
  const top = obj.top ?? 0
  const angle = obj.angle ?? 0
  const opacity = obj.opacity ?? 1
  const locked = Boolean(obj.get('ocLocked'))
  const role = (obj.get('ocRole') as DesignObject['role']) || 'auto'
  const base = {
    id: ocId,
    left,
    top,
    angle,
    opacity,
    locked,
    role,
    visible: obj.visible !== false,
    name: String(obj.get('ocName') ?? ''),
    blendMode: (obj.globalCompositeOperation as BlendMode) || 'source-over',
    shadow: readShadow(obj),
    stroke: typeof obj.stroke === 'string' ? obj.stroke : undefined,
    strokeWidth: obj.strokeWidth ?? 0,
  }

  if (obj instanceof FabricText || ocType === 'text') {
    const t = obj as FabricText
    return {
      ...base,
      type: 'text',
      text: t.text ?? '',
      fontSize: t.fontSize ?? 32,
      fontFamily: t.fontFamily,
      fontWeight: t.fontWeight,
      fill: String(t.fill ?? '#000000'),
      textAlign: (t.textAlign as 'left' | 'center' | 'right') ?? 'left',
    }
  }

  if (obj instanceof Rect || ocType === 'rect') {
    const r = obj as Rect
    return {
      ...base,
      type: 'rect',
      width: (r.width ?? 0) * (r.scaleX ?? 1),
      height: (r.height ?? 0) * (r.scaleY ?? 1),
      fill: String(r.fill ?? '#cccccc'),
      rx: r.rx,
      ry: r.ry,
    }
  }

  if (obj instanceof Ellipse || ocType === 'ellipse') {
    const e = obj as Ellipse
    return {
      ...base,
      type: 'ellipse',
      rx: (e.rx ?? 0) * (e.scaleX ?? 1),
      ry: (e.ry ?? 0) * (e.scaleY ?? 1),
      fill: String(e.fill ?? '#cccccc'),
    }
  }

  if (obj instanceof Circle || ocType === 'circle') {
    const c = obj as Circle
    return {
      ...base,
      type: 'circle',
      radius: (c.radius ?? 0) * (c.scaleX ?? 1),
      fill: String(c.fill ?? '#cccccc'),
    }
  }

  if (obj instanceof FabricImage || ocType === 'image') {
    const img = obj as FabricImage
    const src =
      (typeof img.getSrc === 'function' ? img.getSrc() : '') ||
      (img.get('src') as string) ||
      ''
    if (!src) return null
    return {
      ...base,
      type: 'image',
      src,
      scaleX: img.scaleX ?? 1,
      scaleY: img.scaleY ?? 1,
    }
  }

  return null
}

export function serializeCanvas(
  canvas: Canvas,
  base: DesignDocument,
): DesignDocument {
  const objects: DesignObject[] = []
  for (const obj of canvas.getObjects()) {
    const design = fabricToDesignObject(obj)
    if (design) objects.push(design)
  }

  return {
    ...base,
    background: String(canvas.backgroundColor ?? base.background),
    width: base.width,
    height: base.height,
    objects,
    updatedAt: Date.now(),
  }
}

export function exportDataUrl(
  canvas: Canvas,
  format: 'png' | 'jpeg',
  multiplier: number,
  logicalWidth: number,
): string {
  const pixelWidth = canvas.getWidth() || logicalWidth
  const fit = logicalWidth / pixelWidth
  return canvas.toDataURL({
    format,
    multiplier: multiplier * fit,
    quality: format === 'jpeg' ? 0.92 : 1,
  })
}

export function downloadDataUrl(dataUrl: string, filename: string) {
  const a = document.createElement('a')
  a.href = dataUrl
  a.download = filename
  a.click()
}

export function downloadBytes(bytes: Uint8Array, filename: string, mime: string) {
  const copy = new Uint8Array(bytes.byteLength)
  copy.set(bytes)
  const blob = new Blob([copy], { type: mime })
  const url = URL.createObjectURL(blob)
  downloadDataUrl(url, filename)
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
