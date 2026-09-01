# Example App — UX/UI Audit

**Scope** app.example.com · **Viewports** 375×812, 1280×800 · **Locales** ar, en
**Pages** 13 routes · **Date** 2026-09-01

Every finding below is traceable to a field in `probe-output/`. Findings the
probes could not produce are marked as coming from the reading pass, and the
one measurement that could not be taken is marked as not taken.

## Summary

| | Count |
|---|---|
| Critical | 4 |
| Major | 5 |
| Accessibility | 2 |
| Working well | 7 |

The token layer is in better shape than most products this size — contrast,
type scale and spacing are all consistent, and the two locales render identical
content. The defects cluster in three places: copy that was never written,
feedback that was never styled, and the seams between the two languages.

---

## Findings

### 01 · Critical · /ar/subscription · reading pass

**Placeholder copy is live on the page that takes payment.**

The premium tier's description reads "a traditional description for the premium
plan". The active tier lists one feature: "feature test".

```
tier: Plus  (active)     features: ["اختبار الميزات"]
tier: Premium            description: "وصف تقليدي للخطة المميزة"
```

No probe reports this. It is grammatical, correctly rendered text that happens
to be meaningless — exactly the class of defect that survives automated tooling.

**Fix:** write both tiers' copy; fail the build when a description is empty or
matches a seed value.

---

### 02 · Critical · /ar/subscription · reading pass

**The premium tier advertises features the product does not have.**

The feature list is boilerplate from an online-course template. The product has
no courses, instructors or certificates, so these are commitments to a paying
customer that cannot be met.

```
✓ وصول كامل إلى جميع الدورات        full access to all courses
✓ شهادات معتمدة                      accredited certificates
✓ جلسات مباشرة مع المدربين           live sessions with instructors
✓ مشاريع عملية احترافية              professional hands-on projects
```

**Fix:** replace with the real limits — document count, quiz allowance, chat
limits, image allowance.

---

### 03 · Critical · /ar/subscription · reading pass + `heuristics.json`

**The costlier tier advertises a lower limit, and the purchase button is the
weakest control on the page.**

The premium feature list ends with a *restriction* styled as a benefit —
"غير مسموح بحل اكثر من 10 اختبارات" — while the cheaper active tier displays a
counter reading 20 / 20. The upgrade looks like a downgrade.

Compounding it, `fitts.competingPrimaries` shows two controls styled as primary,
and the one in easy thumb reach is the one that does nothing:

```
"سجل الاشتراكات"   index 3.72   D=534px   → top of screen, requires regripping
"الخطة الحالية"     index 0.50   D=21px    → easy thumb reach     (inert)
```

The actual purchase CTA renders as a ghost button while the inert "current plan"
control renders filled.

**Fix:** correct the number; separate limits from benefits visually; fill the
purchase action and demote the current-plan state to a non-interactive badge.

---

### 04 · Critical · /ar/subscription · `rtl.json → bidiHazards`

**The price renders backwards.**

The probe flagged an unisolated bidi run; the screenshot confirmed it.

```
source codepoints:  200f ٧ ٫ ٩ ٩ [nbsp] U S $
source reads:       ٧٫٩٩ US$
renders on screen:  $US ٧٫٩٩
direction: rtl   ·   unicode-bidi: normal
```

The dollar sign is a neutral character; with no isolation it joins the RTL run
and moves to the far side.

**Fix:** wrap the price in `<bdi>`, or `unicode-bidi: isolate` on its container.
Never a hardcoded reorder — that breaks the moment the currency changes.

---

### 05 · Major · /ar/subscription · `rtl.json → truncation`

**The subscribed plan's name is cut off by two pixels.**

```
full text:      خطة بلس
rendered:       74px      content: 76px      shortfall: 2px
class:          "mt-0.5 truncate text-title-lg font-bold"
```

**Fix:** a container sizing bug, not a content-length problem. Remove the
`truncate` or widen the container; do not shorten the plan name.

---

### 06 · Major · global · `heuristics.json → interactionStates`

**No press feedback is defined anywhere in the product.**

```
hover: 2   focus-visible: 3   focus: 0   active: 0   disabled: 0   checked: 0
stylesheetsRead: 2   stylesheetsBlockedByCORS: 0
```

`stylesheetsBlockedByCORS: 0` is what makes this a finding rather than a guess —
every stylesheet was readable, so the zero is a real absence, not an unread file.
Note also that a disabled submit button exists elsewhere in the product with no
`:disabled` rule to style it.

This is the clearest case in the audit for reading the DOM rather than a
screenshot: a static image captures one state and can never show that a state
has no styling at all.

**Fix:** define `:active` on every interactive control, and a `:disabled`
treatment for any control that can be disabled.

---

### 07 · Major · /ar/subscription · `rtl.json → numerals`

**Three numeral conventions on one screen.**

```
arabicIndicCount: 42        westernCount: 16        mixed: true

‏٧٫٩٩ US$                    Arabic-Indic + Arabic decimal separator
تاريخ التفعيل: ١ سبتمبر ٢٠٢٦   Arabic-Indic
الاختبارات 20 / 20            Western
```

