# Source texts and the criteria drawn from them

Book by book: what each contributes, and — the part that decides whether a
criterion earns its place — which layer can actually measure it.

Layers, as defined in `evaluation-matrix.md`:
**L1** DOM measurement · **L2** screenshot · **L3** human judgement.

A criterion parked in L3 is not a lesser criterion. It is one where a number
would be a fabrication, and saying so is what keeps the L1 numbers credible.

---

## Jeff Johnson — *Designing with the Mind in Mind*

Perceptual and memory constraints: Gestalt grouping, working memory, cognitive
load (Sweller).

| Criterion | Layer | Measured by |
|---|---|---|
| Structured-data scannability — chunking long values (card, phone, IBAN) | **L1** | `probe-perception.js → constraints.structuredDataCandidate` — long free-text fields for structured data with no formatting or validation attributes |
| Visual hierarchy prominence — important content above the fold | **L1** + L2 | `probe-perception.js → topBand`; `probe-heuristics.js → visualHierarchy` |
| **Proximity** — related things closer than unrelated things | **L1** | `probe-perception.js → proximity`. Gap arithmetic: uniform spacing across many children expresses no grouping; a heading closer to the block above than to its own content is measured directly |
| **Similarity** — same function, same appearance | **L1** | `probe-perception.js → similarity`. Buckets controls by role, then counts distinct treatments of background, radius, size, weight and height |
| **Closure** — grouped items read as one set | L2 | Card and container edges; perception of completeness needs eyes |
| **Figure/ground** — background supports rather than competes | **L1** partial + L2 | `probe-core.js → contrast.unverifiable` flags text over gradients and images; whether it *competes* is visual |
| Recognition over recall | L2 + L3 | Whether options are shown rather than remembered — reading pass |
| Automating tedious calculation | L3 | Requires knowing the task |
| Low-risk environment — prevent, forgive, undo | **L1** partial | `probe-perception.js → constraints`; undo and confirmation presence via the reading pass |

Johnson's working-memory argument is why chunking appears twice: once for
output (grouping) and once for input (field formatting). Both are L1.

---

## Steve Krug — *Don't Make Me Think*

Satisficing (Simon, 1957): users do not read, they scan and take the first
plausible option.

| Criterion | Layer | Measured by |
|---|---|---|
| Self-evident UI | L2 + L3 | The five-second read; no honest number exists |
| **Clickability indicators** | **L1** | `probe-perception.js → affordance.indistinctInlineLinks` — links matching the surrounding text in colour, weight and decoration with no underline, background or border are invisible as controls. Also `noPointerCursor` |
| Visual hierarchy preprocessing — size, grouping, nesting | **L1** + L2 | Type scale and headline-to-body ratio from `probe-heuristics.js`; `alignment` and `proximity` from `probe-perception.js` |

---

## Don Norman — *The Design of Everyday Things* / *Emotional Design*

Affordances, signifiers, constraints, mappings, feedback, and the visceral /
behavioural / reflective levels.

| Criterion | Layer | Measured by |
|---|---|---|
| Discoverability and affordances | **L1** partial + L2 | `affordance` section; whether an action is *discoverable* in flow needs the reading pass |
| Signifiers | L2 | Icon comprehension is visual |
| Natural mappings | L3 | Cultural and spatial; for RTL, the mirroring rules in `arabic-rtl.md` |
| **Feedforward** — knowing what will happen before acting | **L1** partial | `probe-heuristics.js → microcopy` (fields without helper text); destructive actions without confirmation via the reading pass |
| **Feedback** — immediate confirmation of state | **L1** | `probe-heuristics.js → interactionStates`. Zero `:active` rules across a stylesheet means no press feedback exists anywhere — a fact no screenshot can establish |
| **Constraints and forcing functions** | **L1** | `probe-perception.js → constraints` — input type, `inputmode`, `pattern`, `min`/`max`, `maxlength` |
| Visceral | L2 | First impression |
| Behavioural | **L1** | Interaction states, transitions, response timing |
| Reflective — trust built over time | L3 | Its *inputs* are L1: placeholder copy, unfulfillable claims, naming drift |

---

## Adam Wathan & Steve Schoger — *Refactoring UI*

Hierarchy through contrast and weight; HSL over hex.

| Criterion | Layer | Measured by |
|---|---|---|
| **Emphasis through de-emphasis** | **L1** | `probe-perception.js → emphasis`. Proportion of on-screen text at weight ≥ 600. Past roughly 40%, weight has stopped carrying hierarchy — you emphasise by making other things quieter, not by making everything loud |
| Label/value contextualisation | L2 + L3 | "12 left in stock" over "Stock: 12" — a copy judgement |
| **Balancing weight and contrast** | **L1** | `probe-heuristics.js → designSystem` (weights, colours) with `probe-core.js → contrast` |
| **Perceptual colour (HSL/OKLCH)** | **L1** | `designSystem.usesCustomProperties` and the parsed colour space. The canvas parser in `probe-core.js` reads `oklch()` and `color()` natively — a token system authored perceptually is visible in the computed values |

---

## Dan Saffer — *Microinteractions*

Trigger, rules, feedback, loops and modes; poka-yoke error prevention.

| Criterion | Layer | Measured by |
|---|---|---|
| **Bring the data forward on triggers** | **L1** partial | Badge and count elements on triggers — detectable structurally; whether the *right* datum is surfaced is L3 |
| **Poka-yoke inputs** | **L1** | `probe-perception.js → constraints`. Preventing an error costs nothing; reporting it after submit costs a round trip |
| **Economy and clarity of feedback** | **L1** | `interactionStates` rule counts, transition durations, live-region count |
| Loops and modes — adaptation over time | L3 | Requires observing the product across sessions |

