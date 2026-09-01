# Evaluation matrix

The criteria this skill evaluates, the reference each comes from, and — the
part that decides whether a criterion is worth having — **how it is measured**.

A criterion with no measurement method is a talking point. Each row below is
assigned to exactly one of three layers, because a criterion measured the wrong
way produces a number that looks rigorous and is not.

## The three layers

**Layer 1 — DOM measurement.** Deterministic, repeatable, exact. Everything
that can live here should: the DOM knows the computed colour, the real hit
area, and every CSS state rule, none of which a rendered image can recover.

**Layer 2 — Vision.** A screenshot, read by a model or a person. Reserved for
what genuinely cannot be derived from structure: where the eye lands, whether
grouping reads correctly, the first aesthetic impression.

**Layer 3 — Human judgement.** Not measurable. Trust, professionalism,
learnability over time. Report as reasoned opinion, clearly labelled.

The ordering matters: **starting from screenshots forfeits precision on every
row that could have produced a number.**

---

## 1. UX foundations

| Criterion | Reference | Layer | How it is measured |
|---|---|---|---|
| **Elements of UX** — evaluate skeleton and structure before surface | Jesse James Garrett, *The Elements of User Experience* | 1 + 3 | Pass order in `SKILL.md`: routes and IA before visual findings. Structure defects outrank cosmetic ones in the severity model. |
| **Cognitive load / Hick's Law** | Hick 1952; Hyman 1953 | **1** | `probe-heuristics.js → cognitiveLoad`. Counts interactive targets in the first viewport, choices per navigation group, fields per form, options per select. Reports `log2(n+1)` as an index. |
| **Fitts's Law** | Fitts 1954; MacKenzie 1992 | **1** | `probe-heuristics.js → fitts`. `ID = log2(D/W + 1)`, distance measured from thumb rest on touch and viewport centre on pointer. Also flags primary actions outside easy thumb reach, and competing primaries. |
| **Learnable / effective / efficient** | Steve Krug, *Don't Make Me Think* | 2 + 3 | Trace the product's central promise to its entry point and count the taps. Efficiency shows up as buried core actions; learnability needs a human. |

Note on Hick's Law: the constant `b` in `T = b·log2(n+1)` is empirical and
person-specific, so the probe reports the index rather than a time. Quoting
seconds would imply a precision that does not exist.

---

## 2. UI architecture

| Criterion | Reference | Layer | How it is measured |
|---|---|---|---|
| **Visual hierarchy** | Typographic scale practice; WCAG 1.4.3 for the contrast component | **1** + 2 | `probe-heuristics.js → visualHierarchy` measures the type scale, headline-to-body ratio and sub-12px text. `probe-core.js → contrast` measures every ratio. Whether emphasis matches task priority needs layer 2. |
| **Gestalt principles** — proximity, similarity, continuity, closure | Wertheimer 1923; Koffka 1935 | **2** | Requires a screenshot. Spacing values from `designSystem.distinctSpacingValues` give a structural hint — inconsistent gaps between related items — but grouping perception is visual. |
| **Consistency and standards** | Nielsen heuristic 4; design-system practice | **1** | `probe-heuristics.js → designSystem` counts distinct rendered values for font size, weight, family, spacing, radius and text colour. A real system converges; ad-hoc values proliferate. Also counts CSS custom properties. |

The design-system count is the most under-used automatable metric in UI review.
A product with 40 distinct font sizes does not have a type scale, whatever the
Figma file says — and unlike most consistency claims, this one is a number.

---

## 3. Interaction and emotional design

| Criterion | Reference | Layer | How it is measured |
|---|---|---|---|
| **Visceral** — first impression, aesthetic impact | Don Norman, *Emotional Design* | **2** | Screenshot. Contrast and type-scale measurements inform it but do not decide it. |
| **Behavioural** — smoothness of controls and input | Norman | **1** | `probe-heuristics.js → interactionStates`: counts `:hover`, `:focus-visible`, `:active`, `:disabled`, `:checked` rules across readable stylesheets; flags missing pointer cursors and counts transitions. |
| **Reflective** — trust and professionalism built over time | Norman | **3** | Human judgement. Placeholder copy, unfulfillable claims and naming drift are the measurable *inputs* to it — all found in the reading pass. |
| **Microinteractions and feedback** | Dan Saffer, *Microinteractions*; Nielsen heuristic 1 | **1** | Same section. Zero `:active` rules across a stylesheet means no press feedback anywhere in the product. Live-region count shows whether async status is announced at all. |
| **Error tolerance and microcopy** | Nielsen heuristics 5 and 9; WCAG 3.3.1–3.3.3 | **1** | `probe-heuristics.js → microcopy`: fields lacking `aria-describedby`, placeholder-as-only-label, required-field marking, error containers, and submit buttons disabled before the user has acted. |

**Why interaction states cannot be a vision task.** A screenshot captures one
state. It cannot show that `:disabled` has no styling defined, or that no
`:active` rule exists anywhere. Reading the stylesheets answers both exactly —
this is the clearest case in the matrix where layer 1 is not merely more precise
than layer 2 but is the *only* option.

---

## 4. Accessibility and internationalisation

Covered in full by `wcag-thresholds.md` and `arabic-rtl.md`. All layer 1.

| Criterion | Reference | Measured by |
|---|---|---|
| Contrast, target size, focus, names and roles, structure | WCAG 2.2, WAI-ARIA 1.2, accname 1.2 | `probe-core.js`, `probe-focus.js` |
| Plural agreement, numerals, register, gender, bidi, RTL typography, mirroring | CLDR, ECMA-402, UAX #9, CSS Logical Properties | `probe-rtl.js` |

---

## Reading the numbers honestly

**Every threshold in layer 1 is a prompt, not a verdict.** A Hick index of 5.3
is high for a consumer onboarding screen and entirely right for a professional
dashboard where density is the product. Report the number with the context that
makes it mean something, and say which you think it is.

**Distinguish "no rule found" from "no rule readable".** Cross-origin
stylesheets cannot be enumerated. `interactionStates.stylesheetsBlockedByCORS`
says how many were skipped; when it is non-zero the counts are a floor, and the
report must say so rather than claiming absence.

**Never convert the matrix into a single score.** A composite number hides which
axis failed and invites optimising the metric instead of the product. Report per
axis, and rank the fix list by impact ÷ effort.

---

## Sources

- Garrett, J.J. — *The Elements of User Experience*, 2nd ed., 2010
- Hick, W.E. — "On the rate of gain of information", 1952; Hyman, R., 1953
- Fitts, P.M. — "The information capacity of the human motor system", 1954;
  MacKenzie, I.S. — "Fitts' law as a research and design tool in HCI", 1992
- Krug, S. — *Don't Make Me Think, Revisited*, 2014
- Wertheimer, M., 1923; Koffka, K. — *Principles of Gestalt Psychology*, 1935
- Nielsen, J. & Molich, R. — "Heuristic evaluation of user interfaces", 1990;
  Nielsen, J. — "Enhancing the explanatory power of usability heuristics", 1994
- Norman, D.A. — *Emotional Design*, 2004; *The Design of Everyday Things*, rev. 2013
- Saffer, D. — *Microinteractions*, 2013
- W3C — WCAG 2.2, WAI-ARIA 1.2, Accessible Name and Description Computation 1.2
- Unicode Consortium — UAX #9, CLDR plural rules
