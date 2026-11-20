# Layers, objects, shapes, and transforms

## Result

Layers, z-order, drag-and-drop of design objects, shapes, resize handles, and rotation were not observed. The editor returned HTTP 403 before any design surface loaded.

## Observations that are easy to over-read

| Observation | What it is | What it is not |
| --- | --- | --- |
| One DOM node with attribute name `data-is-layer-marker` | A marker on the public homepage DOM (`ev_1b2f968f6e70b94d4c85970e542ffc9e1ae05bc3783756e5e7348a751e392b38`) | Not a verified editor layer list |
| `draggable` on 42 elements | An HTML attribute name counted on the homepage | Not a design drag-and-drop system; no drag was performed |
| SVG `path` elements | Icons in the marketing page | Not a shape tool |
| Substring `drag` 29 times and `layer` once in `f83b12656af28bd2.js` | Undifferentiated string counts | Not call graphs; contexts were not a scene-graph API |

No WebSocket was present in the retained homepage network events. That says nothing about collaboration sockets inside the editor.

## Unresolved

- Object model (id, parent, bounds, rotation, opacity, lock).
- Hit testing and snap.
- Grouping, alignment, and z-order commands.
- Shape primitives and boolean operations.
- Copy, paste, and duplicate commands.
- Undo stack representation.
