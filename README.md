# ORBIT | Crew Health

A local-first, offline-capable crew medical and mission operations console. After setup it runs entirely on the local network: no CDN fonts, scripts or analytics, and nothing is sent anywhere without an explicit action by a person.

The app does not diagnose, does not assess fitness for duty and is not clinically validated.

## Documentation

| Guide | Covers |
|---|---|
| [docs/OFFLINE-ASSISTANT.md](docs/OFFLINE-ASSISTANT.md) | Setting up and running the offline voice assistant: Ollama, Whisper, Kokoro, the Python server |
| [docs/ELEVENLABS_SETUP.md](docs/ELEVENLABS_SETUP.md) | The online ElevenLabs assistant: agent, client tools, record access |
| [docs/SCOPE-SETUP.md](docs/SCOPE-SETUP.md) | Setting up SCOPE's Gemini photo check |
| [docs/CONDITION_SOURCES.md](docs/CONDITION_SOURCES.md) | The bundled MedlinePlus condition reference |
| [docs/ui-reference/README.md](docs/ui-reference/README.md) | Where the website design came from |
| [docs/ui-reference/DESIGN.md](docs/ui-reference/DESIGN.md) | The design system |
| [docs/ui-reference/THIRD_PARTY_NOTICES.md](docs/ui-reference/THIRD_PARTY_NOTICES.md) | Third-party licenses |
| [src/modules/evidence/README.md](src/modules/evidence/README.md) | The React evidence module |

## Website (`ui/`)

The website is plain HTML, CSS and JavaScript in `ui/` (no framework). It is the default site.
Run `npm ci` and `npm run dev`, then open http://localhost:5173.
Edit `ui/` to change it; do not edit the generated `dist/` folder.
Pages use hash navigation (`#status`, `#log`, …), and records are kept in the browser's local storage.

| Page | Hash | What it does |
|---|---|---|
| Crew Status | `#status` | Who needs attention first, across the whole crew |
| Crew Profiles | `#crew` | Each crew member's profile, conditions and health record |
| Health Log & Trends | `#log` | Logged health checks and trend charts |
| Collect Vitals | `#collect` | Guided, animated walkthroughs for taking each measurement |
| SCOPE | `#scope` | Photo check: Gemini describes a visible concern. Online only; see [docs/SCOPE-SETUP.md](docs/SCOPE-SETUP.md) |
| Health Assessment | `#care` | Guided assessment, plus sections for sleep and wellbeing, exercise, and skin and wounds |
| Daily Routine | `#routine` | The day's health tasks |
| Health Risk Readings | `#risks` | Entered mission health risk readings, such as radiation dose |
| Anatomy Lab | `#anatomy` | 3D body atlas: skeleton, organs, vessels and nerves, muscles, with regions, views, dissection and conditions |
| Crew Voice AI Assistant | `#voice` | The full-page offline voice assistant (the React workspace at `/voice/`) |
| Offline Evidence Library | `#research` | Sourced research entries by topic, Ask the onboard library, and Prepare offline package |

Across every page:

- **Crew Assistant panel** (right). The avatar's microphone and **Connect Text** start the **online** ElevenLabs assistant ([docs/ELEVENLABS_SETUP.md](docs/ELEVENLABS_SETUP.md)). The Wi-Fi icon opens the **offline** assistant, which stays docked while you change pages ([docs/OFFLINE-ASSISTANT.md](docs/OFFLINE-ASSISTANT.md)).
- **Online / Offline switch** (top bar). Offline turns off the online assistant, SCOPE and external links, so nothing leaves the device.
- **Workspace Settings** (bottom of the sidebar). Choose who is using ORBIT, switch between the **demo** workspace and a **personal** one, and export or clear data.
- **Workspaces.** The demo workspace has four fictional crew (Crew 01–04) and two historical profiles built from NASA records: Scott Carpenter (Mercury-Atlas 7) and Gordon Cooper (Mercury-Atlas 9), in `ui/historical-crew.js`. A personal workspace starts with one empty profile and no sample data.

