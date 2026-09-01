---
name: ux-ui-audit
description: Run a rigorous, evidence-backed UX/UI and accessibility audit of a live web page or app using the browser. Bundles probe scripts that measure real numbers — WCAG contrast ratios, tap-target sizes, focus-ring contrast, accessible-name wiring, duplicate link destinations, route health — so every finding carries proof instead of opinion. Adds a reading pass for the defects tooling cannot see (placeholder copy shipped to production, contradictory claims, inconsistent product naming, dead-end empty states) and a dedicated Arabic/RTL engine (broken plural agreement, mixed numeral systems, dialect and register mixing, gendered imperatives, letter-spacing on cursive script, bidi hazards, physical CSS in RTL) that mainstream tools do not cover. Use this whenever the user asks for a UX review, UI review, design review, accessibility audit, a11y check, usability review, heuristic evaluation, RTL or Arabic localisation review, "what's wrong with my site", or shares a URL and asks for feedback on it — even when they never say the word "audit".
---

# UX/UI Audit

## The rule that makes this worth reading

Every finding carries a measurement or a verbatim quote. No exceptions.

This matters more than it sounds. An audit full of "the hierarchy could be
stronger" and "consider improving contrast" is indistinguishable from something
generated without looking at the page, so a team learns to skim it. An audit
that says *"the focus ring is `1.6px solid rgb(0,75,254)` on `rgb(20,22,28)` —
2.96:1, and SC 1.4.11 requires 3:1"* gets fixed the same afternoon, because
there is nothing left to argue about and nothing left to investigate.

When you cannot measure something, say so plainly. "I could not verify this"
is a legitimate line in a report. A confident wrong finding costs the team a
morning and costs you their trust in the other forty.

## What the scripts catch, and what only you can catch

Run the probes first — they are fast, exhaustive and never get bored. But
understand their ceiling, because it determines where you spend your attention.

**Probes are good at structure.** Contrast arithmetic, element geometry, ARIA
wiring, href graphs, meta tags. Machine work, done perfectly.

**Probes are blind to meaning.** They cannot tell that a pricing page promises
"live sessions with instructors" for a product that has no instructors, that a
plan description still reads "traditional description for the premium plan",
that the assistant is called Limo in one paragraph and Lemo in the next, or
that the $12 tier advertises a *lower* limit than the $8 tier.

In practice the meaning-level defects are the ones that cost real money and the
ones the team is most surprised by, because their existing tooling has been
silently passing them for months. **Budget your time accordingly: the probes are
the first hour, the reading pass is where the audit earns its keep.**

## Before you start

**Scope.** Ask what matters if it is not obvious: which flows, which locales,
desktop or mobile or both, and whether there is a known problem area. If the
user just hands you a URL, audit the primary flow end to end and say what you
covered.

**Credentials.** Never type a password into a field, even when the user offers
one and asks you to. Open the sign-in page, fill any non-secret field, and ask
them to type the secret themselves and confirm. Then continue on the
authenticated session. Say this up front so it does not read as a refusal
mid-task.

**Viewport.** Set an explicit size rather than trusting the pane default, and
audit at the size that matches the product. A persistent bottom tab bar means
mobile-first; auditing that at 1440px wide reports the wrong problems. Check
both when the layout claims to be responsive.

**Baseline the console before you touch anything.** Console and network logs
accumulate across a tab's lifetime, so errors from your earlier navigation will
look like errors on the current page. Open a fresh tab per major route when the
log matters.

## Pass order

The order is deliberate: cheap and broad first, so the expensive reading pass is
aimed at pages you already know are interesting.

1. **Route sweep** — `probe-routes.js` on the main navigation surface. Gives you
   the app's map, plus dead links and mislabelled destinations for free.
2. **Structural probe** — `probe-core.js` on every significant page.
3. **Heuristics probe** — `probe-heuristics.js` on the primary task screens.
   Run it at the viewport the product is actually used at: Fitts distances and
   first-screen counts are viewport-dependent, so a mobile-first product
   measured at desktop width gives numbers that describe nobody.
4. **RTL probe** — `probe-rtl.js` on every Arabic or RTL page. Skip for LTR-only
   products.
