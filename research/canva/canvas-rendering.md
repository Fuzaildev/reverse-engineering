# Canvas and editor rendering

## Result

The design surface was not loaded. `GET https://www.canva.com/design/` returned HTTP 403 and an error document that tells the visitor to be logged in (capture `ev_c07a87403d0d859536c21099320c228fc58ac24724653cf36e2fc7e8fa304307`). Assets on that response were the generic error page (`static.canva.com/domain-assets/canva/error/page.css`, `page.js`, and block images), not an editor runtime.

Every item below that describes a design canvas, scene graph, or paint loop is **unresolved**.

## What the public homepage actually renders

**Verified** from CDP DOM inspection `ev_1b2f968f6e70b94d4c85970e542ffc9e1ae05bc3783756e5e7348a751e392b38` and homepage capture `ev_c30d88201b0c3faf21b4198a98e0ba0897de8e7187a729c7498a0b887a43b4f8`.

| Observation | Evidence |
| --- | --- |
| No `CANVAS` element in 3,362 nodes | DOM census |
| SVG icons (`svg` 43, `path` 44) | DOM census |
| Five `VIDEO` elements | DOM census |
| Product images and one MP4 from `template.canva.com` | Network log |
| CSS from `static.canva.com/web/<hash>.ltr.css` | Network log |
| StyleX / styleq runtime in `2b10019bf6f5304e.vendor.js` | Public vendor file, SHA-256 `3ad743713657dc9f08818e20a14c6ccf2d93fdc3af0719298b6d8c4f94c8be6e` |

**Inference, homepage only.** Visible marketing UI is React DOM plus compiled StyleX class names, with SVG and replaced media. The string `requestAnimationFrame` exists in homepage bundle `f83b12656af28bd2.js`. No call was traced, so a paint loop is not established.

Strings searched in that homepage bundle and not found: `konva`, `pixi`, `fabric`, WebGL spellings used as library names, `OffscreenCanvas`. Not finding them in the marketing bundle does not mean the editor lacks them. The editor bundle was never downloaded.

## Initialization path that was observed

1. Headed navigation to `https://www.canva.com/` (headless navigation stopped on a Cloudflare block page).
2. Document, LTR stylesheet, webpack runtime, vendor chunks, locale/string chunks, and `chunk-composing.canva.com` batches load.
3. Accessibility tree reaches “What will you design today?” and “Start designing”.
4. Activating “Start designing” opens a login dialog on the same URL (`ev_1266ffde48dbffb07db064f6c1b6ff5a66b382a7d3451c9dd70b04f59f2d2cec`). No design surface is created.

## Unresolved editor questions

- Whether the editor paints with DOM, SVG, one canvas, layered canvases, WebGL, or a worker.
- Coordinate system, device-pixel ratio, and camera/zoom.
- How objects are retained between frames.
- Tile or page virtualization.
- Relationship of `data-is-layer-marker` (one marketing-page node) to editor layers. No such relationship was tested.