Dates come from one formatter and counters from string interpolation.

**Fix:** one decision for the whole product, enforced through
`Intl.NumberFormat` with an explicit `numberingSystem`.

---

### 08 · Major · /ar/more · `perception.json → emphasis`

**92% of on-screen text is semibold or heavier.**

```
textElementsOnScreen: 13     boldOrHeavier: 12     proportionBold: "92%"
```

Weight has stopped carrying hierarchy. You emphasise by making other things
quieter, not by making everything loud.

The same file shows the mechanism is otherwise sound — `alignment.distinctEdges: 7`
with 17 blocks sharing a single 20px edge is a real grid, not an accident.

**Fix:** restrict semibold to headings and the single most important value per
card; return body text and metadata to regular.

---

### 09 · Major · both locales · `parity-ar.json` ↔ `parity-en.json`

**Three defects that exist only in the comparison.**

Content parity itself is sound:

```
                 /ar/home    /en/home
headings              4          4      ✓
interactiveControls  15         15      ✓
images                4          4      ✓
numericValues    1, 10%, 5, 0, 0%, 20%  ✓ identical
```

Nothing renders in one language and vanishes in the other. But:

```
title             "Example App"  on both  →  never translated, and shared by every route
hreflangPresent   false          on both  →  neither locale declares the other exists
localeSwitcher    []             on both  →  no way to change language except editing the URL
nearDuplicateNames  { a: "Arie" ×2, b: "Aria" ×1 }  →  the assistant is spelled two ways
                                                        on one page, English side only
```

Each locale passes its own audit. The product is still broken.

**Fix:** translate `title` and `description` per route; emit reciprocal
`hreflang`; put a language switcher in the app shell that preserves the current
route; settle the assistant's name in the English translation file.

---

### 10 · Major · /en/home · `ltr.json`

**Two capitalisation styles across labels of the same rank, and a button with
no room to grow.**

```
Title Case ×3      "View All"
Sentence case ×3   "Create my plan", "Previous conversations"
mixed: true

nowrapControlsExamined: 1
"Create my plan"   content 293px / box 293px   fill 100%
```

The button is exactly full at its English length. Any translation clips it.

**Fix:** pick one capitalisation style; let the button size to its content or
give it horizontal padding headroom.

---

### 11 · Accessibility · WCAG 1.4.11 · global · `focus.json`

**Focus ring is 2.96:1 where 3:1 is required.**

```
outline: 1.6px solid rgb(0, 75, 254)
ground:  rgb(20, 22, 28)
ratio:   2.96 : 1        required >= 3 : 1
```

The ring exists and is correctly wired to `:focus-visible` — only the colour
fails, and narrowly.

**Fix:** lighten to roughly `#5B8CFF` in dark mode and widen to 2px.

---

### 12 · Accessibility · WCAG 4.1.2 · /ar/home · `focus.json`

**A focusable card with no role.**

```
tag: div      tabindex: "0"      role: null
```

Screen readers announce it as text, and Space/Enter are not wired for free.

**Fix:** use a real `<a>` or `<button>`.

---

## What works

Measured, not assumed. These are foundations to build on.

- **Contrast is clean and was actually measured.** 42 of 42 text elements
  resolved, `unparseable: 0`, zero failures, zero unverifiable.
- **No undersized targets.** 10 controls checked, none below 24×24, none
  between 24 and 44.
- **Every control has an accessible name.** Zero unnamed, zero polluted, zero
  ambiguous duplicates.
- **The design system is real.** 6 font sizes, 13 spacing values, 6 radii,
  141 CSS custom properties.
- **The grid holds.** 7 distinct inline-start edges across 38 blocks, 17 of
  them sharing one.
- **Arabic typography is handled correctly.** No `letter-spacing` on Arabic, no
  line-height below 1.6, no `text-transform` on Arabic text.
- **Performance is good.** TTFB 91ms, FCP 332ms.

---

## Where to start

Ranked by impact ÷ effort.

| | Action | Why |
|---|---|---|
| 1 | Rewrite the subscription page (01–04) | Copy and CSS only; it is the one page that earns revenue, and it currently misrepresents the product |
| 2 | Isolate the price with `<bdi>` (04) | One tag; the price is currently displayed backwards |
| 3 | Define `:active` and `:disabled` (06) | One stylesheet pass; restores feedback across every control in the product |
| 4 | Fix the 2px truncation (05) | One line |
| 5 | Locale parity: title, hreflang, switcher, name (09) | Unlocks the second language as a real product rather than a mirror |
| 6 | Numerals and capitalisation (07, 10) | One formatting decision each, applied through Intl and a style rule |
| 7 | Accessibility pass (11, 12) | Focus colour and card semantics |

---

## Method and limits

Manual browser audit on a live account. Evidence measured from the DOM,
computed styles, console and network at audit time; raw probe output is in
`probe-output/`.

**Not measured this run:** nothing. All probes completed.

**Not covered by this skill at all:** end-to-end screen reader testing, 200%
and 400% zoom reflow, Windows High Contrast Mode, keyboard traps beyond spot
checks, captions and audio description, reading level, and security.
