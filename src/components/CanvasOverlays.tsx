import { useMemo } from 'react'
import { analyzeBalance, extractDNA } from '../lib/compositionLab'
import { serializeCanvas } from '../lib/fabricBridge'
import { useEditorStore } from '../store/editorStore'

/** Optical balance radar + Haunt ghost over the live canvas. */
export function CanvasOverlays() {
  const canvas = useEditorStore((s) => s.canvas)
  const document = useEditorStore((s) => s.document)
  const zoom = useEditorStore((s) => s.zoom)
  const balanceVisible = useEditorStore((s) => s.balanceVisible)
  const hauntDataUrl = useEditorStore((s) => s.hauntDataUrl)
  const dirty = useEditorStore((s) => s.dirty)
  const layers = useEditorStore((s) => s.layers)

  const report = useMemo(() => {
    if (!canvas || !document) return null
    void dirty
    void layers
    const doc = serializeCanvas(canvas, document)
    return { balance: analyzeBalance(doc), dna: extractDNA(doc), doc }
  }, [canvas, document, dirty, layers])

  if (!document) return null

  const w = document.width * zoom
  const h = document.height * zoom

  return (
    <div className="canvas-overlays" style={{ width: w, height: h }} aria-hidden>
      {hauntDataUrl ? (
        <img className="haunt-ghost" src={hauntDataUrl} alt="" draggable={false} />
      ) : null}

      {balanceVisible && report ? (
        <svg className="balance-radar" viewBox={`0 0 ${document.width} ${document.height}`}>
          <defs>
            <radialGradient id="massGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="rgba(11, 110, 79, 0.35)" />
              <stop offset="100%" stopColor="rgba(11, 110, 79, 0)" />
            </radialGradient>
          </defs>
          {/* Safe margin */}
          <rect
            x={document.width * 0.06}
            y={document.height * 0.06}
            width={document.width * 0.88}
            height={document.height * 0.88}
            fill="none"
            stroke="rgba(243,241,236,0.22)"
            strokeDasharray="10 8"
            strokeWidth={2}
          />
          {/* Visual center */}
          <circle
            cx={document.width * 0.5}
            cy={document.height * 0.48}
            r={10}
            fill="none"
            stroke="rgba(243,241,236,0.45)"
            strokeWidth={2}
          />
          {/* Optical mass */}
          <circle
            cx={report.balance.cx * document.width}
            cy={report.balance.cy * document.height}
            r={Math.max(document.width, document.height) * 0.08}
            fill="url(#massGlow)"
          />
          <circle
            cx={report.balance.cx * document.width}
            cy={report.balance.cy * document.height}
            r={7}
            fill="#b8f255"
          />
          <line
            x1={document.width * 0.5}
            y1={document.height * 0.48}
            x2={report.balance.cx * document.width}
            y2={report.balance.cy * document.height}
            stroke="#b8f255"
            strokeWidth={2}
            strokeDasharray="6 5"
            opacity={0.85}
          />
          {report.dna.genes.map((gene) => (
            <g key={gene.id} opacity={0.55}>
              <rect
                x={gene.nx * document.width - (gene.nw * document.width) / 2}
                y={gene.ny * document.height - (gene.nh * document.height) / 2}
                width={Math.max(8, gene.nw * document.width)}
                height={Math.max(8, gene.nh * document.height)}
                fill="none"
                stroke={roleColor(gene.role)}
                strokeWidth={2}
              />
            </g>
          ))}
          <text
            x={24}
            y={36}
            fill="#b8f255"
            fontSize={22}
            fontFamily="IBM Plex Sans, sans-serif"
            fontWeight={700}
          >
            {report.balance.score} · {report.balance.fitLabel}
          </text>
        </svg>
      ) : null}
    </div>
  )
}

function roleColor(role: string) {
  switch (role) {
    case 'headline':
      return '#f6c177'
    case 'kicker':
      return '#7dd3c0'
    case 'cta':
      return '#f07178'
    case 'subhead':
      return '#c3a6ff'
    case 'accent':
      return '#5ccfe6'
    case 'frame':
      return '#a6acb9'
    case 'media':
      return '#ffd580'
    default:
      return '#d4d4d4'
  }
}
