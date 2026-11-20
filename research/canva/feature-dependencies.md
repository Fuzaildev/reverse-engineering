# Feature dependency ledger

Each requested feature is marked from the evidence actually collected. “Public shell” means the anonymous homepage, login page, or login dialog. It does not mean the design editor.

| # | Feature | Status | What is known | Gap |
| --- | --- | --- | --- | --- |
| 1 | Canvas initialization and rendering | Unresolved for the editor. Public shell verified | Homepage paints DOM/CSS/SVG/video. No `CANVAS` node. `/design/` is HTTP 403 logged out | Editor renderer, scene graph, first frame |
| 2 | Drag-and-drop elements | Unresolved | Homepage has HTML `draggable` attributes. No drag was performed | Hit testing, drop targets, design coordinates |
| 3 | Text editing and typography | Unresolved for editing. Shell copy verified | DOM text, `*.strings.js`, `*.en.js`, one woff2, LTR CSS | Caret, shaping, font service, text model |
| 4 | Image upload and manipulation | Unresolved | Template CDN renditions and `<img>` / `<video>` on the homepage | Upload API, edits, filters |
| 5 | Layers and object positioning | Unresolved | One `data-is-layer-marker` attribute on the marketing DOM | Stacking model, ids, persistence |
| 6 | Shapes and graphics | Unresolved | Marketing SVG icons only | Shape tools and geometry |
| 7 | Resizing and transformation | Unresolved | Not exercised | Handles, constraints, matrices |
| 8 | Undo / redo | Unresolved | Substrings `undo` and `redo` were not found in the homepage bundle. That bundle is not the editor | Command or snapshot model |
| 9 | Copy, paste, duplication | Unresolved | Not exercised | Clipboard format |
| 10 | Templates and design initialization | Partial, marketing only | “Start designing” opens login (`ev_1266ffde48dbffb07db064f6c1b6ff5a66b382a7d3451c9dd70b04f59f2d2cec`). Template images load from `template.canva.com` before login. `/design/` does not open a template | How a signed-in template becomes a document |
| 11 | Export PNG, JPG, PDF | Unresolved | No export request | Renderer and download API |
| 12 | Collaboration and realtime updates | Unresolved | No WebSocket in the retained homepage events | Presence, CRDT/OT, fanout |

## Dependencies that **were** established for the public shell

These are dependencies of the anonymous site, not a proven editor stack.

```text
www.canva.com document
  -> static.canva.com webpack runtime, vendor, locale, CSS
  -> chunk-composing.canva.com batched chunks
  -> React + scheduler + react-strict-dom + StyleX/styleq
  -> mobx-react linked from the homepage bundle
  -> Sentry browser SDK, telemetry.canva.com /v1/traces
  -> /_ajax/ae/time, /_ajax/ae/v2/createBatch
  -> login dialog: auth-dialog-content, webauthn probe, Google button
```

Webpack chunk names are content hashes. They will not match a later deploy. The runtime global `webpackChunk_canva_web` and the `chunk-composing` host pattern are the stable observations.

## Evidence index

| Id | What it supports |
| --- | --- |
| `ev_3ebd00c2981416905b7f4566bec73570ca3a330eb128076e431dad2ba68af796` | Headless Chrome received the Cloudflare block page |
| `ev_c30d88201b0c3faf21b4198a98e0ba0897de8e7187a729c7498a0b887a43b4f8` | Headed homepage accessibility tree and network metadata |
| `ev_1b2f968f6e70b94d4c85970e542ffc9e1ae05bc3783756e5e7348a751e392b38` | Homepage DOM census |
| `ev_0325b84135b49d2cae22f149a81dde2d667cdb1b42ad5685acf0d370e5611a41` | Script URL and source-map URL inventory |
| `ev_b0d942edb46f141d300e5d8f54cb5604e97e596669407742dcba3f713c287365` | Bundle analysis of inline/GTM/challenge scripts only; zero static routes |
| `ev_11757fd66e97f90cef619b644d0958e68691cd0c247767f9c64cd55abc8ef80a` | `/login/` 302 and login UI. Event section incomplete |
| `ev_1266ffde48dbffb07db064f6c1b6ff5a66b382a7d3451c9dd70b04f59f2d2cec` | “Start designing” opens the login dialog |
| `ev_c07a87403d0d859536c21099320c228fc58ac24724653cf36e2fc7e8fa304307` | `/design/` HTTP 403 |

Public files read locally, then deleted from the workspace (not copied into this report):

| SHA-256 | Bytes | File |
| --- | --- | --- |
| `86befea6f43a41d28db7594feb435f974ecde4bcd34a9b2127b04a0f643be298` | 49305 | `1ecf56e1d4e4d9cd.runtime.js` |
| `3ad743713657dc9f08818e20a14c6ccf2d93fdc3af0719298b6d8c4f94c8be6e` | 8472 | `2b10019bf6f5304e.vendor.js` |
| `663affaf15092462fb2bfa1d9ba47f160bf61fc457c5d96a9339254b91350a68` | 986601 | `f83b12656af28bd2.js` |
| `cca916bbed6a22de88a920ca7f915a21ae105fc89b2db7a781d8c141075e23eb` | 1469 | React vendor `LICENSE.txt` |
| `2a0ba02bb2203c0a56af7d6ce4f4c42bf98fc43565e18867efa12edda2b2dfa6` | 220 | react-strict-dom `LICENSE.txt` |
| `5a6b761b5fca66b4d6f16231205c0695305aaca2644f450e2bff2e8d603485fa` | 221 | classnames and tabbable `LICENSE.txt` |
| `3589bb82b17139c49cae7665b52d9a32cf3dae449fe62b10abe9a572dffe0e7c` | 40 | runtime source map with empty sources |
