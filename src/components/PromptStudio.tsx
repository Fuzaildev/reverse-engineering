import { useMemo, useState } from 'react'
import { DesignPreview } from './DesignPreview'
import {
  EXAMPLE_PROMPTS,
  MOOD_OPTIONS,
  generateDesignsFromPrompt,
  type DesignMood,
  type GeneratedDesign,
} from '../lib/promptDesign'
import { PRESETS, type PresetId } from '../lib/presets'

type FormatFilter = PresetId | 'all'

interface PromptStudioProps {
  onOpen: (generated: GeneratedDesign) => void | Promise<void>
  compact?: boolean
  initialPrompt?: string
}

export function PromptStudio({ onOpen, compact = false, initialPrompt = '' }: PromptStudioProps) {
  const [prompt, setPrompt] = useState(initialPrompt)
  const [format, setFormat] = useState<FormatFilter>('all')
  const [mood, setMood] = useState<DesignMood>('auto')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [results, setResults] = useState<GeneratedDesign[]>([])
  const [intentLabel, setIntentLabel] = useState('')

  const wordCount = useMemo(
    () => prompt.trim().split(/\s+/).filter(Boolean).length,
    [prompt],
  )

  const generate = async (nextPrompt = prompt) => {
    const trimmed = nextPrompt.trim()
    if (trimmed.split(/\s+/).filter(Boolean).length < 3) {
      setError('Use at least 3 words so the generator can pick a format and rewrite the layout.')
      return
    }
    setBusy(true)
    setError(null)
    // Brief delay so the UI feels like a generation pass.
    await new Promise((resolve) => setTimeout(resolve, 280))
    const { intent, results: next } = generateDesignsFromPrompt(trimmed, {
      presetId: format,
      mood,
      limit: compact ? 4 : 6,
    })
    setResults(next)
    setIntentLabel(
      `${PRESETS.find((p) => p.id === intent.presetId)?.label ?? intent.presetId} · ${
        intent.category === 'all' ? 'mixed uses' : intent.category
      }${intent.mood !== 'auto' ? ` · ${intent.mood}` : ''}`,
    )
    setBusy(false)
  }

  return (
    <section className={`prompt-studio${compact ? ' is-compact' : ''}`}>
      <div className="prompt-studio-head">
        <div>
          <p className="landing-kicker">Magic layout</p>
          <h2>{compact ? 'Describe a design' : 'Write a prompt. Get layouts.'}</h2>
          <p className="prompt-studio-lede">
            Local Magic Design: your words pick a format, theme, and copy, then reshape ready
            templates you can open and edit.
          </p>
        </div>
      </div>

      <form
        className="prompt-studio-form"
        onSubmit={(event) => {
          event.preventDefault()
          void generate()
        }}
      >
        <label className="prompt-studio-field">
          <span className="sr-only">Design prompt</span>
          <textarea
            rows={compact ? 2 : 3}
            value={prompt}
            placeholder="Use 5+ words — e.g. Instagram post announcing a spring coffee menu launch"
            onChange={(event) => setPrompt(event.target.value)}
          />
          <span className="prompt-studio-count">{wordCount} words</span>
        </label>

        <div className="prompt-studio-controls">
          <div className="filter-row" role="group" aria-label="Format">
            <button
              type="button"
              className={format === 'all' ? 'filter active' : 'filter'}
              onClick={() => setFormat('all')}
            >
              Auto size
            </button>
            {PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                className={format === preset.id ? 'filter active' : 'filter'}
                onClick={() => setFormat(preset.id)}
              >
                {preset.label.replace('Instagram ', '').replace('YouTube ', '').replace('X / Twitter ', 'X ')}
              </button>
            ))}
          </div>
          <div className="filter-row" role="group" aria-label="Mood">
            {MOOD_OPTIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                className={mood === option.id ? 'filter active' : 'filter'}
                onClick={() => setMood(option.id)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="prompt-studio-actions">
          <button type="submit" className="prompt-studio-generate" disabled={busy}>
            {busy ? 'Generating…' : 'Generate designs'}
          </button>
          {results.length > 0 ? (
            <button
              type="button"
              className="ghost"
              disabled={busy}
              onClick={() => void generate()}
            >
              Regenerate
            </button>
          ) : null}
        </div>
      </form>

      <div className="prompt-examples" aria-label="Example prompts">
        {EXAMPLE_PROMPTS.map((example) => (
          <button
            key={example}
            type="button"
            className="prompt-example"
            onClick={() => {
              setPrompt(example)
              void generate(example)
            }}
          >
            {example}
          </button>
        ))}
      </div>

      {error ? <p className="prompt-studio-error">{error}</p> : null}

      {results.length > 0 ? (
        <div className="prompt-results">
          <div className="prompt-results-head">
            <strong>{results.length} layouts</strong>
            <span>{intentLabel}</span>
          </div>
          <div className="prompt-results-grid">
            {results.map((item) => (
              <button
                key={item.id}
                type="button"
                className="prompt-result-card"
                onClick={() => void onOpen(item)}
              >
                <div className="prompt-result-visual">
                  <DesignPreview
                    className="prompt-result-preview"
                    width={item.document.width}
                    height={item.document.height}
                    background={item.document.background}
                    objects={item.document.objects}
                    title={item.name}
                  />
                  <span className="template-open">Open</span>
                </div>
                <div className="prompt-result-meta">
                  <strong>{item.name}</strong>
                  <span>{item.reason}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  )
}
