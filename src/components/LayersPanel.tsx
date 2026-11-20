import { ActiveSelection } from 'fabric'
import {
  bringToFront,
  renameLayer,
  sendToBack,
  setLayerVisible,
} from '../lib/advancedEdit'
import { useEditorStore } from '../store/editorStore'

const EMPTY_IDS: string[] = []

export function LayersPanel() {
  const canvas = useEditorStore((s) => s.canvas)
  const layers = useEditorStore((s) => s.layers)
  const selection = useEditorStore((s) => s.selection)
  const selected = selection?.ids ?? EMPTY_IDS

  const selectLayer = (index: number, additive: boolean) => {
    if (!canvas) return
    const obj = canvas.getObjects()[index]
    if (!obj) return
    if (additive) {
      const current = canvas.getActiveObjects()
      const next = current.includes(obj)
        ? current.filter((item) => item !== obj)
        : [...current, obj]
      if (next.length === 0) canvas.discardActiveObject()
      else if (next.length === 1) canvas.setActiveObject(next[0])
      else canvas.setActiveObject(new ActiveSelection(next, { canvas }))
    } else {
      canvas.setActiveObject(obj)
    }
    canvas.requestRenderAll()
    useEditorStore.getState().history?.syncSelection()
  }

  const move = (index: number, dir: -1 | 1) => {
    if (!canvas) return
    const objects = canvas.getObjects()
    const obj = objects[index]
    const swapWith = objects[index + dir]
    if (!obj || !swapWith) return
    if (dir === 1) canvas.bringObjectForward(obj)
    else canvas.sendObjectBackwards(obj)
    canvas.requestRenderAll()
    useEditorStore.getState().history?.commit()
  }

  return (
    <section className="layers">
      <h2>Layers</h2>
      <div className="layer-z-actions">
        <button type="button" onClick={() => bringToFront()}>
          Front
        </button>
        <button type="button" onClick={() => sendToBack()}>
          Back
        </button>
      </div>
      {layers.length === 0 ? (
        <p className="muted">No objects yet. Add text or shapes.</p>
      ) : (
        <ul className="layer-list">
          {layers.map((layer) => (
            <li key={layer.id} className={layer.visible ? undefined : 'is-hidden'}>
              <button
                type="button"
                className="layer-vis"
                title={layer.visible ? 'Hide' : 'Show'}
                onClick={() => setLayerVisible(layer.index, !layer.visible)}
              >
                {layer.visible ? '◉' : '◎'}
              </button>
              <button
                type="button"
                className={
                  selected.includes(layer.id) ? 'layer-name active' : 'layer-name'
                }
                onClick={(event) => selectLayer(layer.index, event.shiftKey)}
                onDoubleClick={() => {
                  const next = window.prompt('Layer name', layer.label)
                  if (next != null) renameLayer(layer.index, next.trim())
                }}
              >
                <span className={`role-dot role-${layer.role}`} title={layer.role} />
                <span className="layer-label-text">{layer.label}</span>
              </button>
              <div className="layer-actions">
                <button
                  type="button"
                  title="Bring forward"
                  onClick={() => move(layer.index, 1)}
                >
                  ↑
                </button>
                <button
                  type="button"
                  title="Send backward"
                  onClick={() => move(layer.index, -1)}
                >
                  ↓
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <p className="hint">
        <kbd>Ctrl</kbd> <kbd>K</kbd> Find · arrows nudge · <kbd>Shift</kbd> arrows ×10 ·{' '}
        <kbd>Ctrl</kbd> <kbd>Shift</kbd> <kbd>C</kbd>/<kbd>V</kbd> style. Double-click layer to
        rename.
      </p>
    </section>
  )
}
