# WCAG thresholds and probe mapping

The criteria this skill checks, the exact numbers, and which probe field
carries the evidence. Cite the criterion number in every accessibility
finding — numbered findings get scheduled, vague ones get deferred.

## Contrast

| Criterion | Applies to | Minimum |
|---|---|---|
| **1.4.3** Contrast (Minimum), AA | Body text | **4.5:1** |
| **1.4.3** | Large text: ≥ 24px, or ≥ 18.66px at weight ≥ 700 | **3:1** |
| **1.4.6** Contrast (Enhanced), AAA | Body / large text | 7:1 / 4.5:1 |
| **1.4.11** Non-text Contrast, AA | UI component boundaries, focus rings, icons carrying meaning, chart marks | **3:1** |

Probe: `probe-core.js → contrast.failures[]` gives `ratio`, `required`,
`color`, `background`, `fontSize`, `fontWeight`.

**Exempt:** disabled controls, pure decoration, logos, and text inside an image
of text that is incidental.

**`contrast.unverifiable[]` is not a pass.** It means a gradient or background
image sits behind the text and the composited color could not be resolved. Glass
and gradient surfaces are exactly where contrast quietly fails — over the
brightest part of the gradient. Screenshot and check by eye, and say in the
report that the number is approximate.

## Target size

| Criterion | Minimum | Level |
|---|---|---|
| **2.5.8** Target Size (Minimum) | **24 × 24 px** | AA (WCAG 2.2) |
| **2.5.5** Target Size (Enhanced) | 44 × 44 px | AAA |

Probe: `probe-core.js → tapTargets.tooSmall[]` and `between24and44`.

Exceptions to 2.5.8: inline links inside a sentence, targets whose spacing gives
a 24px-diameter clear circle, controls whose size is browser-determined, and
where a same-function alternative target of adequate size exists. The probe
marks `exemptInlineLink` where it can tell.

44px remains the practical target for touch. Report sub-24px as a failure and
24–44px as a usability note rather than a violation.

## Focus

| Criterion | Requirement | Level |
|---|---|---|
| **2.4.7** Focus Visible | A visible indicator exists | AA |
| **1.4.11** Non-text Contrast | Indicator ≥ 3:1 against adjacent colors | AA |
| **2.4.11** Focus Not Obscured (Minimum) | Focused element not entirely hidden by sticky UI | AA (2.2) |
| **2.4.13** Focus Appearance | ≥ 2px perimeter, ≥ 3:1 against unfocused state | AAA (2.2) |

Probe: `probe-focus.js`. **Press Tab first.** Programmatic `.focus()` does not
match `:focus-visible`, so probing without a real keypress produces a false
"no focus ring" on sites that have one.

2.4.11 is easy to miss and common: a sticky header or bottom tab bar covering
the element that just received focus. Tab through a long page and watch.

## Names, roles, values

| Criterion | Checks | Level |
|---|---|---|
| **4.1.2** Name, Role, Value | Every control has an accessible name and correct role | A |
| **1.3.1** Info and Relationships | Structure conveyed visually is available programmatically | A |
| **2.4.4** Link Purpose (In Context) | Link purpose determinable | A |
| **2.4.6** Headings and Labels | Headings and labels are descriptive | AA |
| **3.3.2** Labels or Instructions | Inputs are labelled | A |

Probe: `probe-core.js → naming.unnamed[]`, `naming.pollutedNames[]`,
`naming.duplicateNames[]`, `forms[]`.

Three recurring failures worth knowing by shape:

**Polluted accessible name.** A `<select>` or a button group wrapped in a
`<label>` without `for`/`id` inherits the label's entire text content —
including every `<option>`. The field announces as
`البلد—فلسطينسورياعمانEgyptusa`. Invisible on screen, unusable by ear.

**Toggle buttons that should be a radio group.** `<button aria-pressed>` per
option gives no group semantics, no "1 of 2" announcement, and arrow-key
navigation does not work. Use `role="radiogroup"` + `role="radio"`, or a real
`<fieldset>` + `<legend>` with radio inputs.

**Focusable `<div>` with no role.** Announced as plain text; Space and Enter are
not wired. Probe: `probe-focus.js → verdict.semantics`.

## Structure and navigation

| Criterion | Checks | Level |
|---|---|---|
| **1.3.1** | Heading hierarchy without skipped levels; landmarks present | A |
| **2.4.1** Bypass Blocks | Skip link or landmarks let keyboard users bypass repeated nav | A |
| **2.4.2** Page Titled | Unique, descriptive `<title>` per route | A |
| **3.1.1** Language of Page | `<html lang>` set correctly | A |
| **3.1.2** Language of Parts | `lang` on foreign-language runs | AA |
| **1.4.10** Reflow | No horizontal scroll at 320px width equivalent | AA |

Probe: `probe-core.js → structure`, `head`, `layout.horizontalOverflow`.

An identical `<title>` on every route fails 2.4.2 and simultaneously breaks
browser history, tab switching, bookmarks and search results — worth reporting
once with all four consequences rather than as a minor a11y nit.

## Forms and errors

| Criterion | Checks | Level |
|---|---|---|
| **3.3.1** Error Identification | Errors described in text, not colour alone | A |
| **3.3.3** Error Suggestion | A correction is offered where known | AA |
| **1.3.5** Identify Input Purpose | `autocomplete` on personal-data fields | AA |
| **4.1.3** Status Messages | Async status announced via a live region | AA |

Probe: `probe-core.js → forms[]`, `disabledSubmits[]`.

**A submit button disabled until the form validates is not a WCAG failure, but
it is a usability one worth reporting.** It hides *which* field is wrong; the
user is left probing fields to discover the rule. Keep the button enabled and
surface field-level errors on submit — that path also announces properly to
screen readers, which a silently disabled button never does.

`disabledSubmits[]` populated on first load is the signal.

## Motion and timing

| Criterion | Checks | Level |
|---|---|---|
| **2.2.1** Timing Adjustable | Time limits adjustable | A |
| **2.2.2** Pause, Stop, Hide | Auto-advancing content can be paused | A |
| **2.3.1** Three Flashes | No content flashes more than 3×/second | A |
| **2.3.3** Animation from Interactions | Honour `prefers-reduced-motion` | AAA |

Auto-advancing carousels fail 2.2.2 unless there is a pause control. Onboarding
carousels that advance faster than the copy can be read fail in practice even
where they pass on paper — measure the interval against the word count.

## What the probes do not cover

State so in the report rather than implying full coverage.

- Screen reader behaviour end to end (VoiceOver, NVDA, TalkBack)
- Keyboard traps and full tab-order sanity beyond spot checks
- Zoom to 200% and 400% reflow
- Windows High Contrast Mode
- Cognitive load, reading level, error recovery under stress
- Video captions, audio description, transcripts
