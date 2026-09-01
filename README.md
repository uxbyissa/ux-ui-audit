# ux-ui-audit

[![probes](https://github.com/uxbyissa/ux-ui-audit/actions/workflows/probes.yml/badge.svg)](https://github.com/uxbyissa/ux-ui-audit/actions/workflows/probes.yml)
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

**Semantic**, via a guided reading pass — defects that pass automated checking
because they are structurally valid and only wrong in meaning:

- placeholder copy shipped to production (`"traditional description for the premium plan"`, and lorem ipsum in the other locale)
- marketing claims the product cannot fulfil (a template's "live instructor sessions" on a product with no instructors)
- internal contradictions (a $19 tier advertising a *lower* limit than the $8 tier)
- product naming that drifts between screens and locales
- empty states with no way out
- a headline onboarding promise with no entry point in the app

Each of those is then traced to its source in the data layer, because that is
what decides who fixes it: a rendered value that matches the API is a content
bug, one that differs is a rendering bug, and a value sitting in the response
that the UI never displays is a missing feature with the hard part already
done — usually the cheapest win in a report.

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

*Arabic / RTL*, the part that goes furthest beyond what general-purpose
tooling checks:

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

## Use it without Claude

The probes are plain JavaScript with no dependencies, no build step and no
imports. Each file is a single expression that returns a JSON string, so the
fastest way to use one is to paste it into DevTools.

1. Open the page you want to measure.
2. Open DevTools (`F12` or `Cmd+Opt+I`) and go to **Console**.
3. Paste the entire contents of a probe file and press Enter.
4. The JSON is the return value. `copy($_)` puts it on your clipboard.

```js
// paste scripts/probe-core.js, then:
copy($_)          // Chrome / Edge — copies the last result
```

Console paste is the reliable method: it is not affected by a site's Content
Security Policy, has no size limit, and works on any page you can open.

**Bookmarklet** — convenient, but it fetches over the network, so a site with a
strict `script-src` or `connect-src` policy will block it. Console paste always
works; reach for this only when it does not matter.

```js
javascript:(async()=>{const p=prompt('probe: core, heuristics, perception, rtl, ltr, parity, focus, routes','core');if(!p)return;const u=`https://cdn.jsdelivr.net/gh/uxbyissa/ux-ui-audit@v1.0.0/scripts/probe-${p}.js`;try{const r=await fetch(u);const t=await r.text();const out=await eval(t);console.log(out);const w=window.open('','_blank');if(w)w.document.write('<pre style="font:12px ui-monospace;white-space:pre-wrap">'+out.replace(/</g,'&lt;')+'</pre>');}catch(e){console.error('Blocked, most likely by this page CSP. Paste the probe into the console instead.',e);}})()
```

`probe-focus.js` needs a real Tab keypress before you run it — click into the
page, press Tab, then paste. `probe-parity.js` is run once per locale and the
two outputs compared by hand.

### What you get without the skill

The probes are the measurement layer. Run them yourself and you get the numbers,
which is most of the value on a single page. What the skill adds around them is
the pass order, the reading pass for defects no probe can see, the reproduction
protocol for intermittent failures, and the report structure that turns a pile
of JSON into something a team will act on.

## Cost and model choice

### What it loads

Measured with `scripts/count-tokens.mjs` against `/v1/messages/count_tokens`
on `claude-opus-5`. Not estimated — see the note at the end of this section for
why that distinction earned its place.

Skills load in three stages, so the full repository is never in context at once.

| Stage | What loads | tokens |
|---|---|---|
| Always | the skill description only | **522** |
| On trigger | `SKILL.md` body | **5,779** |
| On demand | a probe | 1,944 – 8,532 |
| On demand | a reference | 2,315 – 4,505 |

The number that matters most is the first: **522 tokens sit in context whether
or not you ever use the skill.** A typical audit then reads three or four
probes and at most one reference. Loading all fourteen files at once — 61,599
tokens — does not happen in practice.

| Probe | tokens | ch/tok | | Reference | tokens | ch/tok |
|---|---|---|---|---|---|---|
| `probe-routes.js` | 1,944 | 2.48 | | `report-template.md` | 2,315 | 2.59 |
| `probe-focus.js` | 2,549 | 2.17 | | `foundations.md` | 2,427 | 2.85 |
| `probe-parity.js` | 3,408 | 2.42 | | `wcag-thresholds.md` | 2,721 | 2.44 |
| `probe-ltr.js` | 5,942 | 2.34 | | `evaluation-matrix.md` | 2,948 | 2.56 |
| `probe-perception.js` | 6,208 | 2.47 | | `reading-list.md` | 4,349 | 2.61 |
| `probe-heuristics.js` | 6,729 | 2.43 | | `arabic-rtl.md` | 4,505 | 2.34 |
| `probe-core.js` | 7,022 | 2.30 | | | | |
| `probe-rtl.js` | 8,532 | 2.19 | | | | |
| **all 8** | **42,334** | | | **all 6** | **19,265** | |

Reproduce it, or run it on your own content:

```bash
ANTHROPIC_API_KEY=sk-ant-... node scripts/count-tokens.mjs
```

No dependencies, Node 18+. It measures the message-wrapper overhead once and
subtracts it, so each number is the file's own cost. Counting is a metering
endpoint — it returns a count without generating anything, so a full run costs
fractions of a cent. `--json` to pipe it, `--model` to compare tokenisers.

### What tokenises expensively, measured

This section previously carried character-ratio estimates and a claim that
Arabic costs about 1.6× English. Measuring produced two corrections, in
opposite directions, and both are worth stating.

**The estimates were low by 33–57% on every row.** The assumed ratio for
English prose was 3.9 chars/token against ~2.99 actual, and English is most of
these files, so the miss was systematic rather than random. Published as fact,
that table would have told readers the skill was a third to a half cheaper than
it is.

**The Arabic multiplier was understated, not overstated.** Isolating pure
samples on the same endpoint and model:

| Sample | ch/tok |
|---|---|
| English prose | 3.50 |
| JS code, zero Arabic | 2.27 |
| **Arabic prose** | **1.47** |
| Raw Unicode-range regex (`[؀-ۿ]`) | 1.16 |
| The same ranges as `\uXXXX` escapes | 1.52 |

Arabic prose costs **≈2.4× more tokens per character** than English prose, not
1.6×.

**But file-level ch/tok in this repo is driven by code-versus-prose, not by
Arabic.** No file here is more than 5% Arabic by character count. `probe-rtl.js`
sits at 2.19 and `probe-focus.js`, which contains no Arabic at all, sits at
2.17 — the same band. Reading a low ch/tok as an Arabic signal would be
comparing code against prose and calling the difference language.

The two-rate model reconciles: `probe-rtl.js` is 17,798 non-Arabic characters
at 2.27 plus 915 Arabic at 1.47, predicting 8,462 tokens against 8,532
measured — **0.8% off**, which is what makes both rates credible rather than
coincidental.

*Sample size, honestly:* the 2.4× figure comes from one matched prose pair of
roughly 600–700 characters in the same register, on one model. The
reconciliation above is independent corroboration on entirely different text
(word lists rather than prose), which is why it is published at all — but treat
2.4× as the right order of magnitude rather than a constant.

*And a finding with no payoff here:* raw Unicode ranges are the most expensive
construct measured, and writing them as `\uXXXX` escapes tokenises ~30%
cheaper despite being longer in characters. Across all eight probes only 48
characters sit inside raw ranges — about 41 tokens. Measured before
refactoring, which is how a pointless refactor gets avoided.

### Roughly what one audit costs

A single-page audit — probes, a screenshot, the reading pass, and a written
report — lands around 30–45K input and 4–6K output tokens once probe results,
page text and images are counted. A thorough multi-page audit across two
locales runs several hundred thousand input tokens, most of it probe output
and page content rather than the skill itself.

### Which model

The measurement layer needs no model at all. The probes are plain JavaScript —
paste them into DevTools and the numbers cost nothing. What a model does is
everything around them.

- **Opus 5** (`claude-opus-5`) — the default, and the right one for a real
  audit. The reading pass is where this skill earns its keep, and it is
  entirely judgment: noticing that a premium tier promises instructor sessions
  for a product with no instructors, that an assistant is called two different
  things on one page, that a register shift mid-screen reads as three people's
  work. Arabic dialect and orthography judgement lands here too. This is not
  pattern-matching, and weaker models produce a confident, plausible report
  that misses exactly the findings worth paying for.
- **Sonnet 5** (`claude-sonnet-5`) — a reasonable trade when you mainly want
  the measured layer and a light write-up. It runs the probes and reads the
  JSON fine. Expect the semantic findings to thin out.
- **Haiku 4.5** (`claude-haiku-4-5`) — fine for mechanical passes: running a
  probe on a list of routes and collecting output. Do not ask it for the
  reading pass or the report.

The split is worth stating plainly, because it is also the honest limit of the
skill: **anyone can run the probes; the model is what turns their output into
findings.**

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

**Claude Code** — as a plugin:

```bash
/plugin marketplace add uxbyissa/ux-ui-audit
/plugin install ux-ui-audit@uxbyissa
```

Or clone it straight into your skills directory:

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
