# Worked report

An abridged audit of a fictional product, showing the level of specificity to
aim for. The point is not the format — it is that every finding is falsifiable.
A reader can re-run each measurement and check you.

---

# Nooma — UX/UI Audit

**Scope** app.nooma.example · **Account** demo@nooma.example · **Viewports**
375×812, 1280×800 · **Date** 2026-03-14 · **Pages** 11 routes, both locales

## Summary

| | Count |
|---|---|
| Critical | 4 |
| Major | 6 |
| Accessibility | 5 |
| Working well | 6 |

The interface is well built at the token level — contrast, focus semantics and
autocomplete are handled better than most products this size. The problems are
concentrated in two places: copy that was never written, and an information
architecture that duplicates itself. Both are cheap to fix.

---

## Findings

### 01 · Critical · /pricing

**The premium plan's description is placeholder text.**

The $19 tier's description field reads "traditional description for the premium
plan". This is the only page in the product that takes payment.

```
tier: Premium  ($19/mo)
  description: "traditional description for the premium plan"
  features: ["feature test"]
```

**Fix:** write both tiers' copy, and fail the build when a description is empty
or matches a seed value.

---

### 02 · Critical · /pricing

**Premium advertises features the product does not have.**

The feature list is boilerplate from a course-platform template. Nooma has no
courses, instructors or certificates, so these are commitments to a paying
customer that cannot be met.

```
✓ Full access to all courses
✓ Accredited certificates
✓ Live sessions with instructors
✓ Professional hands-on projects
```

**Fix:** replace with the real limits — document count, monthly questions,
export formats.

---

### 03 · Critical · /pricing

**The purchase button is visually weaker than the inert one.**

`Subscribe` is the only conversion action on the page and renders as a ghost
button. `Current plan`, which does nothing, renders filled. It is also an
anchor rather than a disabled button, so it is focusable and clickable.

```
"Subscribe"      background: rgba(0, 0, 0, 0)     ← ghost
"Current plan"   background: rgb(34, 38, 48)      ← filled
                 <a> not <button disabled>
```

**Fix:** fill the primary action; render the current-plan state as a
non-interactive badge.

---

### 04 · Critical · /

**The marketing page ejects visitors to sign-in at an unpredictable moment.**

An auth guard runs on a public route after hydration. Polled the path every
150 ms across four loads:

```
load 1 → 3533ms  / → /login    ✗
load 2 → 7660ms  / → /login    ✗
load 3 → no redirect within 12s  ✓
load 4 → no redirect within 12s  ✓
```

The variance means this is a race, not a timer. Roughly half of first-time
visitors are removed from the page mid-sentence.

**Fix:** exclude `/` from the guard. If signed-in users should be redirected,
do it server-side before first paint.

---

### 05 · Major · /library, /quizzes

**Empty states are dead ends.**

Three empty states, none with an action. New users reach these before anything
else.

```
"No documents yet"        → 0 buttons
"No quizzes yet"          → 0 buttons
"Select a document first" → 0 buttons
```

**Fix:** each empty state carries its next step — *Upload your first document*,
*Create a quiz*, *Choose a document*.

---

### 06 · Major · /home

**Two different percentages for the same day, on the same card.**

The ring shows 10%; the day strip shows 20% for today. Both are labelled
"today's progress".

```
ring:               10%
documents: 1/5       (= 20%)
quizzes:   0/5       (= 0%)
today's bar:        20%
```

**Fix:** one definition, or name each metric distinctly.

---

### 07 · Accessibility · WCAG 1.4.11 · global

**Focus ring is 2.96:1 against the dark surface; 3:1 is required.**

The ring exists and is correctly wired to `:focus-visible` — it is only the
colour that fails, narrowly.

```
outline: 1.6px solid rgb(0, 75, 254)
ground:  rgb(20, 22, 28)
ratio:   2.96 : 1        required ≥ 3 : 1
```

**Fix:** lighten to about `#5B8CFF` in dark mode and widen to 2px.

---

### 08 · Accessibility · WCAG 4.1.2 · /signup

**The country field announces its own options as its name.**

The `<select>` is wrapped in a `<label>` with no `for`, so the accessible name
computation absorbs every option.

```
accessibleName = "Country—PalestineSyriaOmanEgyptusa"
```

**Fix:** link the label with `for`/`id`, or set an explicit `aria-label`.

---

## What works

Measured, not assumed — these are foundations to build on.

- **Contrast is strong in both themes.** Body text 7.08:1 dark / 7.58:1 light;
  headings 13.92:1 and 17.96:1. Above AAA.
- **Light theme is a real palette**, not an inversion, with a system option.
- **`aria-current="page"`** is correct on the primary navigation.
- **`autocomplete`** is right: `current-password` on sign-in, `new-password` on
  sign-up.
- **Notification toggles are exemplary** — 335×76 target, name from a wrapping
  label.
- **Performance is good.** TTFB 91 ms, FCP 332 ms.

---

## Where to start

Ranked by impact ÷ effort.

| | Action | Why |
|---|---|---|
| 1 | Rewrite the pricing page (01–03) | Copy and CSS only; it is the one page that earns revenue |
| 2 | Remove `/` from the auth guard (04) | One line; fixes first impression for every new visitor |
| 3 | Add actions to empty states (05) | Converts new signups into active users |
| 4 | Reconcile the progress metrics (06) | Small change, removes a visible contradiction |
| 5 | Accessibility pass (07–08) | Focus colour, label wiring, target sizes |

---

## Method and limits

Manual browser audit on a live account. Evidence measured from the DOM,
computed styles, console and network at audit time.

Finding 04 is **not consistently reproducible** — attempt counts and outcomes
are listed in full above.

Not covered: screen reader testing end to end, 200%/400% zoom reflow, Windows
High Contrast Mode, video captioning.
