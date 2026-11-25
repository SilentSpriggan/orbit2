---
name: ORBIT Crew Health
description: A calm, record-like health workspace shared by a crew on one large iPad.
colors:
  mission-blue: "#1f5fae"
  mission-blue-deep: "#1a528f"
  mission-blue-tint: "#edf3fb"
  cabin-ink: "#121c2b"
  cabin-muted: "#5d6978"
  station-white: "#f7f8fa"
  surface: "#ffffff"
  hairline: "#e8ebf0"
  control-line: "#dfe3ea"
  notice-tint: "#f0f4f8"
  deep-orbit-navy: "#0e213c"
  toast-navy: "#101d32"
  urgent-text: "#a92a20"
  urgent-tint: "#fdecea"
  review-text: "#7d4e14"
  review-tint: "#fdf3e3"
  review-line: "#f0d9b5"
  clear-text: "#1b5e50"
  clear-tint: "#e7f4f0"
  response-red: "#9e433b"
  response-line: "#dfc4c0"
typography:
  display:
    fontFamily: "Public Sans, Arial, sans-serif"
    fontSize: "25px"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.7px"
  headline:
    fontFamily: "Public Sans, Arial, sans-serif"
    fontSize: "26px"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.01em"
  title:
    fontFamily: "Public Sans, Arial, sans-serif"
    fontSize: "15px"
    fontWeight: 600
    lineHeight: 1.5
    letterSpacing: "-0.2px"
  body:
    fontFamily: "Public Sans, Arial, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.55
    fontFeature: "tnum"
  label:
    fontFamily: "Public Sans, Arial, sans-serif"
    fontSize: "12px"
    fontWeight: 600
    lineHeight: 1.5
    letterSpacing: "0.02em"
  metric:
    fontFamily: "Public Sans, Arial, sans-serif"
    fontSize: "31px"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-1.4px"
    fontFeature: "tnum"
rounded:
  sm: "6px"
  md: "8px"
  lg: "12px"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  2xl: "32px"
components:
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.cabin-ink}"
    rounded: "{rounded.md}"
    padding: "9px 14px"
    height: "40px"
  button-secondary-hover:
    backgroundColor: "{colors.station-white}"
  button-primary:
    backgroundColor: "{colors.mission-blue}"
    textColor: "{colors.surface}"
    rounded: "{rounded.md}"
    padding: "9px 14px"
    height: "40px"
  button-primary-hover:
    backgroundColor: "{colors.mission-blue-deep}"
  button-small:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.cabin-ink}"
    rounded: "{rounded.md}"
    padding: "7px 11px"
    height: "34px"
  text-button:
    textColor: "{colors.mission-blue}"
    padding: "4px 0"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.cabin-ink}"
    rounded: "{rounded.md}"
    padding: "10px 11px"
    height: "40px"
  nav-item:
    textColor: "{colors.cabin-muted}"
    rounded: "{rounded.md}"
    padding: "8px 10px"
    height: "38px"
  nav-item-active:
    backgroundColor: "{colors.mission-blue-tint}"
    textColor: "{colors.mission-blue}"
  panel:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.cabin-ink}"
    rounded: "{rounded.md}"
    padding: "20px"
  notice:
    backgroundColor: "{colors.notice-tint}"
    textColor: "{colors.cabin-muted}"
    rounded: "{rounded.md}"
    padding: "12px 15px"
  status-pill-urgent:
    backgroundColor: "{colors.urgent-tint}"
    textColor: "{colors.urgent-text}"
    rounded: "{rounded.pill}"
    padding: "3px 8px"
  status-pill-review:
    backgroundColor: "{colors.review-tint}"
    textColor: "{colors.review-text}"
    rounded: "{rounded.pill}"
    padding: "3px 8px"
  status-pill-clear:
    backgroundColor: "{colors.clear-tint}"
    textColor: "{colors.clear-text}"
    rounded: "{rounded.pill}"
    padding: "3px 8px"
  hero:
    backgroundColor: "{colors.deep-orbit-navy}"
    textColor: "{colors.surface}"
    rounded: "{rounded.lg}"
  toast:
    backgroundColor: "{colors.toast-navy}"
    textColor: "{colors.surface}"
    rounded: "{rounded.md}"
    padding: "12px 20px"
