---
name: Sarap
description: Offline expert search for AIID, set as an Almaty modernist smalt mosaic.
colors:
  smalt: "#23308a"
  smalt-deep: "#18215f"
  smalt-soft: "#34429f"
  turquoise: "#0e8a84"
  turquoise-deep: "#0a6b66"
  turquoise-glow: "#5fd6cb"
  ochre: "#e3a333"
  ochre-soft: "#f0c46a"
  ochre-deep: "#8a5a06"
  terracotta: "#b8462e"
  terracotta-soft: "#f2d4cb"
  concrete: "#e7e5de"
  plaster: "#f8f7f3"
  grout: "#14161b"
  seam: "#cbc8be"
  slate: "#424754"
  pebble: "#5d6270"
  stone: "#6f7480"
  mist: "#aab3db"
  free: "#0a6b66"
  partial: "#c98a12"
  busy: "#8b8f99"
typography:
  display:
    fontFamily: "Unbounded, Golos Text, system-ui, sans-serif"
    fontSize: "76px"
    fontWeight: 300
    lineHeight: 1.02
    letterSpacing: "-0.035em"
  score:
    fontFamily: "Unbounded, Golos Text, system-ui, sans-serif"
    fontSize: "128px"
    fontWeight: 300
    lineHeight: 0.8
    letterSpacing: "-0.04em"
    fontFeature: "tnum"
  headline:
    fontFamily: "Unbounded, Golos Text, system-ui, sans-serif"
    fontSize: "48px"
    fontWeight: 300
    lineHeight: 1.08
    letterSpacing: "-0.03em"
  readback:
    fontFamily: "Unbounded, Golos Text, system-ui, sans-serif"
    fontSize: "34px"
    fontWeight: 300
    lineHeight: 1.55
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Unbounded, Golos Text, system-ui, sans-serif"
    fontSize: "32px"
    fontWeight: 300
    lineHeight: 1.1
    letterSpacing: "-0.025em"
  name:
    fontFamily: "Unbounded, Golos Text, system-ui, sans-serif"
    fontSize: "22px"
    fontWeight: 400
    lineHeight: 1.25
    letterSpacing: "-0.02em"
  body:
    fontFamily: "Golos Text, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.5
  body-large:
    fontFamily: "Golos Text, system-ui, sans-serif"
    fontSize: "18px"
    fontWeight: 400
    lineHeight: 1.625
  label:
    fontFamily: "Golos Text, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 500
    lineHeight: 1.4
  button:
    fontFamily: "Golos Text, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 600
    lineHeight: 1.2
rounded:
  none: "0px"
spacing:
  grout-hair: "1px"
  grout: "2px"
  tile-gap: "6px"
  md: "24px"
  lg: "40px"
  section: "64px"
components:
  button-primary:
    backgroundColor: "{colors.ochre}"
    textColor: "{colors.grout}"
    rounded: "{rounded.none}"
    typography: "{typography.button}"
    padding: "0 48px"
    height: "64px"
  button-primary-hover:
    backgroundColor: "{colors.ochre-soft}"
  button-dark:
    backgroundColor: "{colors.grout}"
    textColor: "{colors.plaster}"
    rounded: "{rounded.none}"
    padding: "0 24px"
    height: "48px"
  button-dark-hover:
    backgroundColor: "{colors.smalt}"
  button-outline:
    backgroundColor: "{colors.plaster}"
    textColor: "{colors.grout}"
    rounded: "{rounded.none}"
    padding: "0 24px"
    height: "48px"
  button-outline-hover:
    backgroundColor: "{colors.grout}"
    textColor: "{colors.plaster}"
  input-query:
    backgroundColor: "{colors.plaster}"
    textColor: "{colors.grout}"
    rounded: "{rounded.none}"
    padding: "0 32px"
    height: "88px"
  select-dark:
    backgroundColor: "{colors.smalt-deep}"
    textColor: "{colors.plaster}"
    rounded: "{rounded.none}"
    height: "48px"
  nav-tab:
    backgroundColor: "{colors.smalt-deep}"
    textColor: "{colors.plaster}"
    rounded: "{rounded.none}"
    padding: "0 20px"
    height: "44px"
  nav-tab-active:
    backgroundColor: "{colors.plaster}"
    textColor: "{colors.smalt}"
  tile-skill:
    backgroundColor: "{colors.turquoise}"
    textColor: "{colors.plaster}"
    rounded: "{rounded.none}"
  tile-place:
    backgroundColor: "{colors.ochre}"
    textColor: "{colors.grout}"
    rounded: "{rounded.none}"
  tile-condition:
    backgroundColor: "{colors.smalt}"
    textColor: "{colors.plaster}"
    rounded: "{rounded.none}"
  tile-excluded:
    backgroundColor: "{colors.terracotta-soft}"
    textColor: "{colors.terracotta}"
    rounded: "{rounded.none}"
  panel-best:
    backgroundColor: "{colors.smalt}"
    textColor: "{colors.plaster}"
    rounded: "{rounded.none}"
    padding: "40px"
  card-also-fit:
    backgroundColor: "{colors.plaster}"
    textColor: "{colors.grout}"
    rounded: "{rounded.none}"
    padding: "28px"
