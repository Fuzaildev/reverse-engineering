# Independent implementation plan

This is a proposal for a new design editor. It is not a reconstruction of Canva. The logged-in editor was not observable (HTTP 403 on `/design/`). Nothing here copies Canva source, asset URLs, or private APIs.

Where a choice is informed by a verified fact, the fact is named. Where Canva’s mechanism is unknown, the choice is a design decision for the new application.

## Product boundary

Build a single-user editor first. Realtime collaboration stays out until the document model and undo model are stable. Canva’s collaboration transport was not observed, so there is no wire protocol to mirror.

The public Canva shell is a React DOM site. The new editor can use React for chrome (toolbars, panels, dialogs) without using React to paint every design object. A DOM page and a design surface solve different problems. The homepage having no `<canvas>` does not decide the editor renderer.

## Suggested architecture

### Document model

Keep an immutable-friendly scene graph in application memory:

- Document: pages, size, background.
- Node: id, type (`rect`, `ellipse`, `path`, `text`, `image`, `group`), parent id, child order, affine transform, opacity, lock, name.
- Text node: plain or rich runs, font family, size, line height, alignment. Start with DOM or a canvas text API; do not invent OpenType shaping until the product needs it.
- Image node: asset id plus crop rectangle. Original bytes live in object storage; the editor keeps a decoded bitmap or a URL.

Persist the document as JSON (or a CRDT document later) that the client owns. Do not imitate `/_ajax` paths from the marketing site. Those calls were anonymous-shell traffic, and their bodies were never captured.

### Rendering

Pick one surface and keep hit testing on the same coordinate system:

- SVG or DOM for the first version if documents stay small and accessibility matters.
- A single 2D canvas, with a retained scene graph, if object counts grow.
- WebGL or a WASM rasterizer only after the 2D canvas is measured and found short.

Canva’s editor renderer is unknown. Shipping DOM/SVG first is the smaller independent system, and it matches only the **marketing** rendering that was verified, not a claim about their editor.

StyleX was verified on Canva’s marketing shell. It is optional for the new app. Ordinary CSS modules or a component library are enough for chrome.

### Editing operations

Model edits as commands that return their inverse:

- Insert, delete, reorder (z-order is child order).
- Set bounds / transform.
- Set text.
- Group and ungroup.

Undo and redo are stacks of those commands. That design is independent; Canva’s undo implementation was not found.

Drag, resize, and rotate are pointer gestures that preview a transform and commit one command on pointer-up. Snap is a pure function of the dragged bounds and other node bounds.

Copy and paste serialize the selected subtree to an internal clipboard type, assign new ids, and offset the paste. Duplicate is the same command without the system clipboard.

### Assets and export

- Upload through an API the new app defines: store the original, generate widths the UI needs, return an asset id.
- Template start is “clone a document JSON”, not a screenshot. Canva’s template CDN only showed that anonymous pages load pre-rendered JPEGs and an MP4. That is a reasonable way to show a gallery, and a poor way to start an editable document.
- Export PNG/JPG by rasterizing the scene at a chosen scale. Export PDF with a PDF library that walks the same scene graph. Do this in a worker so the UI stays responsive. Server-side export can come later and should consume the same document JSON.

### Auth and projects

Sign-in is a normal session on the new app’s origin. Canva’s login dialog (email, Google, phone, WebAuthn probe) shows which methods a mature product offers. It is not a spec. The WebAuthn request body was not captured and should not be guessed.

Projects are rows pointing at a document revision. Save on a timer and on command commit. Conflict handling for a single user can be last-write-wins with a revision id. Multiplayer needs a different model and was not evidenced.

### Stack that does not depend on unpublished Canva code

- UI: React, because the public shell demonstrated that React is sufficient for this kind of chrome, and because the license files show Canva already uses it there. The editor surface can still be non-React.
- State: a small store plus the command stack. mobx-react appeared in the homepage bundle only. Zustand, Redux, or plain React state are all viable; none is “what the editor does.”
- Bundling: any content-hashed bundler. The `chunk-composing` host is Canva’s own loader, not a requirement.
- Telemetry: OpenTelemetry or a vendor SDK, sent to infrastructure the new app controls.

## Build order

1. Document JSON, selection, and command undo.
2. SVG or canvas renderer for rect, ellipse, image, and text.
3. Pointer move, resize, rotate.
4. Layers panel bound to child order.
5. Local project list.
6. PNG and PDF export from the same scene graph.
7. Accounts and uploads.
8. Only then, templates as cloneable documents and, separately, any realtime design.

## Explicit non-goals

- Replaying Canva chunk URLs, source maps, or `/_ajax` calls.
- Recovering original Canva modules from source maps.
- Claiming that StyleX, MobX, or the marketing DOM are the design editor.
