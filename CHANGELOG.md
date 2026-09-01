# Changelog

## v1.0.0 — 2026-09-01

First release. Eight probes, six reference documents, worked examples with real
output.

### Probes

- **`probe-core.js`** — WCAG contrast with the composited background resolved,
  tap-target geometry, accessible-name computation, duplicate destinations,
  head and SEO tags, heading outline, form wiring, layout overflow, navigation
  timing.
- **`probe-heuristics.js`** — Hick's Law and Fitts's Law as indices, design-system
  conformance, interaction-state coverage read from the stylesheets, microcopy
  and error tolerance, the structural half of visual hierarchy.
- **`probe-perception.js`** — Gestalt proximity and similarity, grid alignment,
  Miller chunking, Doherty response timing, emphasis inflation, clickability
  affordance, input constraints, top-of-screen real estate.
- **`probe-rtl.js`** — Arabic plural agreement, numeral-system mixing, dialect
  and register mixing, gendered imperatives, orthography, `letter-spacing` on
  cursive script, line height, physical CSS in RTL, bidi hazards, untranslated
  strings, truncation.
- **`probe-ltr.js`** — English plural templates, capitalisation consistency,
  ambiguous dates and ungrouped numbers, text expansion headroom, concatenated
  sentences, foreign-language runs missing `lang`, truncation, helper-text
  punctuation.
- **`probe-parity.js`** — per-locale fingerprint for bilingual products:
  structural counts, label inventory, numeric values, `hreflang`, locale
  switcher behaviour, near-duplicate product names.
- **`probe-focus.js`** — focus indicator contrast and semantics, gated on a
  genuine Tab keypress.
- **`probe-routes.js`** — destination sweep, label/href mismatches, gated routes
  that lose the return path.

### References

`foundations.md` separates cited standards from heuristics from this skill's own
conventions. `evaluation-matrix.md` assigns every criterion to the layer that can
measure it — DOM, screenshot, or human judgement. `reading-list.md` maps eight
source texts to the criteria drawn from each. Plus `arabic-rtl.md`,
`wcag-thresholds.md` and `report-template.md`.

### Defects found and fixed during development

Every probe was tested against a live production application. Five bugs surfaced
that way, three of which would have made the skill appear to work while
measuring nothing:

1. **Colours parsed by regex over `rgba()`** — `getComputedStyle` returns
   `oklab()` and `oklch()` on modern token systems. The regex returned null, the
   caller skipped the element, and the probe reported zero contrast failures on a
   page it never measured. Now parsed by painting a canvas pixel, with an
   `unparseable` counter so the failure can never be silent again.
2. **Text collected per text node** — frameworks render `{count} {label}` as
   separate adjacent nodes, so a `TreeWalker` never saw `1 المجلدات` as one
   string and the plural check found nothing on exactly the markup it exists to
   catch. Now collected per element.
3. **Expansion headroom filtered on `/px$/`** against a computed width, which is
   always px, so nothing was filtered and every block container reported 100%
   full. Now gated on `white-space: nowrap`, measured with
   `clientWidth`/`scrollWidth`.
4. **Arabic dates reported as broken plurals** — `١ سبتمبر ٢٠٢٦` matched the
   numeral-plus-noun pattern. Month, weekday and Hijri names are now excluded.
5. **`innerText` returning empty for icon buttons**, leaving unnamed rows in
   reports. Now falls through to `aria-label` and `textContent`.