---

# Design System: Sarap

## Overview

**Creative North Star: "Smalta"**

Sarap is laid out like an Almaty modernist mosaic panel: a smalt-ultramarine shell over a concrete ground, with turquoise, ochre and terracotta tesserae set in near-black grout. Everything the engine understood becomes a tile. The query is read back as a sentence of coloured tesserae, each expert's score is a 10×10 field filled one tile per percent, availability is a square tile beside a word, and the brand mark itself is five tiles forming an S.

The system is flat, square and dense in the way a mosaic is dense: small gaps (1–2 px grout) between solid fields, never soft cards on white. Display type is a wide modernist face set light and tight; UI text is a calm humanist sans. Colour carries meaning, not decoration: turquoise is a confirmed skill or a strong score, ochre is place or the primary action or a medium score, smalt is a condition or the shell, terracotta is what was excluded, grey is weak.

It refuses the category default of a white SaaS list with a blue pill and a progress bar. A weak result is drawn grey and listed plainly; it never gets the blue panel.

**Key Characteristics:**
- Square everything: zero radius on buttons, inputs, selects, checkboxes, panels, tiles.
- Mosaic grammar: solid tiles separated by thin grout gaps (1–2 px), dark 2 px grout rules under section titles.
- Meaning by tile colour, always paired with a word or a number.
- Light, wide Unbounded numerals at very large sizes; tabular figures for every score and count.
- Smalt shell top and best-candidate panel; concrete page; plaster for raised light surfaces; grout footer.

## Colors

A cool ultramarine shell and warm concrete ground, lit by three mineral tile colours that each carry one meaning.

### Primary
- **Smalt Ultramarine** (smalt): the header shell, the best-candidate panel, condition tiles in the readback, filter-only notice edge. `smalt-deep` is the darker course used for the synthetic-data strip, inactive nav tabs, the dark select and the score half of the best panel (at 45% over smalt). `smalt-soft` appears only in the edge tile strips and the frieze.

### Secondary
- **Smalt Turquoise** (turquoise): confirmed skill tiles, strong scores (≥70) on light, checked checkbox, caret and focus outline. `turquoise-deep` is its text-safe shade for links, "also fit" skill tiles and strong numerals on light; `turquoise-glow` is the on-dark version (strong score tiles and numerals in the smalt panel, matched-reason tiles, "available" on dark).

### Tertiary
- **Mosaic Ochre** (ochre): the primary action, city and industry tiles, medium scores (40–69), text selection, focus on dark, the notice tile. `ochre-soft` is its hover and on-dark medium numeral; `ochre-deep` is medium score text on light and the weak-match notice border.
- **Fired Terracotta** (terracotta / terracotta-soft): excluded terms (struck through on a pale terracotta ground), "not fit" hover, feedback errors on light.

### Neutral
- **Concrete** (concrete): page background and scrollbar track.
- **Plaster** (plaster): raised light surfaces: query slab, "also fit" cards, light selects, outline buttons, active nav tab, row hover.
- **Grout** (grout): body text, 2 px rules, outline borders, the footer.
- **Seam** (seam): hairline row dividers, the 2 px gap behind the "also fit" pair, dashed idle and empty states.
- **Slate / Pebble / Stone** (slate, pebble, stone): secondary text, meta text, weak score text and placeholders, from darkest to lightest.
- **Mist** (mist): weak score numeral on dark.
- **Availability** (free, partial, busy): square status tiles for available, partially available and busy.

### Named Rules
**The One Meaning Per Tile Rule.** Turquoise means skill or strong; ochre means place, action or medium; smalt means condition; terracotta means excluded; grey means weak or busy. Never reuse a tile colour for a different meaning on the same screen.

**The Weak Looks Weak Rule.** Score colour comes only from thresholds (≥70 strong, ≥40 medium, below weak). A weak match gets grey tiles and no smalt best-candidate panel.

## Typography

**Display Font:** Unbounded (300, 400, 500; fallback Golos Text, system-ui)
**Body Font:** Golos Text (400, 500, 600; fallback system-ui)

**Character:** A wide, geometric modernist display face set light with tight negative tracking, against a plain, legible humanist sans. Both are self-hosted via Fontsource and cover Cyrillic and Kazakh letters.