---

# Current refinements — version 1.17

The following changes define the current surface and take precedence over the older baseline documented below. The application remains a calm, light crew-health workspace using locally bundled Public Sans, with colours reserved for actions and meaningful status.

| Token | Current value |
| --- | --- |
| Paper | `#f3f5f6` |
| Ink | `#172b38` |
| Muted text | `#596975` |
| Action blue | `#245d82` |
| Selection tint | `#e9f0f5` |
| Surface divider | `#dfe5e8` |
| Control border | `#cbd5dc` |

The workspace uses 12-pixel panel radii, 8-pixel controls, generous section spacing and no resting card shadows. The floating companion uses restrained elevation, a 62 × 64-pixel compact portrait, and an expanded panel up to 404 pixels wide. The expanded portrait scales with viewport height; conversation content scrolls independently and its composer stays available. Smaller devices retain a compact launcher and viewport-bounded conversation panel. The old permanent assistant column described below is historical.

The skin, eyes, hair, fabric and equipment each have distinct material responses. A softly shaded gray studio background replaces the navy avatar backdrop. The portrait is functional 3D: rotation, expressions and gestures are retained. Do not substitute a photograph or video for the interactive model.

Motion serves feedback. One 240-ms companion opening uses a short scale/translation; controls use 160-ms colour and press feedback. Reduced-motion removes spatial animation and follows the existing avatar pause preference. Typography is at least 12 pixels in the added theme. Touch targets are at least 44 pixels on coarse-pointer devices.

The current stylesheet is `ui/studio.css` (copied to `dist/studio.css` by the build). Its graphics and validation limits were described in a `docs/AVATAR_STUDIO_UPGRADE.md` that was not carried over into this repository.

---

# Design System: ORBIT Crew Health

## Overview

**Creative North Star: "The Flight Logbook"**

ORBIT reads like a well-kept flight log. Each value has a date, a unit and a source, and the page leads with whoever needs attention. The system is light, flat and quiet: white panels on a pale cool page, hairline borders, one blue for action, and dark ink for everything that is read. Decoration is almost absent. The one exception is the navy hero with the ISS aurora photograph on the overview, which places the record in its mission.

Density is moderate. These are working screens for a crew using a shared iPad, so the layout favours scannable panels, tabular figures and short labelled values over large display type. Colour is held back until it means something. Amber, red and green appear only as status, and always next to a word that says the same thing.

The voice of the interface carries into the visuals. Limits are stated, not hidden: notices sit in plain tinted boxes beside the data they qualify, and synthetic data is always marked.

**Key Characteristics:**
- One typeface, Public Sans, used at every level, with tabular numerals throughout.
- A flat white-on-pale-grey surface model with 1px hairlines and a barely visible 1px shadow.
- Mission Blue is the only accent for action and selection.
- Status colours are reserved and always paired with a text label.
- 8px corners almost everywhere, with pills for status and circles for crew avatars.
- A three-column frame: navigation on the left, the record in the middle, the crew assistant dock on the right.

## Colors

A cool, low-saturation neutral base with a single confident blue, plus a reserved set of status tints.

### Primary
- **Mission Blue** (`mission-blue`): primary buttons, links and text buttons, the active navigation item, selected options, focus-adjacent states and chart lines. It is the only colour that means "you can act here".
- **Deep Mission Blue** (`mission-blue-deep`): hover state of primary buttons only.
- **Mission Blue Tint** (`mission-blue-tint`): background of the active navigation item, selected list options, role badges and soft setup banners.

