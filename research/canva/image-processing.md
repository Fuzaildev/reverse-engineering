# Image upload and image manipulation

## Result

No image was uploaded, cropped, filtered, or background-removed. Those editor features are unresolved. The marketing page describes “Magic Eraser” and “Background Remover” as product links (`/features/magic-eraser/`, `/features/background-remover/`). Link text is not an implementation.

## What was verified

Homepage network capture `ev_c30d88201b0c3faf21b4198a98e0ba0897de8e7187a729c7498a0b887a43b4f8`:

- JPEG thumbnails and one MP4 from `template.canva.com`, with paths shaped like `/<id>/<n>/0/<width>w-<token>.jpg` and a similar `.mp4`. Example host and path pattern only; these are Canva-hosted template renditions, not a documented API to call.
- SVG icons from `static.canva.com/web/images/*.svg`.
- Additional media from `content-management-files.canva.com`.
- DOM contained 36 `IMG` elements and 5 `VIDEO` elements. No `CANVAS`.

No request in the retained homepage or login logs had a multipart upload content type that was visible from resource type alone. Bodies were not captured, so a hidden upload cannot be ruled out, and none was identified.

## Unresolved

- Upload protocol, size limits, virus scanning, and asset ids.
- Original vs rendition pipeline (the `800w-` style names suggest pre-rendered widths on the template CDN; that pattern was not confirmed as the editor’s image pipeline).
- Masks, crops, filters, background removal, and any server-side image job.
- EXIF, color management, and RAW handling.
