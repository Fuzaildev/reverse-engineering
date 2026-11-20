# Canva application architecture

Investigation date: 2026-10-31. Target: the public website at `https://www.canva.com/`. No account was used, and no access control was bypassed.

This document separates three labels:

- **Verified:** directly observed in a REA browser capture, a CDP page inspection, or a public file that the page requested.
- **Inference:** a bounded reading of those observations. It is not a runtime trace of the editor.
- **Unresolved:** not observed. Absence from the public site is not evidence about the logged-in editor.

## What was in scope

Headed Chrome loaded the marketing homepage and the login page. Headless Chrome did not: it received a Cloudflare interstitial whose heading was “We’ll have you designing again soon” (capture `ev_3ebd00c2981416905b7f4566bec73570ca3a330eb128076e431dad2ba68af796`). Later captures used a visible Chrome window.

`GET https://www.canva.com/design/` returned HTTP 403 and the page “We can’t show this page”, with text telling the visitor to be logged in to the correct account (capture `ev_c07a87403d0d859536c21099320c228fc58ac24724653cf36e2fc7e8fa304307`). The response header names included `x-envoy-upstream-service-time`. No editor scripts were loaded. Editor internals are therefore unresolved.

Scenario captures blocked service workers by default. Whether the production site registers a service worker was not observed.

## Frontend shell

**Verified.** The homepage that loaded in headed Chrome (`ev_c30d88201b0c3faf21b4198a98e0ba0897de8e7187a729c7498a0b887a43b4f8`) is a DOM document, not a canvas application.

CDP inspection `ev_1b2f968f6e70b94d4c85970e542ffc9e1ae05bc3783756e5e7348a751e392b38` counted 3,362 DOM nodes. Tag counts included `DIV` 1084, `SPAN` 668, `A` 385, `BUTTON` 42, `IMG` 36, `svg` 43, `VIDEO` 5, `SCRIPT` 42, `IFRAME` 2. There was **no** `CANVAS` element. Semantic regions present: one `HEADER`, `NAV`, `MAIN`, `H1`, and `FOOTER`.

Attribute names on that tree included `class`, `style`, `href`, `nonce`, `integrity`, `crossorigin`, `aria-*`, and a few `data-*` names: `data-announcer-region`, `data-is-layer-marker` (one node), `data-num-thumbnails`, `data-thumbnail-index`, `data-cf-beacon`. Attribute values for cross-origin URLs were withheld by the inspection policy until static origins were allowed. `data-is-layer-marker` was on the marketing page; it is not evidence of the design editor’s layer model.

The accessibility tree on the homepage exposed a banner (Design, Product, Plans, Business, Education, Help), links to `/signup/` and `/login/`, the heading “What will you design today?”, and a “Start designing” button. Tabs included AI, Presentations, Social, Video, and Print Shop.

**Inference.** The public shell is a React tree compiled with StyleX. That inference is limited to bundles the homepage actually downloaded:

- `static.canva.com/web/b2b75586778cc603.s4le6a.vendor.js.LICENSE.txt` names React, react-dom, react-dom-client, react-jsx-runtime, scheduler, and `use-sync-external-store-shim` (SHA-256 `cca916bbed6a22de88a920ca7f915a21ae105fc89b2db7a781d8c141075e23eb`).
- `2b10019bf6f5304e.vendor.js.LICENSE.txt` names `react-strict-dom` (SHA-256 `2a0ba02bb2203c0a56af7d6ce4f4c42bf98fc43565e18867efa12edda2b2dfa6`).
- That same vendor file (SHA-256 `3ad743713657dc9f08818e20a14c6ccf2d93fdc3af0719298b6d8c4f94c8be6e`, 8,472 bytes) contains the strings `styleq`, `stylex`, and `@stylexjs/babel-plugin`, and sets a `data-style-src` property when compiled styles carry extra style text.
- `07d90a51a2b3b024.1ul071.vendor.js.LICENSE.txt` names `classnames` and `tabbable` 6.2.0.
- Homepage bundle `f83b12656af28bd2.js` (SHA-256 `663affaf15092462fb2bfa1d9ba47f160bf61fc457c5d96a9339254b91350a68`, 986,601 bytes) contains `[mobx-react]` error strings. That shows mobx-react is linked into this shell. It does not show that the design editor uses MobX.

## Bundling and delivery

**Verified.** Homepage script requests used content-hashed webpack chunks:

- Global chunk array name observed in the runtime and in small chunks: `webpackChunk_canva_web`.
- Entry-style names: `1ecf56e1d4e4d9cd.runtime.js`, `*.vendor.js`, `*.strings.js`, `*.en.js`, `*.sentry_browser.js`, and `*.ltr.css`.
- Many chunks are concatenated by `https://chunk-composing.canva.com/chunk-batch/` with `+` between content hashes. The runtime file (SHA-256 `86befea6f43a41d28db7594feb435f974ecde4bcd34a9b2127b04a0f643be298`) builds that host as `chunk-composing.` plus the last two labels of the page host, and appends `/chunk-batch/` plus the joined names. A second path in the same file rewrites a hostname to `static.` + the host without a 16-character prefix and a pathname of `/web/` + a hash. That is the loader logic that was shipped, read as text, not executed in a debugger.
- Flags read by that runtime: `globalThis.__batch_chunks__` and `globalThis.__offline_batches__`.
- CDP script inventory after the page had loaded (`ev_0325b84135b49d2cae22f149a81dde2d667cdb1b42ad5685acf0d370e5611a41`) retained 30 scripts: 23 on `static.canva.com`, 4 on `chunk-composing.canva.com`, 3 on `www.canva.com`. Twenty-seven declared a `sourceMappingURL`. The runtime map that was fetched was a valid source-map document with empty `sources` and empty `mappings` (40 bytes, SHA-256 `3589bb82b17139c49cae7665b52d9a32cf3dae449fe62b10abe9a572dffe0e7c`). Other maps were not downloaded. Original module paths are unresolved.
- Script tags carried `nonce`, and many carried `integrity` and `crossorigin`. Stylesheets were separate `.ltr.css` files, which indicates direction-specific CSS builds. Only LTR was requested in these captures.
- Static responses included header names `cf-cache-status`, `cf-ray`, `etag`, `x-amz-request-id`, `x-amz-server-side-encryption`, and `x-amz-meta-application.id`, `x-amz-meta-component.name`, `x-amz-meta-release.id`, `x-amz-meta-source.commit`. Header **values** were not captured. **Inference:** static assets are cached at Cloudflare and stored in S3. Component, release, and commit metadata exist as object metadata keys; their values are unknown.

`analyze_web_bundle` on the already-open page (`ev_b0d942edb46f141d300e5d8f54cb5604e97e596669407742dcba3f713c287365`) parsed only seven same-origin sources (inline documents, Google Tag Manager, and a Cloudflare challenge script). Its route inventory was empty (`candidate_enumeration: partial`). That result does **not** describe the webpack chunks. Static analysis of those chunks was done by reading the public files the network log named, not by executing them.

## State, auth, and project entry

**Verified.**

- Clicking “Start designing” did not navigate. The URL stayed `https://www.canva.com/` and a dialog opened: “Log in or sign up in seconds”, with buttons for phone, Google, email, another way, and business signup (capture `ev_1266ffde48dbffb07db064f6c1b6ff5a66b382a7d3451c9dd70b04f59f2d2cec`).
- `GET /login/` returned 302. The document then settled on `https://www.canva.com/en_in/login/` with the same provider buttons (capture `ev_11757fd66e97f90cef619b644d0958e68691cd0c247767f9c64cd55abc8ef80a`). The `location` header **name** was present on the 302; the header value was not retained. This capture’s event section is incomplete because some requests were still in flight.
- Console text on the homepage reported Google Identity Services / FedCM: “Not signed in with the identity provider.” Requests to `accounts.google.com` occurred. No session was created.
- Homepage and login-dialog traffic included:
  - `GET /_ajax/ae/time`
  - `POST /_ajax/ae/v2/createBatch` (repeated)
  - `POST /_ajax/authnflow/auth-dialog-content`
  - `POST /_ajax/profile/authentication/webauthn` when the login UI was shown
- The homepage bundle contains a client function that requests `` `${base}/_ajax/csrf3/${id}` `` with `content-type: application/json;charset=UTF-8` on some calls, and a dynamic `` `${base}/_ajax${path}` `` helper. `GET /_ajax/csrf3/...` was **not** in the retained network log, so that helper did not run during these captures (or its request was not retained).
- Request and response bodies were not captured. Cookie and `Set-Cookie` values are redacted by the capture tool even when header values are requested; they were not requested here. Storage key names were not requested. `usage_bytes` on the origin was 247,051 during one inspection; that figure alone does not identify which store held the bytes.

**Unresolved.** Session cookies, CSRF token format, project ids, design document schema, and how the editor authenticates to backend services.

## Rendering approach for the public site

**Verified.** Marketing pages paint with DOM, CSS, SVG, images, and video. Template media came from `template.canva.com` (JPEG and one MP4). Copy and thumbnails also came from `content-management-files.canva.com`. A font request used a `.woff2` under `static.canva.com/web/images/`.

`requestAnimationFrame` occurs as text in the homepage bundle. No WebGL, canvas, or OffscreenCanvas usage was established. The design editor’s renderer was not loaded.

## Telemetry and third parties

**Verified** on the homepage network log:

- `POST https://telemetry.canva.com/v1/traces` with query parameter names `s` and `t`. One retained URL was `s=20&t=1000`. Body not captured. Meaning of those numbers is unknown.
- Sentry browser SDK file `706d60db64c317b6.sentry_browser.js` and a `fetch` to `o13855.ingest.sentry.io`. The public DSN material in that URL is omitted here.
- Google Tag Manager script `https://www.canva.com/gtg/gtm.js?id=GTM-TZPTKRR&l=dataLayer`. A related `gtg` script with id `G-EPWEMH6717` was refused because the response MIME type was `text/html` (HTTP 403 in the console).
- Pixels or scripts for Facebook, LinkedIn, Bing, and `signalsgateway.advertisinganalytics.com`. Several of those requests ended `net::ERR_ABORTED`.
- Cloudflare challenge scripts and `POST /cdn-cgi/rum` (HTTP 204 on the design error page).

The homepage bundle also contains span helpers (`startSpan`, `startRootSpan`, `setStatus`) and Sentry event-id fields. That is client instrumentation in the shell. It is not a trace of editor operations.