### Neutral
- **Cabin Ink** (`cabin-ink`): all headings, body text and values.
- **Cabin Muted** (`cabin-muted`): secondary text such as subtitles, captions, labels, notice text and inactive navigation (5.6:1 on white).
- **Station White** (`station-white`): the page background behind panels, and the hover state of secondary controls.
- **Surface** (`surface`): panels, cards, the sidebar, the top bar, modals and inputs.
- **Hairline** (`hairline`): borders of panels, cards and dividers.
- **Control Line** (`control-line`): borders of buttons and inputs, one step firmer than the hairline.
- **Notice Tint** (`notice-tint`): background of limitation and data notices.
- **Deep Orbit Navy** (`deep-orbit-navy`): the overview hero behind the ISS photograph.
- **Toast Navy** (`toast-navy`): toasts, the only floating dark surface.

### Status
Status colours appear in pills, priority banners and the left edge of crew cards, never as decoration.
- **Urgent** (`urgent-text` on `urgent-tint`): emergency checklists in progress and urgent signs.
- **Needs review** (`review-text` on `review-tint`, edged with `review-line`): trend alerts, review prompts, and the reminder to choose who is viewing.
- **Clear** (`clear-text` on `clear-tint`): "No flags" and "Recorded" states.
- **Medical response** (`response-red` with a `response-line` border): the Medical response button in the top bar only.

### Named Rules
**The One Accent Rule.** Mission Blue is the only accent. Do not add a second brand colour; new meaning comes from a status colour or from text.

**The Status Means Status Rule.** Red, amber and green are reserved for crew state. They never decorate, never mark categories, and never appear without a word that says the same thing.

## Typography

**Display Font:** Public Sans (with Arial, sans-serif)
**Body Font:** Public Sans (with Arial, sans-serif)
**Label/Mono Font:** Public Sans. IBM Plex Mono is bundled, but the theme maps `--mono` to the sans, so labels use Public Sans too.

**Character:** A plain, civic sans in the style of a government form, sturdy at small sizes. Hierarchy comes from weight and size steps, not from a second family.

### Hierarchy
- **Display** (600, 25px, 1.25, -0.7px): the overview hero headline only.
- **Headline** (700, 26px, 1.2): page titles, for example "Crew status" or "Sleep & wellbeing". Drops to 23px on phones.
- **Title** (600, 15px, 1.5): panel and section headings. Modal titles step up to 22px at 600.
- **Body** (400, 14px, 1.55): running text, subtitles and form values. Keep paragraphs near 65–75ch inside panels.
- **Small prose** (400, 13px): notices, routine items, priority explanations and table cells.
- **Metadata** (400, 12px): panel subtitles, units, timestamps and helper text. Nothing visible goes below 12px.
- **Label** (600, 12px, 0.02em): stat-box captions, table headers, navigation group captions and form labels. Some labels are uppercase in the current screens.
- **Metric** (600, 31px, -1.4px, tabular): the latest value on a metric card. Stat boxes use the same style at 24–28px.

### Named Rules
**The Tabular Rule.** Every number in the app uses tabular numerals (`font-variant-numeric: tabular-nums` on body), so columns of readings line up.

**The 12px Floor Rule.** No visible text is smaller than 12px. The original `scripts/build-theme-scale.py`, which raised smaller source sizes to 12px, was not carried over into this repository; `ui/theme-scale.css` holds its output, so keep new text at 12px or larger by hand.

**The Unit Beside the Value Rule.** A value is always followed by its unit in smaller muted text ("64 bpm", "7.9 hrs average"). It never stands alone.

## Layout

The frame has three columns:
- **Navigation sidebar:** 216px, 202px from 1100 to 1379px, and an off-canvas drawer below 1100px.
- **Main record:** fluid.
- **Crew assistant dock:** on the right. 336px, 314px from 1100 to 1379px, 292px from 760 to 1099px, and below 760px it moves under the content.

