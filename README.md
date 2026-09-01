# ux-ui-audit

[![License: MIT](https://img.shields.io/badge/license-MIT-3b82f6.svg)](LICENSE)
[![Probes](https://img.shields.io/badge/probes-8-22c55e.svg)](scripts/)
[![WCAG](https://img.shields.io/badge/WCAG-2.2-8b5cf6.svg)](references/wcag-thresholds.md)
[![RTL + LTR](https://img.shields.io/badge/i18n-RTL%20%2B%20LTR-f59e0b.svg)](references/arabic-rtl.md)
[![Dependencies](https://img.shields.io/badge/dependencies-none-64748b.svg)](scripts/)

A [Claude](https://claude.com/claude-code) skill that audits a live web
interface and produces a report where **every finding carries a measurement or
a verbatim quote**.

It ships browser probe scripts rather than prose instructions, because the
difference between a useful audit and a generated-sounding one is whether the
numbers are real.

```
"the focus ring could have better contrast"          ← ignorable
"outline: 1.6px solid rgb(0,75,254) on rgb(20,22,28)
 = 2.96:1; WCAG 2.2 SC 1.4.11 requires 3:1"          ← fixed that afternoon
```

## What it covers

**Structural**, via bundled probes — WCAG contrast ratios computed from the
spec formula, tap-target geometry, focus-ring contrast, accessible-name
resolution, duplicate link destinations, route health, heading outline,
head/SEO tags, layout overflow, navigation timing.

**Design psychology, as arithmetic rather than impression** — Hick's Law
(`log2(n+1)` over the choices actually on screen), Fitts's Law
(`log2(D/W + 1)` measured from thumb rest on touch), design-system conformance
(distinct rendered values for type, spacing, radius and colour — a product with
40 font sizes does not have a type scale, whatever the design file says),
interaction-state coverage read from the stylesheets, and microcopy presence.

**Semantic**, via a guided reading pass — the defects no automated tool detects
because they require understanding what the words mean:

- placeholder copy shipped to production (`"traditional description for the premium plan"`)
- marketing claims the product cannot fulfil (a template's "live instructor sessions" on a product with no instructors)
- internal contradictions (a $19 tier advertising a *lower* limit than the $8 tier)
- product naming that drifts between screens and locales
- empty states with no way out
- a headline onboarding promise with no entry point in the app

**Localisation, in both directions.** An RTL engine and an LTR engine, plus a
parity pass for bilingual products — the defect class that exists only in the
comparison between two locales and is invisible to either one audited alone.

*LTR / English:* `1 items` and `file(s)` templates · Title Case and sentence
case mixed across labels of the same rank · ambiguous `03/04/2026` · large
numbers with no grouping · controls with no room for a longer translation ·
sentences assembled from fragments that cannot be reordered · foreign-language
runs missing `lang` (WCAG 3.1.2) · helper-text punctuation drift.

*Parity:* structural counts per locale, the ordered label inventory, numeric
values that must match across languages, `hreflang` on both sides, whether the
language switcher preserves the current route — and near-duplicate product
names, which is how a one-character split like Limo/Lemo gets caught.

*Arabic / RTL*, the part with no equivalent elsewhere:

| Check | Catches |
|---|---|
| Plural agreement | `1 المجلدات` — an English `{count} {label}` template meeting a language with six plural forms |
| Numeral systems | Arabic-Indic dates beside Western counters beside `٧٫٩٩ US$` |
| Register mixing | Egyptian, Levantine and MSA on one screen |
| Gendered imperatives | `اعملي` in shared UI; suggests the gender-neutral verbal noun |
| `letter-spacing` | Tracking applied to a cursive script, severing letter joins |
| Line height | Ratios tuned for Latin that collide with Arabic ascenders and diacritics |
| Bidi hazards | Prices, filenames and versions reordering inside Arabic runs |
| Physical CSS | `margin-left` where `margin-inline-start` was meant |
| Truncation | End-ellipsis hiding a filename's extension and title |
| Untranslated strings | Latin text left on an `ar` route |

## Why not axe or Lighthouse

Use them. They are excellent at what they cover, this skill does not replace
them, and a good audit runs both. The gap is that they were built to check
*structure* against a spec — so a defect that is structurally valid and
semantically wrong passes every time.

| | axe / Lighthouse | this skill |
|---|---|---|
| WCAG contrast, ARIA wiring, landmarks, alt text | ✅ | ✅ |
| Contrast over gradients | reported or skipped silently | reported as `unverifiable`, with the reason |
| `oklch()` / `oklab()` colour tokens | varies by version | parsed by painting a pixel |
| Hick and Fitts indices | ✗ | ✅ measured, with reachability banding |
| Design-system conformance (distinct type / spacing / radius values) | ✗ | ✅ |
| Gestalt proximity, similarity, grid alignment | ✗ | ✅ geometry, not opinion |
| Emphasis inflation (% of text at semibold+) | ✗ | ✅ |
| Missing `:active` / `:disabled` rules across the stylesheet | ✗ | ✅ |
| Arabic plural agreement (`1 المجلدات`) | ✗ | ✅ |
| Mixed numeral systems on one screen | ✗ | ✅ |
| Dialect and register mixing, gendered imperatives | ✗ | ✅ |
| `letter-spacing` severing Arabic letter joins | ✗ | ✅ |
| Bidi hazards — a price rendering backwards | ✗ | ✅ |
| English plural templates, Title-vs-sentence case drift | ✗ | ✅ |
| Text expansion headroom before translation | ✗ | ✅ |
| Cross-locale parity — a name spelled two ways, a stale price in one language | ✗ | ✅ |
| Placeholder copy shipped to production | ✗ | reading pass |
| Claims the product cannot fulfil | ✗ | reading pass |
| A purchase CTA weaker than an inert button | ✗ | ✅ + reading pass |

The bottom rows are the point. A pricing page whose premium tier promises "live
sessions with instructors" for a product with no instructors scores perfectly on
every automated check ever written, because there is nothing structurally wrong
with it.

## What the output looks like

[`examples/`](examples/) holds real probe output and the report built from it —
measurements verbatim, product identity redacted. Start with
[`examples/sample-audit-report.md`](examples/sample-audit-report.md), then read
[`examples/probe-output/`](examples/probe-output/) to see what a probe actually
returns.

A finding as it appears in a report:

```
04 · Critical · /ar/subscription · rtl.json → bidiHazards

The price renders backwards.

   source codepoints:  200f ٧ ٫ ٩ ٩ [nbsp] U S $
   source reads:       ٧٫٩٩ US$
   renders on screen:  $US ٧٫٩٩
   direction: rtl  ·  unicode-bidi: normal

The dollar sign is a neutral character; with no isolation it joins the
RTL run and moves to the far side.

Fix: wrap the price in <bdi>, or unicode-bidi: isolate on its container.
```

## Install

**Claude Code** — clone into your skills directory:

```bash
git clone https://github.com/uxbyissa/ux-ui-audit ~/.claude/skills/ux-ui-audit
```

**Project-scoped** — put it in `.claude/skills/ux-ui-audit/` in the repo.

Requires a browser tool that can navigate and evaluate JavaScript in the page.

## Use

Ask in plain language. The skill is written to trigger without being named:

```
audit the UX of https://example.com
run an accessibility review on our checkout flow
what's wrong with this page?  <url>
review the Arabic version of our app for localisation problems
```

For anything behind a login, Claude opens the sign-in page and asks you to type
the password yourself. It will not type credentials into a field, by design.

## Layout

```
ux-ui-audit/
├── SKILL.md                      audit method, pass order, report format
├── scripts/
│   ├── probe-core.js             contrast, targets, names, structure, SEO, perf
│   ├── probe-heuristics.js       Hick, Fitts, design-system conformance,
│   │                             interaction states, microcopy, hierarchy
│   ├── probe-perception.js       Gestalt proximity/similarity, grid alignment,
│   │                             chunking, response timing, emphasis, affordance
│   ├── probe-rtl.js              the Arabic / RTL engine
│   ├── probe-ltr.js              the LTR / English engine
│   ├── probe-parity.js           cross-locale fingerprint for bilingual apps
│   ├── probe-focus.js            focus indicator (needs a real Tab keypress)
│   └── probe-routes.js           destination sweep and label/href mismatches
└── references/
    ├── foundations.md            standards, heuristics, house conventions, scope
    ├── evaluation-matrix.md      criteria → reference → how each is measured
    ├── reading-list.md           source texts, criteria drawn, measuring layer
    ├── arabic-rtl.md             plural forms, registers, bidi, RTL typography
    ├── wcag-thresholds.md        criteria, numbers, probe field mapping
    └── report-template.md        a full worked report
```

The probes are plain JavaScript with no dependencies. They run in a console as
readily as through an automation tool, so they are useful on their own.

## What the findings rest on

An audit is only as good as its checkability. Every finding here is traceable
to one of three things, and the report says which — because a cited standard
and a reasoned argument carry different weight, and conflating them wastes both.

**Standards, cited by number.** WCAG 2.2 for accessibility, with the measured
value and the threshold. WAI-ARIA 1.2 and the ARIA Authoring Practices Guide
for widget patterns. Accessible Name and Description Computation 1.2 for how
names resolve. Unicode UAX #9 for bidi. Unicode CLDR plural rules and ECMA-402
for internationalisation. CSS Logical Properties Level 1 for RTL layout.
Contrast is computed from the WCAG luminance formula in the probe source, not
delegated to a library, so the arithmetic is auditable.

**Heuristics, argued rather than asserted.** Nielsen's ten usability heuristics
frame the non-accessibility findings — visibility of system status, consistency
and standards, error prevention, recognition over recall. No pass/fail numbers,
so these findings have to reason their consequence.

**House conventions, labelled as such.** The severity model, the impact ÷
effort ordering, the four-attempt protocol for intermittent defects, and the
Arabic register and spelling word lists are this skill's own judgment. No
standards body backs them. The word lists in particular return *candidates* for
a human to read, and will misfire on user-generated content.

Full detail, including what is deliberately out of scope, in
[`references/foundations.md`](references/foundations.md).

**Project standards take precedence.** Drop a design system, content style
guide or Arabic terminology guide into `references/` and the audit judges
against yours first, falling back to the above only for what yours does not
cover.

## Three measurement layers

Every criterion is assigned to exactly one layer, because a criterion measured
the wrong way produces a number that looks rigorous and is not.

**Layer 1 — DOM measurement.** Deterministic and exact. Contrast, hit areas,
choice counts, every CSS state rule, token conformance. Anything that can live
here should.

**Layer 2 — Vision.** A screenshot. Reserved for what genuinely cannot be
derived from structure: where the eye lands, Gestalt grouping, first aesthetic
impression.

**Layer 3 — Human judgement.** Trust, professionalism, learnability. Reported
as reasoned opinion, labelled as such.

The ordering is the design decision. Screenshot-first analysis forfeits
precision on every row that could have produced a number — a contrast ratio
estimated from an image is a guess wearing a decimal point. And one row cannot
be done by vision at all: a static image captures a single state, so it can
never show that a stylesheet defines no `:disabled` rule or no `:active`
feedback anywhere in the product. Reading the stylesheets answers that exactly.

Full mapping of criteria to layers, with sources, in
[`references/evaluation-matrix.md`](references/evaluation-matrix.md).

## Design decisions worth knowing

**Probes report `unknown`, never a guess.** When a gradient sits behind text the
composited colour cannot be resolved, so the row lands in `unverifiable` with
the reason attached. A confident wrong finding costs a team a morning and costs
the audit its credibility.

**Colours are parsed by painting a pixel, not by regex.** `getComputedStyle`
returns `oklab()` and `oklch()` on any modern token system. A regex over
`rgba()` drops those silently, and the probe then reports zero contrast failures
on a page it never measured — the worst possible failure mode for an audit tool.

**Text is collected per element, not per text node.** Frameworks render
`{count} {label}` as separate adjacent text nodes, so a `TreeWalker` never sees
`1 المجلدات` as one string and the plural check finds nothing on exactly the
markup it exists to catch.

**Focus is measured after a real Tab press.** Programmatic `.focus()` does not
satisfy `:focus-visible`, so probing without a genuine keypress reports a
missing focus ring on sites that have a perfectly good one.

**Intermittent defects are reported with every attempt shown**, passes included.
The variance is itself diagnostic — it distinguishes a race condition from a
fixed timer.

## Limits

Not covered, and the report says so rather than implying otherwise: end-to-end
screen reader testing, 200%/400% zoom reflow, Windows High Contrast Mode,
keyboard traps beyond spot checks, captions and audio description, and reading
level.

The Arabic register and spelling checks are word-list heuristics that return
*candidates*. They narrow a page down to a short list for a human to read; they
do not decide.

## Author

Built by **UXBYISSA** — [uxbyissa.com](https://uxbyissa.com)

The probes were developed against a live Arabic product, and two of them were
rewritten mid-development because testing showed they were silently reporting
nothing on exactly the markup they existed to catch. Those two failures are
documented above under *Design decisions worth knowing*, because a probe that
fails quietly is more dangerous than no probe at all.

## License

MIT © 2026 UXBYISSA
