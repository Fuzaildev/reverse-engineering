import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { DesignPreview } from '../components/DesignPreview'
import { PromptStudio } from '../components/PromptStudio'
import {
  createEmptyDesign,
  templateToDesign,
  type DesignDocument,
  type TemplateCategory,
} from '../lib/designSchema'
import { deleteDesign, listDesigns, saveDesign } from '../lib/db'
import type { GeneratedDesign } from '../lib/promptDesign'
import { PRESETS, type PresetId } from '../lib/presets'
import { TEMPLATES } from '../templates'

const CATEGORIES: Array<TemplateCategory | 'all'> = [
  'all',
  'Launch',
  'Editorial',
  'Promo',
  'Quote',
  'Story',
  'Thumbnail',
  'Social',
]

export function Hub() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const searchRef = useRef<HTMLInputElement>(null)
  const [designs, setDesigns] = useState<DesignDocument[]>([])
  const [presetFilter, setPresetFilter] = useState<PresetId | 'all'>('all')
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>('all')
  const [query, setQuery] = useState('')
  const [pendingDelete, setPendingDelete] = useState<string | null>(null)

  const refresh = async () => {
    setDesigns(await listDesigns())
  }

  useEffect(() => {
    void refresh()
  }, [])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== '/' || event.metaKey || event.ctrlKey || event.altKey) return
      const target = event.target as HTMLElement | null
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return
      event.preventDefault()
      searchRef.current?.focus()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const templates = useMemo(() => {
    const q = query.trim().toLowerCase()
    return TEMPLATES.filter((template) => {
      if (presetFilter !== 'all' && template.presetId !== presetFilter) return false
      if (category !== 'all' && template.category !== category) return false
      if (!q) return true
      const preset = PRESETS.find((p) => p.id === template.presetId)?.label ?? ''
      return [template.name, template.category, template.summary, preset]
        .join(' ')
        .toLowerCase()
        .includes(q)
    })
  }, [presetFilter, category, query])

  const startBlank = async (presetId: PresetId) => {
    const preset = PRESETS.find((p) => p.id === presetId)!
    const doc = createEmptyDesign(presetId, preset.width, preset.height, `Untitled ${preset.label}`)
    await saveDesign(doc)
    navigate(`/edit/${doc.id}`)
  }

  const startTemplate = async (templateId: string) => {
    const template = TEMPLATES.find((t) => t.id === templateId)
    if (!template) return
    const doc = templateToDesign(template)
    await saveDesign(doc)
    navigate(`/edit/${doc.id}`)
  }

  const startGenerated = async (generated: GeneratedDesign) => {
    await saveDesign(generated.document)
    navigate(`/edit/${generated.document.id}`)
  }

  useEffect(() => {
    const id = params.get('template')
    if (!id) return
    let cancelled = false
    void (async () => {
      await Promise.resolve()
      const template = TEMPLATES.find((item) => item.id === id)
      if (!template || cancelled) return
      const doc = templateToDesign(template)
      await saveDesign(doc)
      if (cancelled) return
      navigate(`/edit/${doc.id}`, { replace: true })
    })()
    return () => {
      cancelled = true
    }
  }, [params, navigate])

  const remove = async (id: string) => {
    await deleteDesign(id)
    setPendingDelete(null)
    await refresh()
  }

  return (
    <div className="create">
      <header className="create-bar">
        <Link to="/" className="create-mark">
          Reverse
        </Link>
        <nav className="create-bar-meta" aria-label="Create">
          <span>{designs.length === 0 ? 'New workspace' : `${designs.length} saved`}</span>
        </nav>
      </header>

      <div className="create-body">
        <header className="create-intro">
          <p className="landing-section-kicker">Workspace</p>
          <h1>Start from a prompt or a layout.</h1>
          <p className="create-lede">
            Describe what you need, or open one of {TEMPLATES.length} art-directed templates.
            Everything stays in this browser.
          </p>
        </header>

        <PromptStudio onOpen={startGenerated} />

        <section className="create-section">
          <div className="create-section-head">
            <h2>Blank canvas</h2>
          </div>
          <div className="preset-grid">
            {PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                className="preset-card"
                data-preset={preset.id}
                onClick={() => void startBlank(preset.id)}
              >
                <div className="preset-frame" data-preset={preset.id}>
                  <span className="preset-plus" aria-hidden>
                    +
                  </span>
                  <span className="preset-ratio">{preset.description}</span>
                </div>
                <div className="preset-copy">
                  <strong>{preset.label}</strong>
                  <span className="preset-size">
                    {preset.width} × {preset.height}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </section>

        <section className="create-section">
          <div className="create-section-head">
            <div>
              <h2>Templates</h2>
              <p className="create-section-note">
                {templates.length} of {TEMPLATES.length} · press / to search
              </p>
            </div>
            <label className="template-search">
              <span className="sr-only">Search templates</span>
              <input
                ref={searchRef}
                value={query}
                placeholder="Search name, format, or use"
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>
          </div>
          <div className="filter-row" role="tablist" aria-label="Template formats">
            <button
              type="button"
              role="tab"
              aria-selected={presetFilter === 'all'}
              className={presetFilter === 'all' ? 'filter active' : 'filter'}
              onClick={() => setPresetFilter('all')}
            >
              All formats
            </button>
            {PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                role="tab"
                aria-selected={presetFilter === p.id}
                className={presetFilter === p.id ? 'filter active' : 'filter'}
                onClick={() => setPresetFilter(p.id)}
              >
                {p.label.replace('Instagram ', '').replace('YouTube ', '').replace('X / Twitter ', 'X ')}
              </button>
            ))}
          </div>
          <div className="filter-row filter-row-categories" role="tablist" aria-label="Template categories">
            {CATEGORIES.map((item) => (
              <button
                key={item}
                type="button"
                role="tab"
                aria-selected={category === item}
                className={category === item ? 'filter active' : 'filter'}
                onClick={() => setCategory(item)}
              >
                {item === 'all' ? 'All uses' : item}
              </button>
            ))}
          </div>
          {templates.length === 0 ? (
            <p className="create-empty">No templates match that search. Clear a filter and try again.</p>
          ) : (
            <div className="template-grid">
              {templates.map((template) => {
                const preset = PRESETS.find((p) => p.id === template.presetId)
                return (
                  <button
                    key={template.id}
                    type="button"
                    className="template-card"
                    data-preset={template.presetId}
                    onClick={() => void startTemplate(template.id)}
                  >
                    <div className="template-visual">
                      <DesignPreview
                        className="template-preview"
                        width={template.document.width}
                        height={template.document.height}
                        background={template.document.background}
                        objects={template.document.objects}
                        title={template.name}
                      />
                      <span className="template-open">Customize</span>
                    </div>
                    <div className="template-meta">
                      <strong>{template.name}</strong>
                      <span>
                        {template.category}
                        {preset ? ` · ${preset.label}` : ''}
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </section>

        <section className="create-section create-section-last">
          <div className="create-section-head">
            <div>
              <h2>Your designs</h2>
              <p className="create-section-note">Saved on this device. Deleting is permanent.</p>
            </div>
          </div>
          {designs.length === 0 ? (
            <div className="create-empty-card">
              <strong>Nothing saved yet</strong>
              <p>Open a blank size or customize a template. It will show up here after the first edit.</p>
            </div>
          ) : (
            <div className="design-grid">
              {designs.map((design) => (
                <article key={design.id} className="design-card">
                  <Link to={`/edit/${design.id}`} className="design-thumb-link">
                    {design.objects.length > 0 ? (
                      <DesignPreview
                        className="design-preview"
                        width={design.width}
                        height={design.height}
                        background={design.background}
                        objects={design.objects}
                        title={design.name}
                      />
                    ) : (
                      <div
                        className="design-preview design-preview-empty"
                        style={{ background: design.background }}
                      >
                        <span>Blank</span>
                      </div>
                    )}
                  </Link>
                  <div className="design-meta">
                    <strong>{design.name}</strong>
                    <span className="muted">
                      {design.width} × {design.height} · {formatUpdated(design.updatedAt)}
                    </span>
                    <div className="design-actions">
                      <Link to={`/edit/${design.id}`}>Open</Link>
                      {pendingDelete === design.id ? (
                        <button type="button" className="ghost danger" onClick={() => void remove(design.id)}>
                          Confirm delete
                        </button>
                      ) : (
                        <button type="button" className="ghost danger" onClick={() => setPendingDelete(design.id)}>
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

function formatUpdated(timestamp: number) {
  const minutes = Math.round((Date.now() - timestamp) / 60000)
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  if (days < 14) return `${days}d ago`
  return new Date(timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}