The top bar is 60px tall. Main content is padded 28px at the top, 32px at the sides and 40px at the bottom, or 20px and 16px on phones.

Pages follow one order:
1. A page heading with title, subtitle and up to two actions on the right.
2. Optional notices for demo data or setup.
3. A priority banner when something needs attention.
4. A strip of stat boxes.
5. Panels.

Stat strips and card grids use `auto-fit` columns with a minimum width (150px for stat tiles, 270px for crew cards), so they reflow from iPad landscape to portrait without breakpoints. Gaps are 12–16px, and panels are padded 16–25px.

The target device is a large iPad shared by the crew, in landscape (1180–1366px wide) and portrait (820–1024px wide). Check every new screen at 1024, 1180 and 1366 wide, and at 820 portrait.

## Elevation & Depth

The system is flat, with tonal layering. Depth comes from white surfaces on the Station White page, divided by hairlines. Every panel carries the same near-invisible shadow, which reads as a crisp edge rather than a lift. Real elevation is kept for things that float above the page: toasts and modals.

### Shadow Vocabulary
- **Hairline lift** (`box-shadow: 0 1px 2px #121c2b0a`): every panel, metric card and stat box.
- **Toast** (`box-shadow: 0 5px 25px rgba(6, 18, 34, 0.145)`): the toast only.
- **Modal** (`box-shadow: 0 30px 100px rgba(5, 19, 40, 0.208)`): dialogs over a dimmed, blurred page.

### Named Rules
**The Flat-By-Default Rule.** Surfaces at rest use only the hairline lift. Never add hover lifts, glows or coloured shadows to cards.

## Shapes

Soft, consistent rectangles:
- **8px corners:** panels, buttons, inputs, notices, navigation items, mood options and modals.
- **12px corners:** the overview hero, the only larger surface.
- **Full pills (999px):** status pills, counts and role badges.
- **Circles:** crew avatars, which show the crew number ("01").
- **6px corners:** small inner controls, such as the avatar controls in the assistant dock.

Borders are always 1px: Hairline for surfaces, Control Line for controls.

Status cards are the one place a status colour runs down the left edge (3px): crew cards on Crew status and wound cards on Skin & wounds. The edge always matches the status pill on the same card. No other card or callout gets a coloured side bar; callout strips carry their cue in a tinted icon square instead.

## Components

### Buttons
Calm and exact: hairline-bordered, semibold labels, one primary per area.
- **Shape:** gently rounded (8px).
- **Primary:** Mission Blue fill with white 13px semibold text, padded 9px 14px, 40px tall. Hover darkens to Deep Mission Blue. Use one per page heading or dialog footer.
- **Secondary:** white with a Control Line border and Cabin Ink text. Hover fills Station White.
- **Small:** 11px text, padded 7px 11px, 34px tall, for in-panel actions.
- **Text button:** Mission Blue 11px semibold with no border, for "Open record →" style links. It often ends in an arrow icon.
- **Danger:** destructive confirmations in dialogs, always paired with a "Keep it" secondary button.
- **Focus:** a 3px solid #4086d4 outline, offset 4px, on every interactive element.

### Chips and pills
- **Status pill:** a full pill, 12px semibold text on a status tint, often with a 13px icon. Urgent, Needs review, Check overdue and No flags.
- **Role badge:** a full pill, Mission Blue on Mission Blue Tint, for example "Crew leader" or "Medical officer".
- **Count:** a full pill, Cabin Muted on Station White, beside navigation items.

### Cards / Containers
- **Corner Style:** 8px.
- **Background:** Surface on the Station White page.
- **Shadow Strategy:** the hairline lift only (see Elevation & Depth).
- **Border:** 1px Hairline.
- **Internal Padding:** 16–25px. Panels have a heading row (Title plus a muted subtitle) with actions on the right.
- **Stat box:** a Label caption, a Metric value and a muted line of context ("hrs average, target 8").
- **Metric card:** an icon and label row, a status word on the right, then the value, unit and a small trend line. 128px tall.

