# API and network

Bodies, cookie values, and authorization headers were not collected. Paths below are names that appeared on the wire or, where noted, only as strings in a downloaded bundle. A path is not a contract: methods are listed only when a request of that method was retained.

## Origins touched by the anonymous shell

From homepage capture `ev_c30d88201b0c3faf21b4198a98e0ba0897de8e7187a729c7498a0b887a43b4f8` (118 unique request URLs, event capture complete):

| Origin | Role evidenced by the traffic |
| --- | --- |
| `www.canva.com` | Document, same-origin `/_ajax/*`, tag-manager proxies, Cloudflare challenge and RUM |
| `static.canva.com` | Hashed JS, CSS, fonts, SVG, favicon. Response header names include S3 (`x-amz-*`) and Cloudflare cache fields |
| `chunk-composing.canva.com` | `GET /chunk-batch/<hash>+<hash>+...` and matching source-map batch URLs |
| `template.canva.com` | Template JPEG/MP4 renditions |
| `content-management-files.canva.com` | Further media |
| `telemetry.canva.com` | `POST /v1/traces` |
| `o13855.ingest.sentry.io` | Sentry envelope `fetch` |
| `accounts.google.com` | Google sign-in script, no session |
| Advertising hosts | Facebook, LinkedIn, Bing, advertisinganalytics. Several aborted |

`GET /design/` (capture `ev_c07a87403d0d859536c21099320c228fc58ac24724653cf36e2fc7e8fa304307`) did not call `/_ajax`. It returned 403 and loaded the static error page. Header names on that document response included `x-envoy-upstream-service-time`, `cf-ray`, `content-security-policy`, and `x-request-id`. CSP **contents** were not captured.

## Same-origin calls that actually ran

| Call | When it was seen | Body |
| --- | --- | --- |
| `GET /_ajax/ae/time` | Homepage and login | Not captured |
| `POST /_ajax/ae/v2/createBatch` | Homepage, repeated | Not captured. Purpose not verified |
| `POST /_ajax/authnflow/auth-dialog-content` | Homepage and after “Start designing” | Not captured |
| `POST /_ajax/profile/authentication/webauthn` | Login page and the login dialog | Not captured. No credential ceremony was completed |
| `POST https://telemetry.canva.com/v1/traces?s=20&t=1000` | Homepage. Query values from one retained URL | Not captured |
| `GET /login/` → 302, document ends at `/en_in/login/` | Login navigation. `location` header value not retained | n/a |
| `GET /design/` → 403 | Logged-out design URL | Error HTML, not an API payload |

Response header **names** on `/_ajax/ae/time` and `auth-dialog-content` included `content-type`, `content-security-policy`, `x-request-id`, `x-frame-options`, `cross-origin-resource-policy`. `createBatch` additionally listed `access-control-allow-origin` and `access-control-expose-headers`. Values were not kept. Status codes for the `/_ajax` calls that completed in the homepage log were 200.

## Strings in the homepage bundle that did not appear as requests

File `f83b12656af28bd2.js`:

- A GET helper aimed at `` `/_ajax/csrf3/` `` plus an id, with a 30 second timeout.
- A method-taking helper aimed at `` `/_ajax` `` plus a path, with JSON content-type when extra headers are supplied.
- IndexedDB `open(name, version)` and a nearby span name `analytics_client`.

No `/_ajax/csrf3` request was in the retained logs. IndexedDB database names were not requested from the browser, so storage contents are unknown. `serviceWorker` occurs as text in that bundle; scenarios blocked service workers, so registration was not tested.

## Not observed

GraphQL, WebSocket, EventSource, and any design, asset, comment, or export path. `analyze_web_bundle` route extraction on the inline scripts found zero routes and does not cover the webpack chunks.

Playwright scenario events do not include initiator stacks, so a request cannot be tied to a specific function. Redirect ancestry is recorded only when the previous hop was in the capture.