5. **Focus probe** — press Tab, then `probe-focus.js`. Repeat across control
   types; focus styles are usually per-component.
6. **Screenshot pass** — capture each key viewport. Gestalt grouping, scan path,
   whether emphasis matches task priority, and first aesthetic impression
   cannot be derived from the DOM; assess them here, and say that you did.
7. **Reading pass** — the protocol below.
8. **Reproduction** — re-test anything that looked intermittent.

### Running the probes

Read the script file, then evaluate its contents in the page through whatever
JavaScript-execution tool the browser integration provides. Each returns a JSON
string.

- `scripts/probe-core.js` — contrast, tap targets, accessible names, duplicate
  destinations, head/SEO, heading outline, forms, layout overflow, performance
- `scripts/probe-heuristics.js` — Hick's Law and cognitive load, Fitts's Law
  and reachability, design-system conformance, interaction-state coverage,
  microcopy and error tolerance, the structural half of visual hierarchy
- `scripts/probe-rtl.js` — the Arabic/RTL engine
- `scripts/probe-focus.js` — focus indicator; **requires a real Tab keypress
  first**, because programmatic `.focus()` does not trigger `:focus-visible` and
  you will report a false failure
- `scripts/probe-routes.js` — destination sweep; issues real GETs and skips
  anything that looks state-changing

Probe output is a lead list, not a report. `probe-rtl.js` in particular returns
*candidates* — its dialect and spelling checks are heuristics over word lists.
Read the samples before you write a finding.

## The reading pass

This is the part that cannot be automated, so give it real attention rather than
skimming. Extract the full visible text of each page, then read it the way a
sceptical new user would.

**Hunt for placeholder copy.** Lorem ipsum is easy; the dangerous kind looks
plausible. "A traditional description for the premium plan." "Feature test."
"Test user." "Lorem". Names like `foo`, `usa` in lowercase among properly cased
entries, a country list with six countries where two are in the wrong language.
Anything that reads like it was typed to make the layout render.

**Cross-check claims against the product.** Marketing copy is often lifted from
a template for a different business. If a plan promises certificates, live
instructor sessions or downloadable courses, confirm those features exist. When
they do not, this is not a copy nit — a paid page promising things the product
cannot deliver is a commercial and legal exposure, and it should be the first
finding in the report.

**Look for internal contradictions.** Two numbers for the same thing on one
card. A premium tier with a lower limit than the cheaper tier. A label that says
one thing and a destination that does another. These survive because each half
was written by a different person on a different day.

**Check naming consistency across the whole product.** One feature, one name.
Assistant names, tier names, and the words for core objects ("quiz" vs "test",
"folder" vs "collection") drift between screens and between locales. Compare the
same page across languages — that is where the drift shows up fastest.

**Test every empty state.** An empty state without an action is a dead end, and
new users hit these before they hit anything else. Ask of each: what does the
user do next, and can they do it from here?

**Trace the product's central promise.** If onboarding says "upload your books",
find the upload control. Count the taps. When the headline promise has no entry
point on the main screen, that is usually the highest-impact finding in the
whole audit and no automated tool will ever surface it.

## Intermittent defects

Some of the worst bugs do not reproduce on demand — a race between an auth
guard and hydration, a CDN that intermittently serves a JS chunk as
`text/plain`. The temptation is to report them as certain or to drop them. Do
neither.

**Test at least four times and report every attempt**, including the ones that
passed:

```
load 1 → 3533ms  /ar → /ar/login   ✗
load 2 → 7660ms  /ar → /ar/login   ✗
load 3 → no redirect within 12s    ✓
load 4 → no redirect within 12s    ✓
```

The variance *is* the finding — it tells the team this is a race condition, not
a fixed timer, which points straight at the cause. A team that catches you
overstating one finding will discount all of them, so this honesty is
load-bearing.

Watch especially for **failures with no user-visible error**. A page that
renders completely but whose JavaScript never loaded looks fine and responds to
nothing. Users conclude the product is broken. Missing error boundaries are
usually a bigger finding than the underlying flake.

## Severity

Rank by consequence, not by how easy the defect is to describe.