---

## Jon Yablonski — *Laws of UX*

| Law | Layer | Measured by |
|---|---|---|
| **Fitts** | **L1** | `probe-heuristics.js → fitts` — `log2(D/W + 1)`, origin at thumb rest on touch, plus reachability banding and competing-primary detection |
| **Hick** | **L1** | `probe-heuristics.js → cognitiveLoad` — `log2(n+1)` per screen, nav group, form and select |
| **Miller — chunking** | **L1** | `probe-perception.js → chunking` — flat choice groups beyond ~9 items with no subgrouping |
| **Doherty threshold (< 400 ms)** | **L1** | `probe-perception.js → responsiveness` — long tasks, slow interaction events, and whether waiting is covered by skeletons or a bare spinner |
| Jakob — mental models | L3 | Convention conformance is a judgement about the user's other software |
| Tesler — conservation of complexity | L3 | Whether the system absorbed complexity or pushed it outward |
| Aesthetic–usability effect | L2 | By definition perceptual |

Miller's "7±2" is frequently overstated in design writing — the original 1956
paper is about immediate memory span for unrelated items, not a hard limit on
menu length. The probe uses it as a threshold for *asking the question*, not as
a rule, and reports the count rather than a pass/fail.

---

## Jenifer Tidwell, Charles Brewer, Aynne Valencia — *Designing Interfaces*

| Criterion | Layer | Measured by |
|---|---|---|
| **Grid harmony** | **L1** | `probe-perception.js → alignment`. Distinct inline-start edges across visible blocks, direction-aware so RTL measures from the right. A few dominant edges means a grid; a long tail of one-offs is where visual noise comes from |
| **Top-of-screen real estate** | **L1** | `probe-perception.js → topBand` — what occupies the first 120px and how much of it is interactive |

---

## Kinneret Yifrah — *Microcopy*

| Criterion | Layer | Measured by |
|---|---|---|
| **Bridging uncertainty** — helper text where meaning is not obvious | **L1** partial | `probe-heuristics.js → microcopy.withoutHelperText`, `placeholderAsOnlyLabel` |
| Verbal economy — omitting explanation where it is obvious | L3 | Whether text is *needed* is a judgement; the probe can only report presence |
| Curse of knowledge — internal vocabulary leaking into the UI | L3 | Reading pass. Terminology drift across screens and locales is the detectable symptom |

---

## How to use this file

When writing a finding, name the layer implicitly by how you evidence it:

- **L1** → quote the measurement. `92% of on-screen text is semibold or heavier.`
- **L2** → say a screenshot was assessed, and describe what was seen.
- **L3** → state it as reasoned opinion and give the reasoning.

The failure to avoid is dressing an L2 or L3 judgement in L1 clothing. A
confidence-shaped sentence with no number behind it spends credibility the
measured findings earned.

---

## Localisation coverage in both directions

The RTL engine came first because Arabic is where the gap in existing tooling
is widest. The LTR engine and the parity pass close the rest of it.

**Why an LTR engine at all**, when English is what every tool already assumes:
because the same template bugs occur, they are just quieter. `1 items` is the
identical defect as `1 المجلدات` — a `{count} {label}` string with a hardcoded
plural — but English readers have been trained to skim past it. Title Case and
sentence case mixed across one screen, `03/04/2026` meaning two different days
depending on the reader, a button with no room for a longer word: each is a
defect today and a much more expensive one on the day a second locale is added.

**Why parity is separate from both.** Some defects exist only in the comparison.
A feature renamed on one side, a card that renders in one language and not the
other, a price stale in one locale — each version passes its own audit, and the
product is still broken. `probe-parity.js` emits a fingerprint per locale rather
than diffing across a fetch, because fetching the counterpart URL of a
client-rendered app returns a shell that has not been filled in, and diffing
that produces confident nonsense.

| Criterion | Source | Layer | Measured by |
|---|---|---|---|
| Plural agreement, both languages | CLDR, ECMA-402 | **L1** | `probe-rtl.js → pluralCandidates`, `probe-ltr.js → pluralCandidates` |
| Capitalisation consistency | House style; Refactoring UI on visual rank | **L1** | `probe-ltr.js → capitalisation` |
| Unambiguous dates and grouped numbers | ECMA-402 | **L1** | `probe-ltr.js → formatting` |
| Text expansion headroom | W3C i18n — text size in translation | **L1** | `probe-ltr.js → expansionHeadroom` (only `nowrap` controls can clip) |
| Translatable sentence structure | W3C i18n — avoid concatenation | **L1** | `probe-ltr.js → concatenation` |
| Language of parts | WCAG 3.1.2 | **L1** | `probe-ltr.js → foreignRuns` |
| Cross-locale content parity | — | **L1** | `probe-parity.js → structure`, `labels` |
| Terminology and product-name consistency | Nielsen heuristic 4 | **L1** partial + L3 | `probe-parity.js → nearDuplicateNames` catches one-character variants; two entirely different words still need a human reading both locales |
| Data parity across locales | — | **L1** | `probe-parity.js → numericValues` |
| `hreflang` and locale switching | W3C i18n, SEO practice | **L1** | `probe-parity.js → locale`, `localeSwitcher` |