### Inputs / Fields
- **Style:** white, with a 1px Control Line border and 8px corners. Padded 10px 11px, 40px tall, with 14px text.
- **Focus:** the border turns Mission Blue, plus the global focus outline.
- **Labels:** 11px semibold Cabin Ink above the field. Helper text is 12px Cabin Muted below it.
- **Scale pickers:** mood and wellbeing scales are a row of five 8px-rounded options, each with a number and a short end label.

### Navigation
- **Sidebar:** white, with group captions at 11px semibold Cabin Muted. Items are 38px tall and 13px, with an icon.
- **Active item:** Mission Blue text on Mission Blue Tint.
- **Hover:** a Station White fill.
- **Narrow screens:** below 1100px the sidebar becomes an off-canvas drawer behind a dimmed scrim, opened from the menu button.
- **Top bar:** white with a hairline bottom border. It holds the feature finder (Station White, no border), the Medical response button, the workspace tag, the "Viewing as" button and the crew avatar.

### Notices
Plain-language limits sit beside the data they qualify. A Notice Tint box with a 1px border, 8px corners, a 16px lock or info icon, and Cabin Muted text. They are information, not warnings, and are never coloured with status hues.

### Priority banner
The first thing on a page when someone needs attention. A full-width row with an icon, a bold one-line reason, a muted explanation and one action button on the right. Review uses `review-tint` and `review-line`, and urgent uses `urgent-tint`.

### Toast
Toast Navy with white 13px text, 8px corners and the toast shadow, centred near the bottom. Toasts confirm what happened and what did not, for example "Report PDF downloaded. Nothing has been sent."

### Modal
A white dialog up to 650px wide over a dimmed, blurred page, with the modal shadow and a 1px border. It has a 22px title, a muted subtitle, a hairline divider, the content, and a footer with secondary buttons first and the primary last. The crew assistant's command field sits under the footer in every dialog.

## Do's and Don'ts

### Do:
- **Do** use Mission Blue (#1f5fae) only for actions, links and selection, with one primary button per area.
- **Do** give every status colour a matching word ("Needs review", "Urgent") and an icon where there is room.
- **Do** keep panels flat: white, 1px Hairline (#e8ebf0), 8px corners and the hairline lift only.
- **Do** put the unit beside every value in smaller muted text, and use tabular numerals.
- **Do** lead a page with whoever or whatever needs attention, using the priority banner before stats and panels.
- **Do** give every control a 44px touch target on touch screens. `dist/touch.css` does this under `pointer: coarse`, so add new controls there too. Keep small marks (checkboxes, inline text buttons) at their drawn size and widen the hit area with an invisible `::after`.
- **Do** keep body and label text at or above 4.5:1 contrast. Cabin Muted (#5d6978) passes on white and Station White.
- **Do** check new screens at 1024, 1180 and 1366 wide, and at 820 portrait.

### Don't:
- **Don't** add a second accent colour, gradients, gradient text or glassy blur as decoration.
- **Don't** use red, amber or green for anything except crew status, or show status by colour alone.
- **Don't** add hover lifts, glows or coloured shadows to cards. Only toasts and modals float.
- **Don't** introduce a second typeface or a monospace "technical" look. The bundled IBM Plex Mono is intentionally mapped to Public Sans.
- **Don't** add new small uppercase kickers above headings. The heading carries the section.
- **Don't** put bordered cards inside a panel. List items inside a panel are rows separated by hairlines, as condition notes are.
- **Don't** add coloured left-edge bars to cards or callouts. The 3px status edge on crew and wound status cards is the only one.
- **Don't** hard-code a grey for text. Use Cabin Muted (`var(--muted)`, 5.6:1 on white); lighter greys failed 4.5:1 across 46 rules before they were replaced.