- **Critical** — blocks a user, loses money, or misrepresents the product.
  Placeholder text on a pricing page, a broken primary flow, a purchase CTA
  weaker than an inert button, promises the product cannot keep.
- **Major** — the user completes the task but distrusts the product or takes a
  wrong turn. Broken plurals, mixed registers, contradictory numbers,
  dead-end empty states, buried core actions.
- **Accessibility** — cite the specific success criterion (`1.4.11`, `2.5.8`,
  `4.1.2`) with the measured number. Vague a11y findings get deprioritised;
  numbered ones get fixed.
- **Note** — real but low-consequence.

Then order the fix list by **impact divided by effort**. A one-line routing fix
that repairs the main navigation outranks a design system overhaul.

## Report format

Use this structure. See `references/report-template.md` for a worked example.

```
# <Product> — UX/UI Audit
Scope · account · viewports · date · pages covered

## Summary
Counts by severity. What works, stated as plainly as what does not.

## Findings
For each, in severity order:
  NN · [severity] · <page or route>
  A one-line claim written as a statement, not a question
  One or two sentences of consequence — who is hurt and how
  EVIDENCE: the measurement or the verbatim quote, in a code block
  FIX: the concrete change

## What works
Specific and measured, same as the findings. This is not padding — it tells
the team which foundations to build on and which not to touch.

## Where to start
Ranked by impact ÷ effort, with finding numbers.
```

Two habits that make reports land:

**Credit what works, with numbers.** "Contrast is 7.08:1 to 17.96:1 across both
themes, above AAA" is as useful as any defect: it stops a team from
re-litigating something already solved.

**Write findings as claims, not questions.** "The purchase CTA is a ghost button
while the inert one is filled" beats "have you considered the button
hierarchy?". You did the work; state what you found.

## What the findings rest on

Say what a finding is grounded in, and be precise about which kind it is.
Readers weigh a cited standard differently from a heuristic argument, and
blurring the two costs you the benefit of both.

- **Accessibility findings cite a success criterion** (WCAG 2.2) with the
  measured value and the threshold. These are checkable against the source.
- **Usability findings argue their case.** They rest on established heuristics
  — Nielsen's ten are the usual frame — which have no pass/fail number, so the
  consequence has to be reasoned rather than asserted.
- **Internationalisation findings cite the relevant spec** where one exists:
  CLDR plural rules, UAX #9 for bidi, ECMA-402 for the fix.
- **Some conventions here are this skill's own**, not standards: the severity
  model, the impact ÷ effort ordering, the four-attempt reproducibility
  protocol, and the Arabic register and spelling word lists. Present those as
  judgment, never as authority.

`references/foundations.md` lists all of this in full, including what is
deliberately out of scope. Read it before writing the method section of a
report, and cite it when a reader asks where a finding comes from.

`references/evaluation-matrix.md` maps each design-psychology criterion — Hick,
Fitts, Gestalt, Norman's three levels, visual hierarchy, microcopy — to the
layer that can actually measure it: DOM, screenshot, or human judgement.
Consult it when deciding how to evidence a usability claim, and respect the
layer assignment. Measuring a criterion the wrong way produces a number that
looks rigorous and is not: a contrast ratio estimated from a screenshot is a
guess wearing a decimal point, and no screenshot can show that a stylesheet
defines no `:disabled` state at all.

**Never reduce the matrix to a single score.** A composite hides which axis
failed and invites optimising the metric instead of the product. Report per
axis, and let the fix ordering carry the priority.

**If the project has its own standards, they win.** A house design system,
content style guide or Arabic terminology guide takes precedence over
everything above — look for one before starting, and say in the report which
standard each finding was judged against.

## Reference material

- `references/foundations.md` — the standards, heuristics and house conventions
  behind the findings, and the scope limits. Read when writing a report's
  method section or when a finding's basis is questioned.
- `references/arabic-rtl.md` — the linguistic and typographic rules behind the
  RTL probe: plural forms, numeral conventions, register, bidi, type. Read it
  when auditing an Arabic product or when interpreting `probe-rtl.js` output.
- `references/wcag-thresholds.md` — the criteria this skill checks, with the
  exact numbers and what each probe field maps to.
- `references/report-template.md` — a full worked report to model output on.
