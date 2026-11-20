# What we already built — Reverse (template-tool)

Local-first social graphics editor (**Reverse**). Stack: Vite · React · TypeScript · Fabric.js · Zustand · pdf-lib.

---

## Routes

| Path | Page | Purpose |
|------|------|---------|
| `/` | Landing | Brand entry + Prompt Studio |
| `/create` | Hub | Presets, templates, saved designs, Prompt Studio |
| `/edit/:id` | Editor | Full canvas editor |

---

## Phase 0 — MVP editor

Already in place before the later feature waves:

- Presets: Instagram post / story, YouTube thumbnail, X post
- Objects: text, rect, circle/ellipse, image upload, solid backgrounds
- Original JSON templates (`src/templates/`)
- Layers panel, undo/redo, zoom
- PNG/JPG export at 1× and 2×
- Designs stored in IndexedDB (no account)
- PDF export helper (`src/lib/exportPdf.ts`)

---

## Phase 1 — Prompt → templates

Inspired by Canva Magic Design flow (prompt → format/mood → editable layouts), implemented **local-first** (no cloud AI).

**Files**
- `src/lib/promptDesign.ts` — intent parsing, moods, palettes, scored generation
- `src/components/PromptStudio.tsx` — UI on landing + hub

**Capabilities**
- Type a prompt (or pick an example)
- Optional size + mood filters (`auto`, `bold`, `soft`, `dark`, `bright`, `editorial`)
- Generates multiple ranked editable designs from existing templates
- Infers preset (IG post/story, YT thumb, X post) and category from keywords
- Opens results into the editor as real documents

---

## Phase 2 — Composition Lab (unique)

Reverse-only package — structure as portable “DNA”, not a Canva clone.

**Files**
- `src/lib/compositionLab.ts`
- `src/components/CompositionLab.tsx`
- Role field on design objects (`src/lib/designSchema.ts`)

**Capabilities**
- **Composition DNA** — extract layout genes (roles, normalized bounds, palette, balance)
- **Balance / Atelier score** — visual weight report (bias, contrast, safe margin)
- **Copy / paste DNA** — clipboard + `localStorage`
- **Reflow Pack** — remap DNA onto other presets (e.g. post → story)
- **Hierarchy twin** — invent a sibling hierarchy variant
- **Transplant DNA** — apply structure onto a host document
- **Role annotation** — auto-tag layers (`headline`, `kicker`, `CTA`, `body`, `accent`, `frame`, `media`)

---

## Phase 3 — Advanced editing (REA / Photopea-inspired)

REA + browser research informed independent features (documented in `research/photopea/rea-findings.md`).

**Files**
- `src/lib/advancedEdit.ts`
- `src/components/CommandPalette.tsx` (Find — **Ctrl+K**)
- Updates to Inspector, Layers, Toolbar, Fabric bridge

**Capabilities**
- Command palette (Find) for actions
- Align / distribute, flip, rotate, nudge
- Layer styles: drop shadow + stroke
- Blend modes
- Precise transform numerics
- Layer visibility, rename, bring to front / send to back
- Style copy / paste between objects
- Select all, lock selection, unlock all

---

## Phase 4 — Template Studio

Advanced template editing tools, browser-verified end-to-end.

**Files**
- `src/lib/templateStudio.ts`
- `src/components/TemplateStudio.tsx`
- `src/lib/brandKit.ts` — local brand kit + element presets

**Capabilities**
- **Find & replace** across all text (+ upper / lower / title case)
- **Brand theme apply / shuffle** — map design palette onto brand kit by luminance
- **Select by role** — headline, kicker, CTA, body, accent, frame
- **Lock tools** — lock selection, unlock all, lock/unlock brand frames
- **Auto-fit headlines**
- **Layout swap** — keep copy, change structure (`swapLayoutKeepCopy`)
- **Bulk role copy** — rewrite text by role
- **Color replace everywhere** + palette extract
- Element presets (rule, badge, pill, frame, quote, etc.)
- Matching commands also wired into the Find palette

### Browser verification completed

1. Bulk role copy  
2. Layout swap (keep copy)  
3. Find/replace (`Spring Forms` → `Autumn Lines`)  
4. Apply brand theme  
5. Select headline by role  
6. Reflow Pack → Instagram Story variant  
7. Export PNG 2× + Save  

---

## Research artifacts

Clean-room notes (not product source):

| Path | Topic |
|------|--------|
| `research/canva/*.md` | Architecture, text, layers, export, APIs, limitations, independent plan |
| `research/photopea/rea-findings.md` | REA scenario findings → Reverse responses |

---

## Key source map

```
src/
  App.tsx                    Routes
  pages/
    LandingPage.tsx          Marketing + Prompt Studio
    Hub.tsx                  Create / templates / saved
    EditorPage.tsx           Canvas shell + panels
  components/
    PromptStudio.tsx
    CompositionLab.tsx
    TemplateStudio.tsx
    CommandPalette.tsx
    Toolbar.tsx / Inspector.tsx / LayersPanel.tsx
    CanvasOverlays.tsx / DesignPreview.tsx
  canvas/
    FabricCanvas.tsx
  lib/
    designSchema.ts          Document model + roles
    promptDesign.ts          Prompt → designs
    compositionLab.ts        DNA / reflow / balance
    templateStudio.ts        Template ops
    advancedEdit.ts          Align, styles, locks
    brandKit.ts              Brand kit + presets
    fabricBridge.ts          Canvas ↔ document
    commands.ts              Edit commands
    exportPdf.ts / db.ts / presets.ts / fonts.ts
  templates/
    index.ts / layouts.ts    JSON template library
  store/
    editorStore.ts           Zustand
```

---

## Run

```bash
npm install
npm run dev
```

---

## Status snapshot

| Area | Status |
|------|--------|
| MVP editor + export | Done |
| Prompt Studio | Done |
| Composition Lab | Done |
| Advanced edit + Find palette | Done |
| Template Studio | Done + browser-tested |
| Accounts / collaboration / cloud AI | Out of scope (local-first) |
