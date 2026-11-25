# ElevenLabs crew assistant (online)

The avatar in the Crew Assistant panel on the right of every page is the **online** assistant. It uses an ElevenLabs Conversational AI agent, so it needs internet. Voice and typed text go to ElevenLabs and its model provider. The offline assistant (the Wi-Fi icon next to the microphone) is separate; see [OFFLINE-ASSISTANT.md](OFFLINE-ASSISTANT.md).

## How the website connects

- **Agent:** the agent ID is `AGENT_ID` at the top of [`ui/assistant.js`](../ui/assistant.js). To use a different agent, change it there.
- **SDK:** the ElevenLabs browser client is bundled as `ui/vendor/elevenlabs-client.js` and loaded only when a session starts. Nothing is loaded from a CDN.
- **Voice:** WebRTC. **Text** (the **Connect text** button): WebSocket, text only.
- **Online only:** switching the top bar to **Offline** turns this assistant off.
- **Privacy:** health records and images are not sent unless the person approves it in the session (see **Record access** below).

## Client tools the agent must define

The website registers these as client tools. Each must exist in the agent's ElevenLabs configuration with the **same name**, as a **client** tool that waits for a response. If the agent calls a tool the page doesn't register, the page shows "That agent tool is not registered", pointing here.

Every tool returns a JSON string. Most return `{ status, message, … }`.

| Tool | Parameters | What it does |
|---|---|---|
| `get_current_context` | – | The current page, crew member, open form and site state |
| `get_site_capabilities` | – | The pages, features, form fields, trend metrics and anatomy controls the assistant may use |
| `get_health_summary` | – | Latest readings for the active crew member (only with record access) |
| `get_site_records` | `section`, `crew_id`, `offset`, `limit` | Paged records. `section`: `health-checks`, `conditions`, `assessments`, `medical-plan`, `profile`, `mission`, `routine`, `current-form`. `crew_id` may be `all`. Needs record access |
| `navigate_page` | `page`, `section`, `input` | Opens a website page or Health assessment section |
| `open_site_panel` | `target` | Opens a panel on the current page |
| `use_site_feature` | `feature`, `query`, `item` | Uses a named site feature, for example adding a condition note or exporting a summary (the list is in `ui/assistant-features.js`) |
| `draft_site_form` | `form`, `values_json`, `replace_existing` | Fills in a site form without saving it |
| `draft_health_check` | vitals fields, `replace_existing` | Fills in the health check form without saving it |
| `set_health_trend` | `metric`, `days` (7, 14 or 30) | Changes the Health log chart |
| `search_health_log` | `query` | Searches the health log |
| `set_routine_task` | `task`, `completed` | Ticks a Daily routine task |
| `open_body_system` | `system` | Shows a body system in the Anatomy lab |
| `control_anatomy` | `operation`, `target`, `value` | Rotates, frames, sections or layers the anatomy model |
| `highlight_health_concern` | `operation`, `report` | Highlights a reported concern on the anatomy model |
| `get_condition_reference` | `query` | MedlinePlus condition summaries, and matching Evidence library entries (`evidence_library`, `evidence_topics`) |
| `control_avatar` | `operation` | Avatar motion controls |
| `open_emergency_guide` | – | Opens the crew medical response guide |
| `request_photo_review` | `image_id` | Asks the person to approve sending a selected image |

Tools never save on the agent's say-so. Forms are filled in and wait for the person to press **Save**. Deleting, importing and sharing open a review the person must approve.

## Context the page sends on its own

While a session is open, the page sends **contextual updates**, as JSON strings, that the agent can use without calling a tool:

- `orbit_evidence_library`: Evidence library entries matching what the person just said. For each entry, it sends the title, topic, text, tracking guidance and sources, with their APA references. If the person names a topic (for example "Spacewalks"), every entry title in that topic is included.
- `orbit_condition_reference`: MedlinePlus summaries for a named condition.
- `orbit_site_action_result`: the result of a site action the person started by typing a command.
- Page and crew context whenever they change.

The agent should answer from these, cite the source, and say when nothing matches.

## Record access

Health records are not shared by default. When the agent needs them, it calls `use_site_feature` with `record-access`. That shows a review in the panel, and the person must choose **Allow** or say "Allow record access with ElevenLabs". The person can revoke access at any time. Revoking stops further sharing, but data already sent may remain with the provider.

Images work the same way: `request_photo_review` only asks. The image is uploaded only after the person chooses **Share image**.

## Changing the agent

1. Create or edit the agent in the ElevenLabs dashboard.
2. Add every tool in the table above as a client tool, with the same name and parameters.
3. Put the agent's ID in `AGENT_ID` in `ui/assistant.js`, then bump `CACHE` in `ui/sw.js` so browsers fetch the new file.