**Evidence library** (`ui/research-library.js`). Every entry states only what its sources say. Each has an evidence label, tracking guidance, a link into the site, and its sources; most of the newer NASA sources also show a full APA 7 reference. Topics: Cabin Environment, Mind and Behavior, Space Radiation, Immune System and Skin, Altered Gravity, Spacewalks, Hostile Environments (cabin hazards and the planets), and Historical Mission Measurements (generated from `ui/assets/ALL_NUMERIC_METRICS_LONG.csv` by `scripts/import-historical-evidence.py`). Two unpublished dissertation chapters are bundled as PDFs in `ui/assets/evidence/`. Both voice assistants search the same library.

**Service worker** (`ui/sw.js`). It caches the site for offline use. After changing any file in `ui/`, bump `CACHE` in `ui/sw.js` so browsers pick up the change.

See [UI setup and provenance](docs/ui-reference/README.md) and the retained
[design system](docs/ui-reference/DESIGN.md).

The existing React/Pipecat workspace is preserved at `/voice/` after building.
The website's **Crew voice AI assistant** tab (`#voice`, `ui/voice.js`) embeds it as
`/voice/assistant?embed=1`, so it shares the website's sidebar, top bar, page heading
and colors (`ui/design-tokens.css` is imported by both apps). In that mode the
workspace hides its own shell, and its links open the website's tabs. Re-renders keep
the frame, so a live voice session is not interrupted.
The local FastAPI server implements the React voice workspace's API. The
floating avatar assistant uses ElevenLabs and requires internet access.

## Stack

React 18 · TypeScript (strict) · Vite · Tailwind CSS v4 · lucide-react · react-router-dom v6. Fonts are bundled through `@fontsource`. All dependency versions are pinned exactly.

The backend (Python, FastAPI, Uvicorn, Pipecat) serves the built frontend and `/api/*` over local HTTPS on the same origin. In development, Vite proxies `/api` to `https://localhost:8443`.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Build everything, then serve the website at http://localhost:5173. Requests to `/api/*` go to the Python server on https://localhost:8443, except `/api/scope/*` (SCOPE), which this server answers itself. |
| `npm run dev:live` | Same as `npm run dev`. |
| `npm run dev:voice` | Vite development server for the React voice workspace in live mode. |
| `npm run server` | Starts the local Python server (`server/run.py`) on `https://localhost:8443`. |
| `npm run build` | Typecheck; copy `ui/` to `dist/`; build React at `dist/voice/`. |
| `npm run preview` | Serve the complete production build at http://localhost:5173. |
| `npm run typecheck` | `tsc -b --noEmit` |
| `npm run lint` | ESLint |
| `npm test` | The React crew module's Vitest tests, then every `tests/*.test.mjs` (voice assistant, evidence library and its export, historical crew, SCOPE photo analysis, website). |
| `npm run test:crew` | Only the React crew module's Vitest tests. |
| `npm run test:evidence` | Only `tests/evidence.test.mjs`. |
| `npm run dev:crew` | Vite development server for the React crew module (see **React crew development**). |

The Python server's tests run separately, with the server's Python environment: `python tests/test_emergency.py` and `python tests/test_historical_retrieval.py`.

## Local server (`server/`)

FastAPI + Pipecat, all on this machine. It implements the React voice workspace's `/api/*` routes and serves `dist/` after `npm run build`.

For a step-by-step guide to setting up and running the offline voice assistant (Ollama, Whisper speech to text, Kokoro text to speech), see [docs/OFFLINE-ASSISTANT.md](docs/OFFLINE-ASSISTANT.md).

**One-time setup**

