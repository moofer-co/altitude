# Design Tokens

Every visual value used in Project Altitude. Components consume these tokens — never hardcoded values. The source of truth in code is `constants/tokens.ts`.

---

## Typography

### Font

| Token | Value |
|-------|-------|
| Primary | Inter |
| Fallback | System UI |

### Weights

| Token | Weight | Usage |
|-------|-------:|-------|
| Regular | 400 | Body text |
| Medium | 500 | Labels, buttons |
| Semibold | 600 | Headings |
| Bold | 700 | Display text |

### Type scale

| Token | Size | Line height | Weight | Usage |
|-------|-----:|------------:|--------|-------|
| display | 32 | 40 | 700 | Screen hero ("Where are you flying next?") |
| h1 | 24 | 32 | 600 | Screen headings |
| h2 | 20 | 28 | 600 | Section titles ("Weekend Escapes"), card titles |
| bodyLarge | 18 | 28 | 400 | Featured text, prices |
| body | 16 | 24 | 400 | Default text |
| bodyMedium | 16 | 24 | 500 | Emphasized body, airport names |
| bodySmall | 14 | 20 | 400 | Supporting text |
| caption | 12 | 16 | 400 | Metadata, timestamps |
| label | 12 | 16 | 500 | Tags, form labels, section headers |

Letter spacing: display uses -0.5, h1 uses -0.3. All others default.

---

## Colors

### Neutral (palette)

| Token | Hex | Usage |
|-------|---------|-------|
| white | #FFFFFF | Cards, surfaces |
| gray50 | #FAFAFA | App background |
| gray100 | #F5F5F5 | Input backgrounds, soft fills |
| gray200 | #E5E5E5 | Borders, dividers |
| gray300 | #D4D4D4 | Subtle borders |
| gray400 | #A3A3A3 | Disabled text |
| gray500 | #737373 | Tertiary text, placeholders |
| gray600 | #525252 | Secondary text |
| gray800 | #262626 | — |
| gray900 | #171717 | Primary text, headings |

### Brand / Primary (purple)

Used for primary buttons, active states, selected controls, focus, progress, and selected calendar dates.

| Token | Hex |
|-------|---------|
| primary50 | #F5F3FF |
| primary100 | #EDE9FE |
| primary200 | #DDD6FE |
| primary300 | #C4B5FD |
| primary400 | #A78BFA |
| primary500 | #7C3AED |
| primary600 | #6D28D9 |
| primary700 | #5B21B6 |

Default primary: `primary500`. Pressed: `primary600`. Soft/background: `primary50`.

### Semantic

| Role | Light | Default | Dark | Usage |
|------|-------|---------|------|-------|
| Success | #DCFCE7 | #16A34A | #166534 | Booking confirmed, completed states |
| Warning / Deal | #FEF3C7 | #F59E0B | #92400E | Cheapest prices, cheapest dates, deal highlights |
| Error | #FEE2E2 | #DC2626 | #991B1B | Validation, failed payment |
| Info | #DBEAFE | #2563EB | #1E40AF | Fastest tag, informational banners |

### Recommendation tags

| Tag | Color | Background |
|-----|-------|------------|
| Best value | primary500 (purple) | primary50 |
| Cheapest | warning (orange) | warningLight |
| Fastest | info (blue) | infoLight |

Note: cheapest uses orange/amber, not green. This matches the deal/savings color used for price highlights and cheapest date indicators throughout the app.

### Semantic surface tokens

These are what components reference (not raw palette hex):

| Token | Resolves to | Usage |
|-------|-------------|-------|
| bg | gray50 | App background |
| surface | white | Cards, sheets |
| overlay | black @ 50% | Modal backdrop |
| border | gray200 | Visible dividers |
| borderLight | gray100 | Subtle card borders, input backgrounds |
| text | gray900 | Primary text |
| textSecondary | gray600 | Supporting text |
| textTertiary | gray500 | Placeholders, hints |
| textDisabled | gray400 | Disabled state |
| textInverse | white | On dark/primary backgrounds |
| primary | primary500 | Buttons, selected states |
| primaryPressed | primary600 | Button pressed state |
| primarySoft | primary50 | Soft fills, selected backgrounds |
| deal | warning | Price highlights, cheapest indicators |
| dealSoft | warningLight | Deal background fills |

---

## Spacing

8pt grid. Micro spacing uses 4pt increments.

| Token | Value | Usage |
|-------|------:|-------|
| xs | 4 | Tight gaps inside components |
| sm | 8 | Inner gaps, list item spacing |
| md | 16 | Component padding, card gaps |
| lg | 24 | Component gaps, control padding |
| xl | 32 | Section spacing |
| xxl | 48 | Bottom safe zone |

### Layout constants

| Token | Value |
|-------|------:|
| Screen horizontal padding | 16 |
| Section gap | 32 |
| Component gap | 24 |
| Card gap | 16 |
| List item gap | 8 |

---

## Border radius

| Token | Value | Usage |
|-------|------:|-------|
| none | 0 | — |
| xs | 4 | Small chips |
| sm | 8 | Tags, date pills |
| md | 12 | Cards, non-CTA buttons |
| lg | 16 | Bottom sheets, large cards, destination cards |
| xl | 24 | Hero cards, search bar |
| full | 9999 | Primary CTA buttons (pill shape), avatars |

Primary CTA buttons use `full` radius (pill shape) as seen in the onboarding and calendar screens.

---

## Elevation / Shadows

| Level | Token | Usage |
|------:|-------|-------|
| 1 | card | Flight cards, destination cards |
| 2 | floating | Search bar, floating actions |
| 3 | sheet | Bottom sheets |
| 4 | dialog | Dialogs, modals |

---

## Motion

| Token | Duration | Usage |
|-------|--------:|-------|
| instant | 100ms | Press feedback, toggles |
| fast | 150ms | Micro-interactions |
| normal | 250ms | Screen transitions, sheets |
| slow | 350ms | Complex reveals |
| extraSlow | 500ms | Onboarding |

Easing: ease-out for all transitions.

---

## Touch targets

| Token | Size |
|-------|-----:|
| Minimum | 48 × 48 |
| Preferred | 56 × 56 |

---

## Component sizes

| Component | Small | Medium | Large |
|-----------|------:|-------:|------:|
| Button height | 36 | 44 | 52 |
| Input height | 40 | 48 | 56 |

---

## Icons

| Property | Value |
|----------|-------|
| Style | Outlined |
| Stroke | 2px |
| Sizes | 16, 20, 24, 32 |
