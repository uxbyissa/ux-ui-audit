# Foundations

What this skill's findings rest on, and — just as important — what they do not.

An audit's authority comes from being checkable. A reader should be able to
take any finding, look up the standard it cites, and confirm or refute it. So
this file separates three things that are easy to blur together: published
standards, established heuristics, and the conventions this skill invented.

---

## 1. Standards cited directly in findings

Accessibility findings quote a success criterion number and a measured value.
Both are verifiable against the source.

| Standard | Used for |
|---|---|
| **WCAG 2.2** — W3C Recommendation, October 2023 | Every accessibility finding. Criteria are cited by number (`1.4.3`, `1.4.11`, `2.4.7`, `2.5.8`, `4.1.2`) with the measured value and the threshold. |
| **WAI-ARIA 1.2** and the **ARIA Authoring Practices Guide** | Whether a widget uses the correct role and keyboard model — the radiogroup, switch and tab patterns in particular. |
| **Accessible Name and Description Computation 1.2** | How `probe-core.js` resolves an accessible name, and therefore how it detects a name polluted by a wrapping `<label>`. |
| **Unicode Standard Annex #9** — Bidirectional Algorithm | Every bidi finding: why an embedded Latin or numeric run reorders, and why `<bdi>` or `unicode-bidi: isolate` is the fix rather than a hardcoded reorder. |
| **Unicode CLDR Plural Rules** | The six Arabic plural categories (`zero`, `one`, `two`, `few`, `many`, `other`). This is the data `Intl.PluralRules` is built on. |
| **ECMA-402 (ECMAScript Internationalization API)** | The recommended remedies: `Intl.PluralRules`, `Intl.NumberFormat`, `Intl.DateTimeFormat`. |
| **CSS Logical Properties and Values Level 1** | The physical-vs-logical property findings in RTL layouts. |
| **W3C Internationalization Working Group** guidance on RTL text and structural markup | Direction, mirroring, and what should *not* mirror. |
| **HTML Living Standard** | Form control semantics, `autocomplete` tokens, label association. |

Contrast values are computed from the WCAG relative-luminance formula in
`probe-core.js`, not read from a third-party library, so the arithmetic is
auditable in the source.

---

## 2. Heuristics informing the non-accessibility findings

These are long-established evaluation frameworks. They are not standards with
pass/fail thresholds, so findings grounded in them argue their case rather than
cite a number.

**Nielsen's 10 usability heuristics** (Nielsen & Molich, 1990; Nielsen, 1994)
map onto the defect classes this skill hunts for:

| Heuristic | The defect it names |
|---|---|
| Visibility of system status | A page whose scripts failed but which renders normally and shows no error |
| Match between system and the real world | A feature named one thing on one screen and another elsewhere; "Enthusiasm points" |
| User control and freedom | An onboarding that ejects the reader before they can finish |
| Consistency and standards | Mixed numeral systems, mixed registers, drifting terminology |
| Error prevention | A submit button disabled with no indication of which field is at fault |
| Recognition rather than recall | A menu of 22 tiles with no search and four duplicating the persistent nav |
| Flexibility and efficiency | A core action buried three levels from where it is promised |
| Aesthetic and minimalist design | Duplicate entries, section headers repeating their own children |
| Help users recognise and recover from errors | Missing error boundaries; empty states with no action |
| Help and documentation | Placeholder copy where an explanation should be |

Also drawn on, without ceremony: **Gestalt grouping** for whether visual
hierarchy matches information hierarchy, and the conventional treatment of
**empty states as an onboarding surface** rather than an absence.

---

## 3. Conventions this skill invented

State these as the skill's own judgment, never as authority. A reader who
mistakes a house convention for a standard has been misled.

**The evidence rule.** Every finding carries a measurement or a verbatim quote.
Not a standard — a discipline, adopted because unevidenced findings are
indistinguishable from guesses and get skimmed.

**The four-level severity model** (Critical / Major / Accessibility / Note) and
its definitions. Severity scales are always local; this one puts commercial
misrepresentation at the top because a paid page promising what the product
cannot deliver is the failure with the widest blast radius.

**Ordering the fix list by impact ÷ effort** rather than by severity alone.

**The four-attempt reproducibility protocol** for intermittent defects, with
every attempt reported including the passes. Adopted because the variance
itself distinguishes a race condition from a fixed timer.

**The Arabic register and orthography word lists** in `probe-rtl.js`. These
were assembled for this skill. There is no standards body behind them, they are
not exhaustive, and they will produce false positives on user-generated
content. They return *candidates* for a human to read, which is why the probe
labels them that way and why `references/arabic-rtl.md` ends with a
false-positive checklist.

**The line-height and letter-spacing thresholds for Arabic** (≥ 1.6 leading;
`letter-spacing: normal`). These reflect established typographic practice for
cursive scripts rather than a specification. The letter-spacing rule is
categorical — tracking genuinely severs Arabic letter joins. The leading figure
is a floor, not a law.

---

## 4. Deliberately out of scope

Named so the report never implies coverage it does not have.

- End-to-end screen reader testing (VoiceOver, NVDA, JAWS, TalkBack)
- Zoom to 200% and 400%, and reflow at 320px CSS width
- Windows High Contrast Mode / forced-colors
- Full keyboard trap and tab-order analysis beyond spot checks
- Captions, audio description, transcripts
- Reading level and cognitive load measurement
- Performance beyond navigation timing — no field data, no Core Web Vitals
  percentiles, no throttled profiling
- Security, privacy and data handling

---

## 5. Adding your own foundations

A house style guide, design system or content standard belongs above the
defaults, not beside them. When one exists, put it in `references/` and point
to it from `SKILL.md`, then state the precedence explicitly:

> The project's own design system and content guide take precedence. The
> standards in `foundations.md` fill the gaps they do not cover.

Good candidates: an Arabic style and terminology guide (register, gender
policy, numeral convention, glossary of product terms), design tokens with
their intended contrast pairings, component accessibility specs, and a tone-of-
voice document. Each converts a class of judgment call into a checkable rule —
which moves findings from section 2 of this file into section 1, where they are
much harder to argue with.