1. Install [Ollama](https://ollama.com) and pull the model: `ollama pull qwen3:8b`
2. Create a Python 3.12 environment and install: `pip install -r server/requirements.txt`
3. Download the models once (needs internet): set `ORBIT_ALLOW_DOWNLOADS=1` in `server/.env`, start the server, open a session, then remove the line. Or point `ORBIT_KOKORO_MODEL` / `ORBIT_KOKORO_VOICES` at existing Kokoro files. See `server/.env.example`.

**Run**

```
npm run server        # terminal 1: https://localhost:8443
npm run dev           # terminal 2: the website at http://localhost:5173, proxies /api to the server
```

Use `npm run dev:voice` instead of `npm run dev` to work on the React voice workspace on its own (Vite, also http://localhost:5173).

Or `npm run build` and open `https://localhost:8443` directly (also from other devices on the LAN). The HTTPS certificate is self-signed and created on first run (`server/certs/`); accept it once in the browser. Browsers only allow the microphone over HTTPS or on `localhost`.

**Pipeline:** SmallWebRTC → Silero VAD → fixed-silence end of turn (`ORBIT_SILENCE_SECONDS`, default 1 s) → faster-whisper `base.en` → Ollama `qwen3:8b` (thinking off) → Kokoro. The server reports this as its turn detection ("Silence timer · 1 s"), and the status panel shows that rather than Smart Turn.

**Tools** run in the browser. The server advertises them to the model (`server/orbit_server/tools.py`) and relays each call to the page and its result back:

| Tool | What it does |
|---|---|
| `get_current_context` | The page, crew member and open form |
| `get_crew_summary` | A crew member's latest readings |
| `navigate` | Opens a website page, optionally for a named crew member |
| `open_form` | Opens one of the website's forms (health check, wellbeing check-in, workout, risk reading, skin check, wound, condition note, flight surgeon report and others) |
| `fill_form` | Types values into the open form. It never saves; the person checks the form and presses **Save** |
| `log_vital` | Drafts a vital sign reading that waits for a person to confirm |
| `control_anatomy` | Drives the Anatomy lab |
| `search_evidence` | Searches the Evidence library and returns cited passages |
| `share_record_with_assistant` | Asks the person to share a record with the session |

`log_vital` and `share_record_with_assistant` survive interruptions and wait for a person. The browser gives up after 4 min 45 s and tells the model nothing was saved or shared, before the server's 5-minute backstop, so no Save button outlives the request.

**Emergencies** (`server/orbit_server/emergency.py`). When someone says or types something that sounds like bleeding, choking, trouble breathing, chest pain, an unresponsive crew member or a burn, the server adds reviewed first-response steps to that turn before the model answers. The steps include "alert the medical officer and the rest of the crew now". The assistant says them first. It cannot contact anyone itself. Follow-up guidance stays in effect for 10 minutes.

**Data:** the voice assistant's crew are the website's demo crew, with the same ids: Crew 01 to 04 (`crew-01`…`crew-04`, fictional sample crew whose readings the server dates today) and the historical profiles Gordon Cooper (`hist-ma9`) and Scott Carpenter (`hist-ma7`). `node scripts/seed-voice-crew.cjs` rebuilds `server/data/seed.json` from the website's own scripts, and `npm test` fails if the two drift apart. The React mock mode keeps its own synthetic crew (`src/shared/mocks/crew.ts`). Saved vitals and voice settings go to `server/data/runtime/` (gitignored).

**Evidence:** the assistant searches the website's Evidence library. `scripts/export-research.mjs` exports `ui/research-library.js` to `server/data/research-library.json` (run by `npm run build`; the file is committed, and `npm test` fails if it falls out of date). Each passage carries its evidence type, tracking guidance and source papers. Citations link to `#research?doc=<topic>&chunk=<entry>`, which opens that entry. Search is keyword matching (`store.py`, `search_evidence`): question words are ignored, everyday words map to the entries' terms ("hot" to temperature), topic names are searchable, and a named mission ("Apollo 10", "MA-9") or crew role ranks its own records first. The online assistant uses the same rules (`rank` in `ui/research-library.js`). There is no FAISS index yet, so the status bar reports the index as missing.

**Anatomy lab** (`/api/anatomy/*`, `server/orbit_server/anatomy.py`) serves the React Anatomy lab module. Regions come from the module's own `src/modules/anatomy/mocks/regions.json`. Pins start from the synthetic `server/data/anatomy-pins.json`, and changes are saved to `server/data/runtime/anatomy-pins.json`. Region references list pin notes only.

**Ask the onboard library** (`/api/assistant/status`, `/api/assistant/ask`, `server/orbit_server/onboard_library.py`) powers the panel on the website's Evidence library page. It answers from the matching library passages with the local model and streams the answer with its sources. If nothing in the library matches, the model is not called and the answer is marked as not covered.

**Shared records** belong to the voice session they were shared with (keyed by its WebRTC `pc_id`). They reach only that session's prompt, framed as data rather than instructions, and are dropped when that session ends or the person removes them.

**Voice settings** applied live: voice, speed, response length and VAD sensitivity. Blend is reported as unsupported. Interruptions on/off and end-of-turn threshold take effect for the next session and are ignored respectively.

## Layout

```
server/
  run.py          starts uvicorn over HTTPS
  orbit_server/   app.py (routes) · voice.py (pipeline) · tools.py · store.py · health.py · certs.py
  data/           seed.json (synthetic); runtime/ for saved vitals and settings
src/
  app/            route table and application shell (status bar, sidebar, crew selector)
  shared/         design tokens, UI kit, types, API client, mock mode, contexts
  modules/
    crew/         Module 1 — Crew status and health tracking (built)
    anatomy/      Module 2 — Anatomy lab (built)
    assistant/    Module 3 — Crew assistant (built)
    evidence/     Module 4 — Offline evidence library (built)
```

All four modules are registered in the React application. Modules never import from each other; they link through routes.

## Crew assistant (`/assistant`)

A real-time voice and text assistant on the local network. The target pipeline is SmallWebRTC → Silero VAD → Smart Turn v3 → local STT → Ollama `qwen3:8b` → Kokoro TTS. The bundled server (above) uses a silence timer in place of Smart Turn for now.

- **Adapter boundary:** all Pipecat API use lives in `modules/assistant/pipecat/`. The rest of the module only talks to the `VoiceSession` interface (`session/VoiceSession.ts`).
- **Signaling:** SDP offer to `POST /api/voice/offer`, `iceServers: []` (host candidates only).
- **No CDN:** the transport's default media manager wraps daily-js, which loads code from Daily's CDN. ORBIT uses its own `getUserMedia` media manager instead, and `vite.config.ts` aliases daily-js to a stub so that code isn't bundled.
- **Human confirmation:** `log_vital` waits for a person to press **Save**, or for the exact spoken phrase "Confirm save" (one reading per phrase). `share_record_with_assistant` waits for the review dialog's **Share** button, or for the exact spoken phrase "Confirm share". Model output and typed text can never approve.
- **Session rules:**
  - The session ends when the active crew member changes or when you leave the page.
  - Hiding the tab mutes the microphone; returning does not unmute it.
  - Start is disabled while the model is not ready.

### Server messages the client understands

Sent as RTVI server messages:

- `{ type: "smart-turn", probability }`
- `{ type: "pipeline-health", health }`
- `{ type: "citations", citations }`
- `{ type: "turn-metrics", stt_ms, llm_ttft_ms, tts_ttfb_ms, voice_to_voice_ms }`

### Client messages the server should handle

- `orbit.voice-settings` (settings without volume; volume is applied in the browser)
- `orbit.interrupt`

### Mock mode

With `VITE_USE_MOCKS=true`, a `MockVoiceSession` plays a scripted conversation without WebRTC:

1. Log a heart rate, with the Save confirmation.
2. Evidence on bone loss, with citations.
3. Show the left knee, which navigates to the Anatomy lab.

A **Demo controls** card can step the script, force any turn state, simulate errors, say the share approval phrase and cycle the status-bar states. Append `?state=loading|empty|error` to the URL in development to see those page states.

## Offline evidence library (React module)

This is the React workspace's evidence module, separate from the website's Offline Evidence Library page (`#research`, described above). Module 4 is implemented at `/evidence`, with cited search/Ask, a passage viewer,
Offline center, import/indexing jobs, and a separate historical CSV reference view.
Production builds include a Workbox service worker; live API responses are never
cached. See [the module guide](src/modules/evidence/README.md) for API contracts,
offline behavior, mock-mode limits, tests, and the colon-containing workspace path
caveat. The separate local FastAPI/FAISS/Ollama backend is required for real search,
indexing and generated answers.

Run `npm run build` then `npm run test:evidence` for the evidence regression checks.
## Anatomy lab (`/anatomy`)

An anatomical reference workspace. Crew members inspect body systems, pin symptoms, injuries and observations to a region for one crew member, and cross-reference notes, health-log entries and Evidence library sources for that region.

The model is a **generic adult reference** shared by every profile. Pins change markers and highlights only; they are not a scan, an image or a finding.

| Route | Screen |
|---|---|
| `/anatomy` | Workspace for the active crew member |
| `/anatomy?crew=c03&region=knee_left&pin=p12` | Deep link: selects the crew member in the status bar, frames the region, opens the Pins tab |
| `/anatomy/pins` | All pins across the crew, filterable by crew, status and system |

- **Layout:** Explorer (search, system layers, region tree) · Viewer · Inspector (Region · Pins · Notes & references). Below 1280px the inspector is a slide-over sheet.
- **3D:** three + @react-three/fiber + drei, lazy-loaded so three.js only downloads when the 3D view is used. Loads `/models/anatomy/body.glb` (not committed). Draco decoders live in `public/models/anatomy/draco/`; Meshopt decoding is bundled. Nothing comes from a CDN.
- **2D fallback:** front and back maps projected from the same reference shapes, used automatically when WebGL 2 is unavailable or the GLB is missing or fails to load. Pins work the same way.
- **Placeholder body:** `VITE_ANATOMY_PLACEHOLDER=true npm run dev` renders a procedural body (capsules, spheres and rings named by region id) so the 3D path can be developed without the real asset.
- **Keyboard:** the region tree is a full `role="tree"`. In the viewer, arrows rotate (3D) or pan (2D), `+`/`-` zoom, `0` resets, `F` frames the selection, `Esc` cancels pin placement.
- **Driving the viewer from other modules:** dispatch `window.dispatchEvent(new CustomEvent("orbit:anatomy", { detail: { action: "selectRegion", payload: "knee_left" } }))`. Actions: `selectRegion`, `focusRegion`, `setPreset`, `toggleLayer`, `isolate`, `setSection`, `frameSelection`, `resetView`. The Crew assistant's flat snake_case form (`{ action: "focus_region", region: "knee_left" }`) is accepted too. See `modules/anatomy/public.ts`.
- **API:** `GET /api/anatomy/regions`, `GET|POST /api/anatomy/pins`, `PATCH|DELETE /api/anatomy/pins/{id}`, `GET /api/anatomy/regions/{id}/references?crew=`.
- **Dev overrides:** `?state=loading|empty|error`, and `?webgl=off` to force the 2D fallback.


## Crew status (`/crew`)

The ranked roster opens profiles with latest vitals, 24-hour sparklines, live telemetry, Recharts trends, a searchable health log, and editable crew review bands. Deep links: `/crew/:id/log` and `/crew/:id/bands`. Overview logging defaults to the active viewer; logging from another profile requires explicitly choosing the subject. Paired blood-pressure readings share a `pairId`; partial failures can retry the remaining reading.

- **Product rules:** inclusive min/max bands; readings outside by at most 10% of the span are caution, beyond that critical. Stale values become no-data. Wellbeing never drives ranking. Alerts require the configured consecutive count. Trend comparisons use daily means over 7 versus 21 days.
- **Visibility:** stress, fatigue and sleep quality are filtered in mock services and at rendering boundaries. Viewer changes clear old query results. There is no sign-in on this device. Visibility rules control what the screen shows; they are not security. The server must enforce the same visibility and write policies.
- **API:** services use the brief's `/api/crew/*` and `/api/alerts/*` contracts, with `X-Orbit-Viewer` on JSON requests. Native EventSource cannot set headers, so `/api/telemetry/stream` receives `crew` and `viewer` query parameters. Reconnection backs off from 1 to 30 seconds. No third-party hosts are contacted.
- **Synthetic mode:** 30 days of seeded data, relative to page-load time. TALON is critical, HALO caution, IRIS stale, VEGA nominal. HALO's demo SpO₂ band is 91.8–100: the brief's example 94–100 band would make 91–92 critical under its specified formula. These are synthetic product settings, never clinical guidance. Mock writes are session-memory only and reset on reload; persistent real records belong to the backend.
- **Development states:** append `?state=loading`, `?state=empty`, or `?state=error` to overview or profile routes. Browser offline mode pauses the demo wearable; locally loaded mock screens remain usable. This module does not install a service worker or guarantee a cold offline page load.
- **Checks:** `npm test` covers status boundaries, missing/stale readings, wellbeing exclusion, sustained trends, scenario ranking, privacy, and acknowledgements. Run `npm run typecheck`, `npm run build`, and `npm run lint` before integrating.

Backend integration is required to validate real writes, permission enforcement and wearable SSE. Profile queries follow pagination cursors with cancellation and repeated-cursor protection.

### React crew development

Run `npm run dev:crew` to open the React crew app at `http://127.0.0.1:5173/crew`. After installing dependencies or merging changes to `vite.config.ts`, restart the dev server so it loads the current plugin configuration. `virtual:pwa-register` is generated by `vite-plugin-pwa`; it is not a physical file. The production build retains offline precaching and update notifications.
