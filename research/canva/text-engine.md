# Text editing and typography

## Result

Text editing inside a design was not observed. The editor did not load (HTTP 403 on `/design/`). There is no verified text engine, caret model, font shaping pipeline, or typography API.

## What was verified

- The public homepage and login page render text as normal DOM headings, paragraphs, links, and buttons (accessibility trees in `ev_c30d88201b0c3faf21b4198a98e0ba0897de8e7187a729c7498a0b887a43b4f8` and `ev_11757fd66e97f90cef619b644d0958e68691cd0c247767f9c64cd55abc8ef80a`).
- Locale-oriented chunks were requested by name: `d807a303f5105d24.strings.js` and `21ae68a3e3968b76.en.js`, plus further `*.strings.js` names inside chunk batches. Their contents were not decoded. **Inference:** the shell splits copy into string chunks and at least an English chunk. Fallback behavior and the full locale set are unknown.
- One `.woff2` was requested from `static.canva.com/web/images/cff149ee1e9d2be50ac77bcd86769d05.woff2`. Which typeface it is, and whether the editor uses the same file, was not determined.
- CSS is shipped as a direction-specific `*.ltr.css`. RTL styling was not requested.
- A search of homepage bundle `f83b12656af28bd2.js` for the substring `slate` hit CSS `translate` / `translateY` calls, not the Slate editor. `prosemirror`, `lexical`, and `quill` were not found in that file. That search does not cover the editor.

## Unresolved

- Rich-text document model, IME, bidirectional text, OpenType features, variable fonts, text-on-path, and font upload.
- Whether design text is DOM, canvas glyphs, or a hybrid.
- Any network request that loads a font catalog or a user text style. None was isolated from the homepage traffic.