### Hierarchy
- **Score** (300, 72px mobile / 128px desktop, line-height 0.8, -0.04em, tabular): the best candidate's percent; 48–56px in "also fit", 28px in rows. The formula numerals use 56/80px.
- **Display** (300, 38px / 76px, 1.02, -0.035em): the search page title; inner pages use 40/64px.
- **Headline** (300, 34px / 48px, 1.08, -0.03em): the best candidate's name.
- **Readback** (300, 24px / 34px, 1.6/1.55, -0.02em): the query as read by the engine, with tile spans.
- **Title** (300, 26px / 32px, 1.1, -0.025em): section titles ("Also fit", "Other candidates", Data and Analytics sections).
- **Name** (400, 22px in cards, 18px in rows, -0.02em): expert names in Unbounded regular.
- **Body** (400, 15–18px, ~1.5): positions, reasons, facts, hero subline (18px, relaxed).
- **Label** (500, 13–14px): legend, meta, status words; language switch 13px 600 with 0.06em tracking.
- **Button** (600, 15px; 18px on the large primary).

### Named Rules
**The Light Display Rule.** Unbounded is set at 300 for everything large; 400 only for expert names. Nothing in the system goes heavier than 600.

**The Tabular Rule.** Every score, count, year and timing uses tabular figures.

## Layout

A single centred column, max 1120px with 16px side gutters (24px from `sm`). The smalt header band runs full width with the content column inside it; the readback, best panel, "also fit" pair, candidate rows and formula stack below on concrete with ~64px between sections. The query form is 920px wide and centred.

The best-candidate panel splits into two flexible columns from `md` (identity and facts left, score mosaic and reasons right); below `md` it stacks and the actions move to a strip at the bottom. "Also fit" is a two-up grid from `md`. Candidate rows wrap fluidly: name, city, status, mini mosaic with numeral, feedback icons. Phones show everything in one column, three example queries instead of five and one recent query. Touch targets are at least 44px.

## Elevation & Depth

Flat. Depth comes from tile colour and grout, not shadow. The `.tile` treatment gives coloured tiles a thin bevel of light (`inset 0 1px 0 rgb(255 255 255 / 0.22), inset 0 -1px 0 rgb(0 0 0 / 0.12)`), like a real tessera. Exactly two real shadows exist: the query slab and the expert dialog.

### Shadow Vocabulary
- **Query slab** (`box-shadow: 0 22px 44px -18px rgb(8 12 40 / 0.7)`): only under the search input in the header.
- **Dialog** (`box-shadow: 0 30px 70px -20px rgb(5 8 30 / 0.6)`): the expert dialog over the page.
- **Tessera bevel** (inset, above): primary button, skill/place/condition tiles, matched-reason and place-reason tiles, formula multipliers.

### Named Rules
**The Only Slab Rule.** No card or panel casts a shadow. The query is the one raised object on the page.

## Shapes

Squares only: radius is zero everywhere (`rounded-none` on native inputs and selects). Borders are 2px solid grout (outline buttons, light selects, checkbox, section rules) or 1px seam hairlines between rows. The query input has a 6px ochre bottom edge that turns turquoise on focus. Groups of solid fields are separated by grout gaps: 2px between nav tabs and language buttons, 2px seam behind the "also fit" pair, 1–2px between score tiles, 6px between skill tiles. Status, legend and reason markers are 10–12px squares, never dots or circles.

## Components

### Buttons
- **Shape:** square (0px), 600 weight, 150ms transition on background, colour, border and transform.
- **Primary:** ochre with tessera bevel, grout text, 64px tall with 48px side padding on the main search action, full width on phones; hover ochre-soft, active presses down 1px. Always paired with a square arrow icon on search.
- **Dark:** grout fill, white text; hover smalt.
- **Outline:** 2px grout border on plaster; hover inverts to grout fill and white text. **Outline-dark** on smalt: 2px white/55 border, hover fills ochre with grout text.
- **Quiet:** transparent, turquoise-deep text.
- **Feedback icons:** 44px square outline buttons; "fit" hovers to turquoise, "not fit" to terracotta.
- **Focus:** 3px turquoise outline with 3px offset; ochre on dark surfaces.

### Inputs / Fields
- **Query slab:** plaster, 68px / 88px tall, 18px / 24px text, Unbounded light placeholder in stone, 6px ochre bottom border, turquoise on focus, turquoise caret.
- **Select:** native select with a drawn square chevron; light tone has a 2px grout border on plaster, dark tone is smalt-deep with white text; 48px tall.
- **Checkbox:** 22px square, 2px grout border on plaster; checked fills turquoise with a white tick. On dark: white/80 border, checked fills ochre with a grout tick.

