import {
  concatTransformationMatrix,
  PDFDocument,
  popGraphicsState,
  pushGraphicsState,
  rgb,
  StandardFonts,
} from 'pdf-lib'
import {
  ActiveSelection,
  Canvas,
  Circle,
  Ellipse,
  FabricImage,
  FabricObject,
  FabricText,
  Group,
  Rect,
  util,
} from 'fabric'

function color(input: unknown) {
  const raw = String(input ?? '#111827')
  const hex = raw.trim().replace('#', '')
  const full =
    hex.length === 3
      ? hex
          .split('')
          .map((c) => c + c)
          .join('')
      : hex.slice(0, 6)
  const n = Number.parseInt(full, 16)
  if (!Number.isFinite(n) || full.length < 6) return rgb(0.1, 0.12, 0.16)
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255)
}

function leaves(objects: FabricObject[], into: FabricObject[]) {
  for (const obj of objects) {
    if (obj instanceof Group && !(obj instanceof ActiveSelection)) {
      leaves(obj.getObjects(), into)
    } else {
      into.push(obj)
    }
  }
}

function dataUrlBytes(src: string): Uint8Array | null {
  const comma = src.indexOf(',')
  if (comma < 0) return null
  const binary = atob(src.slice(comma + 1))
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
  return bytes
}

export async function exportDesignPdf(
  canvas: Canvas,
  name: string,
  pageWidth: number,
  pageHeight: number,
): Promise<Uint8Array> {
  const pdf = await PDFDocument.create()
  pdf.setTitle(name || 'Design')
  pdf.setCreator('Reverse editor')
  const page = pdf.addPage([pageWidth, pageHeight])
  const font = await pdf.embedFont(StandardFonts.Helvetica)
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold)

  const bg = String(canvas.backgroundColor ?? '#ffffff')
  page.drawRectangle({
    x: 0,
    y: 0,
    width: pageWidth,
    height: pageHeight,
    color: color(bg),
  })

  const items: FabricObject[] = []
  leaves(canvas.getObjects(), items)

  for (const obj of items) {
    const placed = util.qrDecompose(obj.calcTransformMatrix())
    const cx = placed.translateX
    const cy = pageHeight - placed.translateY
    const radians = (-placed.angle * Math.PI) / 180
    const cos = Math.cos(radians)
    const sin = Math.sin(radians)
    const opacity = obj.opacity ?? 1

    page.pushOperators(
      pushGraphicsState(),
      concatTransformationMatrix(cos, sin, -sin, cos, cx, cy),
    )

    if (obj instanceof FabricText) {
      const size = (obj.fontSize ?? 32) * Math.abs(placed.scaleX || 1)
      const weight = String(obj.fontWeight ?? '')
      const face = weight === 'bold' || Number(weight) >= 600 ? bold : font
      const lines = String(obj.text ?? '').split('\n')
      const lineHeight = size * 1.2
      const block = lineHeight * lines.length
      lines.forEach((line, index) => {
        const safe = line.replace(/[^\u0020-\u007e]/g, '?')
        const width = face.widthOfTextAtSize(safe, size)
        const align = obj.textAlign ?? 'left'
        const x =
          align === 'center' ? -width / 2 : align === 'right' ? -width : -width / 2
        page.drawText(safe, {
          x,
          y: block / 2 - lineHeight * (index + 1) + size * 0.2,
          size,
          font: face,
          color: color(obj.fill),
          opacity,
        })
      })
    } else if (obj instanceof Rect) {
      const w = (obj.width ?? 0) * Math.abs(placed.scaleX || 1)
      const h = (obj.height ?? 0) * Math.abs(placed.scaleY || 1)
      page.drawRectangle({
        x: -w / 2,
        y: -h / 2,
        width: w,
        height: h,
        color: color(obj.fill),
        opacity,
      })
    } else if (obj instanceof Ellipse || obj instanceof Circle) {
      const rx =
        obj instanceof Ellipse
          ? (obj.rx ?? 0) * Math.abs(placed.scaleX || 1)
          : (obj.radius ?? 0) * Math.abs(placed.scaleX || 1)
      const ry =
        obj instanceof Ellipse
          ? (obj.ry ?? 0) * Math.abs(placed.scaleY || 1)
          : (obj.radius ?? 0) * Math.abs(placed.scaleY || 1)
      page.drawEllipse({
        x: 0,
        y: 0,
        xScale: rx,
        yScale: ry,
        color: color(obj.fill),
        opacity,
      })
    } else if (obj instanceof FabricImage) {
      const src =
        (typeof obj.getSrc === 'function' ? obj.getSrc() : '') ||
        String(obj.get('src') ?? '')
      const bytes = src.startsWith('data:') ? dataUrlBytes(src) : null
      if (bytes) {
        try {
          const image = src.includes('image/jpeg') || src.includes('image/jpg')
            ? await pdf.embedJpg(bytes)
            : await pdf.embedPng(bytes)
          const w = (obj.width ?? image.width) * Math.abs(placed.scaleX || 1)
          const h = (obj.height ?? image.height) * Math.abs(placed.scaleY || 1)
          page.drawImage(image, {
            x: -w / 2,
            y: -h / 2,
            width: w,
            height: h,
            opacity,
          })
        } catch {
          // Skip images the PDF library cannot embed.
        }
      }
    }

    page.pushOperators(popGraphicsState())
  }

  return pdf.save()
}
