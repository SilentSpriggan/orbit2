# NASA-TEST interface

The frontend from `NASA-TEST/dist` was imported into the tracked `ui/`
directory, then reduced to Anatomy Lab, crew status and health tracking,
the voice assistant, and the offline evidence library. Shared HTML, CSS,
JavaScript, fonts, images, libraries, and anatomy/avatar models retain the source design. No NASA-TEST environment files,
credentials, runtime records, Git metadata, or node_modules were imported.

Edit `ui/` directly to change the shared design. `DESIGN.md` records the original
design system before the feature reduction; third party notices and font licenses are retained here, with
model and library notices next to the corresponding assets in `ui/`.

`ui/design-tokens.css` provides the shared light palette for both the main site
and the React voice assistant. The voice shell uses the same brand, navigation,
spacing, and Public Sans typography; `src/styles/tokens.css` maps those shared
colors to its controls, cards, dialogs, transcript, and status indicators.

Run `npm ci`, then `npm run dev` to open this interface at http://localhost:5173.
`npm run build` copies it to `dist/` and builds the React voice workspace at
`dist/voice/`. `npm run preview` serves both outputs. The FastAPI server also
serves both after building. Use `npm run dev:voice` for React voice development.

The UI uses hash navigation and local browser records. Offline preparation is
available in the evidence library. The solar-system map, Earth-link simulator,
supplies inventory, standalone neural-model screen, overview, body-systems
explainer, mission brief, and account/service integration screens were removed.
Health tracking includes profiles, vitals, trends, wellbeing, exercise, skin and
wounds, assessments, daily routines, and entered health risk readings.
Existing browser records are preserved. Pages added since the import (Collect Vitals and SCOPE) are listed in the root README. The floating ElevenLabs assistant and
onboard-assistant API contracts remain separate from ORBIT's local voice API.
The existing Pipecat voice workspace remains at `/voice/` in the production
build. Development and preview proxy `/api/*` to https://localhost:8443.

To pull the shared UI: `git switch main`, `git pull origin main`, `npm ci`, then
`npm run dev`. The full 3D geometry is committed so no separate asset download
or local NASA-TEST folder is required.