### Navigation
Section tabs are joined tiles with 2px gaps: inactive smalt-deep/55 with white text, active plaster with smalt text. The EN/RU/KK switch uses the same joined tiles with the active language in ochre. On phones the tabs drop to their own full-width row.

### Readback Tesserae (signature)
The parsed query is printed as a light Unbounded sentence where each understood piece is an inline tile: **skill** turquoise with white text, **place** (city, industry) ochre with grout text, **condition** smalt with white text, **excluded** pale terracotta with terracotta struck-through text. Tiles wrap with `box-decoration-break: clone`. Under it, a 2px grout rule carries a square-swatch legend and the result count and timing in tabular figures.

### Score Mosaic (signature)
A 10×10 SVG field, one tile per percent, filled bottom-up like a mural. Tile colour follows strength (strong turquoise, medium ochre, weak grey; on dark: glow turquoise, soft ochre, mist-blue), with three deterministic shade variations per strength so the field reads as smalt rather than a flat bar. Empty tiles are `#d8d5cb` on light, white/11% on dark. Sizes: hero 15px tiles with 2px gaps plus a 40/70 threshold scale; card 7px / 1.5px; mini 4px / 1px for candidate rows. On the best candidate the tiles set one by one (420ms each, 7ms stagger); reduced motion shows them at once. The score numeral sits beside it in the matching strength colour.

### Best-Candidate Panel
Smalt panel, no radius, no shadow. Left: name in headline type, position, organisation, a facts list on white/20 hairlines (city, industry, experience, status), skill tiles (matched solid turquoise, related as 2px glow-turquoise outline). Right, on smalt-deep/45: hero score mosaic, "Why it fits" with reasons on white/15 hairlines, each led by a square marker (solid glow for a matched skill, outline for related, ochre for place, white/45 otherwise).

### Also Fit and Candidate Rows
"Also fit" is a pair of plaster slabs set in a 2px seam frame, each with the card mosaic and numeral, name, position, turquoise-deep skill tiles, meta and a "details" link underlined in turquoise-deep that turns ochre on hover. Other candidates are rows on 1px seam lines under a 2px grout rule, hover plaster, with the mini mosaic and a 28px numeral.

### Availability Tiles
A 10px square in free, partial or busy beside the status word; on dark, "available" uses turquoise-glow. The colour never stands alone.

### Notices
- **Synthetic data strip:** always present under the header, smalt-deep with a small ochre square and white 14px text.
- **Weak match:** 2px ochre-deep border on ochre-soft/60 with an ochre-deep square; results become a plain "closest" row list.
- **Filter only:** 2px smalt border on plaster with a smalt square; scores are hidden.
- **Idle / nobody found:** 2px dashed seam box; idle shows a five-square tile row.

### Mark, Edge Strips and Frieze (signature)
- **Sarap mark:** five 10px tiles forming an S: two ochre on top (the query), white in the middle (where they meet), two turquoise below (the expert). Tiles can lay in sequence as a loading state. Locked up with the unchanged AIID logo.
- **Header edge strips:** seeded fields of 19px tiles on a 22px grid along both header edges, densest at the edge and thinning toward the centre, in smalt-deep and smalt-soft with rare turquoise and ochre. Hidden on phones; 110px wide from `sm`, 198px from `xl`.
- **Palette frieze:** an 8px row of 9px tiles in turquoise, ochre, terracotta, smalt-soft and plaster, separating the header from the notice strip and opening the grout footer.

### Loading
Skeleton blocks breathe between full and 55% opacity on `#d9d6cd` (white/12 on dark); tile rows lay in left to right. All motion stops under `prefers-reduced-motion`.

## Do's and Don'ts

### Do:
- **Do** keep every corner square (0px) and separate solid fields with 1–2px grout or seam gaps.
- **Do** encode meaning with one tile colour per role: turquoise skill/strong, ochre place/action/medium, smalt condition, terracotta excluded, grey weak.
- **Do** pair every colour signal with a word or number (status tile plus word, score mosaic plus numeral).
- **Do** set large type in Unbounded 300 with negative tracking and tabular figures for numbers.
- **Do** use the score thresholds 40 and 70 from the shared `strengthOf` for any new score display.
- **Do** keep the synthetic-data strip visible on every screen.

### Don't:
- **Don't** add border radius, pills or circles; status markers and legends are squares.
- **Don't** add shadows to cards or panels; only the query slab and the dialog are raised.
- **Don't** show a weak result in the smalt best-candidate panel or in strong colours.
- **Don't** use type heavier than 600.
- **Don't** draw score as a progress bar or ring; use the 10×10 mosaic.
- **Don't** alter the AIID logo in the lock-up.
