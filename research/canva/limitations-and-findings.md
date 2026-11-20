# Limitations and findings

## Findings that are safe to repeat

1. Anonymous visitors get a React marketing shell from content-hashed webpack chunks on `static.canva.com`, with extra chunks batched through `chunk-composing.canva.com`. The shell uses StyleX (`styleq` / `@stylexjs/babel-plugin`), and the homepage bundle is linked with mobx-react. React, react-dom, scheduler, react-strict-dom, classnames, and tabbable 6.2.0 are named by shipped license files.
2. That shell paints with DOM, CSS, SVG, images, and video. The inspected homepage had no canvas element.
3. Design creation is behind login. “Start designing” opens a dialog offering phone, Google, email, or other methods. `GET /design/` without a session is HTTP 403 and does not load editor code.
4. The anonymous page calls a small `/_ajax` set (`ae/time`, `ae/v2/createBatch`, `authnflow/auth-dialog-content`, and, once the login UI is up, `profile/authentication/webauthn`) plus `telemetry.canva.com/v1/traces` and Sentry. Bodies were not read.
5. Static files are served with Cloudflare and S3 header names, including release and commit metadata keys. Values of those headers were not captured. Scripts declare source maps; the one runtime map retrieved contained no original sources.

## Limitations

- **No logged-in editor.** Features 1–12 in the brief, except the marketing-page parts of templates and the shell’s own rendering, could not be investigated. This was an access-control boundary, not a tooling failure. It was not bypassed.
- **Headless automation was blocked** by Cloudflare. Evidence about the real homepage comes from headed Chrome only.
- **Service workers were blocked** in scenario settings. Their effect is unknown.
- **No response bodies, no header values, no storage keys, no initiator stacks.** Endpoint purpose is often unknown. `createBatch` must not be described as “create a design”; nothing in the capture shows that.
- **Bundle analysis did not cover webpack chunks automatically.** `analyze_web_bundle` only received inline and tag-manager scripts. Chunk conclusions come from the specific public files listed in `feature-dependencies.md`, read as text and not executed.
- **Source maps were not used to recover original Canva source.** Doing so would have copied proprietary modules into the workspace. One empty runtime map was checked.
- **Hashes are deploy-specific.** A later visit will load different chunk filenames.
- **Locale redirect cause is unknown.** `/login/` returned 302 and the page URL became `/en_in/login/`. The `Location` value itself was not retained, and the homepage URL stayed `/`.
- **Login capture events are incomplete** (`ev_11757fd66e97f90cef619b644d0958e68691cd0c247767f9c64cd55abc8ef80a`): some requests had not finished. The final URL and accessibility tree were captured.
- **String presence is not behavior.** Counts of `drag`, `pdf`, or `indexedDB` inside a minified shell are not execution traces.
- **Third-party scripts failed closed in places** (Google tag endpoints returned HTML and were refused by MIME checks; some ad requests aborted). Those failures are session observations, not a map of Canva’s production allowlist.

## What would be required for the editor features

A session the account owner has already signed in, used only against that owner’s own designs, with network metadata captured while the owner performs each action. That work was out of scope for this pass. Guessing editor internals from the marketing bundle would be fabrication.
