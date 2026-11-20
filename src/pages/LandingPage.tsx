import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { DesignPreview } from '../components/DesignPreview'
import { PromptStudio } from '../components/PromptStudio'
import { saveDesign } from '../lib/db'
import type { GeneratedDesign } from '../lib/promptDesign'
import { PRESETS, type PresetId } from '../lib/presets'
import { TEMPLATES } from '../templates'

type Filter = 'all' | PresetId

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'ig-post', label: 'Post' },
  { id: 'ig-story', label: 'Story' },
  { id: 'yt-thumb', label: 'Thumbnail' },
  { id: 'x-post', label: 'X' },
]

function useSpringTilt(max = 7) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    let rx = 0
    let ry = 0
    let vx = 0
    let vy = 0
    let tx = 0
    let ty = 0
    let frame = 0

    const tick = () => {
      vx = (vx + (tx - rx) * 0.14) * 0.72
      vy = (vy + (ty - ry) * 0.14) * 0.72
      rx += vx
      ry += vy
      el.style.transform = `rotateX(${ry.toFixed(3)}deg) rotateY(${rx.toFixed(3)}deg)`
      frame = requestAnimationFrame(tick)
    }

    const onMove = (event: PointerEvent) => {
      const bounds = el.getBoundingClientRect()
      const px = (event.clientX - bounds.left) / bounds.width - 0.5
      const py = (event.clientY - bounds.top) / bounds.height - 0.5
      tx = px * max
      ty = -py * max
    }

    const onLeave = () => {
      tx = 0
      ty = 0
    }

    frame = requestAnimationFrame(tick)
    el.addEventListener('pointermove', onMove)
    el.addEventListener('pointerleave', onLeave)
    return () => {
      cancelAnimationFrame(frame)
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerleave', onLeave)
    }
  }, [max])

  return ref
}

