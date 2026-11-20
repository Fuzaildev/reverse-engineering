import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { FabricCanvas } from '../canvas/FabricCanvas'
import { CommandPalette } from '../components/CommandPalette'
import { CompositionLab } from '../components/CompositionLab'
import { Inspector } from '../components/Inspector'
import { LayersPanel } from '../components/LayersPanel'
import { TemplateStudio } from '../components/TemplateStudio'
import { Toolbar } from '../components/Toolbar'
import type { DesignDocument } from '../lib/designSchema'
import { getDesign } from '../lib/db'
import { useEditorStore } from '../store/editorStore'

export function EditorPage() {
  const { id } = useParams()
  const [design, setDesign] = useState<DesignDocument | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [findOpen, setFindOpen] = useState(false)
  const setDocument = useEditorStore((s) => s.setDocument)

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const meta = event.ctrlKey || event.metaKey
      if (meta && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setFindOpen(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    let alive = true
    const load = async () => {
      if (!id) {
        setError('Missing design id')
        return
      }
      const doc = await getDesign(id)
      if (!alive) return
      if (!doc) {
        setError('Design not found')
        return
      }
      setDesign(doc)
      setDocument(doc)
    }
    void load()
    return () => {
      alive = false
      setDocument(null)
    }
  }, [id, setDocument])

  if (error) {
    return (
      <div className="loading-shell">
        <div className="loading-panel">
          <h1>{error}</h1>
          <Link to="/create" className="landing-cta">
            Back to create
          </Link>
        </div>
      </div>
    )
  }

  if (!design) {
    return (
      <div className="loading-shell">
        <p>Loading design…</p>
      </div>
    )
  }

  return (
    <div className="editor-shell">
      <Toolbar onFind={() => setFindOpen(true)} />
      <div className="editor-body">
        <main className="editor-main">
          <FabricCanvas design={design} />
        </main>
        <aside className="side-panel">
          <TemplateStudio />
          <CompositionLab />
          <Inspector />
          <LayersPanel />
        </aside>
      </div>
      <CommandPalette open={findOpen} onClose={() => setFindOpen(false)} />
    </div>
  )
}
