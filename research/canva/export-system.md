# Export

## Result

No design was exported. PNG, JPG, and PDF export endpoints, job state, and file bytes were not observed.

Homepage bundle `f83b12656af28bd2.js` contains the substring `pdf` three times. The occurrences were not tied to an export function. `PNG` as a substring was not found in that file. Neither result describes the export system.

The template CDN served JPEG and MP4 renditions to the anonymous homepage. Those are marketing assets, not an export API.

## Unresolved

- Client-side rasterization vs server-side render.
- PDF library, print bleed, and color profile.
- Download URL shape, polling, and expiry.
- Page ranges and multi-page documents.
