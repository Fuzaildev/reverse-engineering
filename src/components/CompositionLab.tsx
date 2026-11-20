import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  analyzeBalance,
  annotateDocumentRoles,
  buildReflowPack,
  extractDNA,
  inventHierarchyTwin,
  loadDNAFromClipboard,
  saveDNAToClipboard,
  transplantDNA,
  type CompositionDNA,
} from '../lib/compositionLab'
import { saveDesign } from '../lib/db'
import { exportDataUrl, hydrateCanvas, serializeCanvas } from '../lib/fabricBridge'
import { useEditorStore } from '../store/editorStore'

export function CompositionLab() {
  const navigate = useNavigate()
  const canvas = useEditorStore((s) => s.canvas)
  const document = useEditorStore((s) => s.document)
  const balanceVisible = useEditorStore((s) => s.balanceVisible)
  const hauntDataUrl = useEditorStore((s) => s.hauntDataUrl)
  const setBalanceVisible = useEditorStore((s) => s.setBalanceVisible)
  const setHauntDataUrl = useEditorStore((s) => s.setHauntDataUrl)
  const setDocument = useEditorStore((s) => s.setDocument)
  const markDirty = useEditorStore((s) => s.markDirty)
  const beginBatch = useEditorStore((s) => s.beginBatch)
  const endBatch = useEditorStore((s) => s.endBatch)
  const history = useEditorStore((s) => s.history)
  const [savedDNA, setSavedDNA] = useState<CompositionDNA | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    setSavedDNA(loadDNAFromClipboard())
  }, [])

  useEffect(() => {
    if (!canvas) return
    const bump = () => setTick((n) => n + 1)
    canvas.on('object:modified', bump)
    canvas.on('object:added', bump)
    canvas.on('object:removed', bump)
    return () => {
      canvas.off('object:modified', bump)
      canvas.off('object:added', bump)
      canvas.off('object:removed', bump)
    }
  }, [canvas])

  const live = useMemo(() => {
    if (!canvas || !document) return null
    void tick
    const doc = serializeCanvas(canvas, document)
    const dna = extractDNA(doc)
    return { doc, dna, balance: analyzeBalance(doc) }
  }, [canvas, document, tick])

  const replaceOnCanvas = async (nextDoc: typeof document) => {
    if (!canvas || !nextDoc) return
    beginBatch()
    try {
      await hydrateCanvas(canvas, nextDoc)
      setDocument(nextDoc)
      markDirty()
    } finally {
      endBatch()
    }
    history?.commit()
    history?.syncSelection()
  }

  const captureHaunt = () => {
    if (!canvas || !document) return
    const url = exportDataUrl(canvas, 'png', 1, document.width)
    setHauntDataUrl(url)
    setStatus('Haunt locked — ghost of this frame sits under the canvas.')
  }

  const copyDNA = () => {
    if (!live) return
    saveDNAToClipboard(live.dna)
    setSavedDNA(live.dna)
    setStatus(`DNA copied · ${live.dna.genes.length} genes · score ${live.balance.score}`)
  }

  const autoRoles = async () => {
    if (!canvas || !document) return
    const current = serializeCanvas(canvas, document)
    const next = annotateDocumentRoles(current)
    await replaceOnCanvas(next)
    setStatus('Roles inferred from type, size, and position.')
  }

  const reflowPack = async () => {
    if (!canvas || !document) return
    setBusy(true)
    setStatus('Building Reflow Pack…')
    try {
      await useEditorStore.getState().persist()
      const current = serializeCanvas(canvas, document)
      const pack = buildReflowPack(current)
      for (const variant of pack.variants) {
        await saveDesign(variant)
      }
      setStatus(
        `Reflow Pack saved · ${pack.variants.length} sizes. Opening the first variant.`,
      )
      if (pack.variants[0]) navigate(`/edit/${pack.variants[0].id}`)
    } finally {
      setBusy(false)
    }
  }

  const twin = async () => {
    if (!canvas || !document) return
    const current = serializeCanvas(canvas, document)
    const next = inventHierarchyTwin(current)
    await saveDesign(next)
    setStatus('Hierarchy Twin saved — inverted weight + mirrored accents.')
    navigate(`/edit/${next.id}`)
  }

  const applyDNA = async () => {
    const dna = loadDNAFromClipboard()
    if (!dna || !canvas || !document) {
      setStatus('No DNA on this device yet. Copy DNA from a design first.')
      return
    }
    const current = serializeCanvas(canvas, document)
    const next = transplantDNA(dna, current)
    await replaceOnCanvas(next)
    setStatus('Structure transplant complete — DNA layout, your copy.')
  }

  if (!document || !live) {
    return (
      <section className="comp-lab">
        <h2>Composition Lab</h2>
        <p className="muted">Open a design to read its DNA.</p>
      </section>
    )
  }

  return (
    <section className="comp-lab">
      <h2>Composition Lab</h2>
      <p className="comp-lab-lede">
        Unique local engine: optical balance, portable Composition DNA, multi-size Reflow Pack,
        Haunt ghosts, and hierarchy twins — no cloud model.
      </p>

      <div className="balance-card" data-score={live.balance.score}>
        <div className="balance-score">
          <strong>{live.balance.score}</strong>
          <span>Fit</span>
        </div>
        <div className="balance-meta">
          <em>{live.balance.fitLabel}</em>
          <span>
            Mass {live.balance.biasX}/{live.balance.biasY} · contrast{' '}
            {Math.round(live.balance.contrast * 100)}% · margin{' '}
            {Math.round(live.balance.safeMargin * 100)}%
          </span>
        </div>
      </div>

      <div className="comp-lab-actions">
        <button type="button" className="comp-lab-primary" disabled={busy} onClick={() => void reflowPack()}>
          {busy ? 'Packing…' : 'Reflow Pack'}
        </button>
        <button type="button" onClick={() => void twin()}>
          Hierarchy Twin
        </button>
        <button type="button" onClick={copyDNA}>
          Copy DNA
        </button>
        <button type="button" onClick={() => void applyDNA()} disabled={!savedDNA}>
          Transplant DNA
        </button>
        <button type="button" onClick={() => void autoRoles()}>
          Infer roles
        </button>
        <button type="button" onClick={captureHaunt}>
          {hauntDataUrl ? 'Refresh Haunt' : 'Haunt frame'}
        </button>
        {hauntDataUrl ? (
          <button type="button" className="ghost" onClick={() => setHauntDataUrl(null)}>
            Clear Haunt
          </button>
        ) : null}
        <button
          type="button"
          className={balanceVisible ? 'active-toggle' : undefined}
          onClick={() => setBalanceVisible(!balanceVisible)}
        >
          {balanceVisible ? 'Hide radar' : 'Show radar'}
        </button>
      </div>

      <ul className="dna-genes">
        {live.dna.genes.slice(0, 8).map((gene) => (
          <li key={gene.id}>
            <span className={`role-pill role-${gene.role}`}>{gene.role}</span>
            <span>
              {gene.type}
              {gene.text ? ` · ${gene.text.slice(0, 22)}` : ''}
            </span>
            <em>{Math.round(gene.mass * 1000)}</em>
          </li>
        ))}
      </ul>

      {savedDNA ? (
        <p className="comp-lab-dna-note">
          Clipboard DNA: <strong>{savedDNA.name}</strong> · {savedDNA.genes.length} genes ·{' '}
          {savedDNA.width}×{savedDNA.height}
        </p>
      ) : (
        <p className="comp-lab-dna-note">No DNA stored on this device yet.</p>
      )}

      {status ? <p className="comp-lab-status">{status}</p> : null}
    </section>
  )
}