export function LandingPage() {
  const navigate = useNavigate()
  const [filter, setFilter] = useState<Filter>('all')
  const [index, setIndex] = useState(0)
  const tiltRef = useSpringTilt(8)

  const openGenerated = async (generated: GeneratedDesign) => {
    await saveDesign(generated.document)
    navigate(`/edit/${generated.document.id}`)
  }

  const shown = useMemo(
    () => (filter === 'all' ? TEMPLATES : TEMPLATES.filter((template) => template.presetId === filter)),
    [filter],
  )

  const active = shown[index] ?? shown[0]
  const activePreset = PRESETS.find((preset) => preset.id === active?.presetId)

  const chooseFilter = (next: Filter) => {
    setFilter(next)
    setIndex(0)
  }

  const step = (delta: number) => {
    if (shown.length === 0) return
    setIndex((current) => (current + delta + shown.length) % shown.length)
  }

  return (
    <div className="landing">
      <header className="landing-nav">
        <Link to="/" className="landing-mark" aria-label="Reverse home">
          <span className="landing-mark-sq" aria-hidden>
            R
          </span>
          Reverse
        </Link>
        <nav className="landing-nav-links" aria-label="Page">
          <a href="#prompt">Prompt</a>
          <a href="#wall">Wall</a>
          <a href="#sizes">Sizes</a>
          <Link to="/create" className="landing-nav-cta">
            Open studio
          </Link>
        </nav>
      </header>

      <section className="landing-hero">
        <div className="landing-hero-copy">
          <p className="landing-kicker">Local-first studio</p>
          <h1>
            Prompt a layout,
            <em> or pick one.</em>
          </h1>
          <p className="landing-lead">
            Describe the post you need, or start from an art-directed template.
            Edit type, restyle the canvas, export PNG, JPG, or PDF — files stay here.
          </p>
          <div className="landing-cta-row">
            <a href="#prompt" className="landing-cta">
              Write a prompt
            </a>
            <Link to="/create" className="landing-cta landing-cta-quiet">
              Open studio
            </Link>
          </div>
          <p className="landing-hero-meta">
            {TEMPLATES.length} layouts · Composition Lab · prompt → DNA reflow
          </p>
        </div>

        {active ? (
          <div className="landing-stage">
            <div className="landing-stage-perspective">
              <div
                className="landing-stage-card"
                ref={tiltRef}
                tabIndex={0}
                role="region"
                aria-label={`${active.name}, ${active.category}`}
                onKeyDown={(event) => {
                  if (event.key === 'ArrowRight') step(1)
                  if (event.key === 'ArrowLeft') step(-1)
                }}
              >
                <div className="landing-stage-chrome">
                  <span className="landing-stage-dots" aria-hidden>
                    <i />
                    <i />
                    <i />
                  </span>
                  <span className="landing-stage-file">{active.name}.layout</span>
                  <span className="landing-stage-dims">
                    {active.document.width}×{active.document.height}
                  </span>
                </div>
                <div
                  className={`landing-stage-sheet${active.document.width / active.document.height > 1.05 ? ' is-wide' : ' is-tall'}`}
                  key={`${active.id}-${index}`}
                >
                  <DesignPreview
                    className="landing-stage-preview"
                    fit="meet"
                    width={active.document.width}
                    height={active.document.height}
                    background={active.document.background}
                    objects={active.document.objects}
                    title={active.name}
                  />
                </div>
                <div className="landing-stage-foot">
                  <button type="button" className="landing-stage-step" onClick={() => step(-1)} aria-label="Previous layout">
                    ←
                  </button>
                  <div>
                    <strong>{active.name}</strong>
                    <span>
                      {active.category}
                      {activePreset ? ` · ${activePreset.label}` : ''}
                    </span>
                  </div>
                  <button type="button" className="landing-stage-step" onClick={() => step(1)} aria-label="Next layout">
                    →
                  </button>
                  <Link to={`/create?template=${active.id}`} className="landing-stage-edit">
                    Edit
                  </Link>
                </div>
              </div>
            </div>

            <div className="landing-rail" role="listbox" aria-label="Layouts in view">
              {shown.map((template, itemIndex) => (
                <button
                  key={template.id}
                  type="button"
                  role="option"
                  aria-selected={itemIndex === index}
                  aria-label={template.name}
                  className={itemIndex === index ? 'is-active' : undefined}
                  onClick={() => setIndex(itemIndex)}
                >
                  <DesignPreview
                    width={template.document.width}
                    height={template.document.height}
                    background={template.document.background}
                    objects={template.document.objects}
                    title=""
                  />
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </section>

      <section className="landing-prompt" id="prompt">
        <PromptStudio onOpen={openGenerated} />
      </section>

      <section className="landing-wall" id="wall">
        <div className="landing-wall-head">
          <div>
            <p className="landing-kicker">The wall</p>
            <h2>Every layout is a file you can finish.</h2>
          </div>
          <Link to="/create" className="landing-text-link">
            Browse all {TEMPLATES.length}
          </Link>
        </div>

        <div className="landing-filters" role="toolbar" aria-label="Filter layouts">
          {FILTERS.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-pressed={filter === item.id}
              className={filter === item.id ? 'is-active' : undefined}
              onClick={() => chooseFilter(item.id)}
            >
              {item.label}
            </button>
          ))}
          <span className="landing-filter-count">
            {shown.length} showing
          </span>
        </div>

        <div className="landing-wall-grid">
          {shown.map((template, itemIndex) => {
            const preset = PRESETS.find((item) => item.id === template.presetId)
            return (
              <Link
                key={template.id}
                to={`/create?template=${template.id}`}
                className="landing-wall-card"
                data-preset={template.presetId}
                style={{ animationDelay: `${Math.min(itemIndex, 8) * 45}ms` }}
              >
                <DesignPreview
                  className="landing-wall-preview"
                  width={template.document.width}
                  height={template.document.height}
                  background={template.document.background}
                  objects={template.document.objects}
                  title={template.name}
                />
                <div className="landing-wall-meta">
                  <strong>{template.name}</strong>
                  <span>
                    {template.category}
                    {preset ? ` · ${preset.width}×${preset.height}` : ''}
                  </span>
                  <em>Edit</em>
                </div>
              </Link>
            )
          })}
        </div>
      </section>

      <section className="landing-sizes" id="sizes">
        <div className="landing-wall-head">
          <div>
            <p className="landing-kicker">Sizes</p>
            <h2>Four canvases. Real pixels.</h2>
          </div>
          <Link to="/create" className="landing-text-link">
            Start blank
          </Link>
        </div>
        <ul>
          {PRESETS.map((preset) => (
            <li key={preset.id}>
              <Link to="/create" data-preset={preset.id}>
                <span className="landing-size-frame" aria-hidden>
                  <b>{preset.description}</b>
                </span>
                <strong>{preset.label}</strong>
                <em>
                  {preset.width} × {preset.height}
                </em>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="landing-close">
        <div>
          <p className="landing-kicker">On this machine</p>
          <h2>Open the studio.</h2>
          <p>Designs stay in this browser. Nothing is uploaded.</p>
        </div>
        <Link to="/create" className="landing-cta">
          Get started
        </Link>
      </section>

      <footer className="landing-footer">
        <span>Reverse</span>
        <span className="landing-footer-meta">MIT · Local-first · {TEMPLATES.length} templates</span>
      </footer>
    </div>
  )
}
