# Examples

Real probe output and the report built from it.

## Provenance

These are **actual measurements** taken during development, from a production
bilingual (Arabic/English) study application running Next.js with a modern
token system. Nothing here is illustrative or hand-written to look convincing.

**What was redacted:** the hostname, the product name, the account name, and
the assistant's product name — the last of which appears in `parity-en.json`
as a near-duplicate pair, so a neutral pair with the same one-character split
was substituted to preserve the shape of the finding.

**What is verbatim:** every count, ratio, pixel dimension, index, colour value,
CSS property and Arabic string. If you re-ran the probes against a page with
these defects you would get these numbers.

The redaction matters in one direction only — it removes identity, never
softens a result. The failures below are the real ones.

## Files

```
probe-output/
  core.json          /ar/subscription — contrast, targets, names, head, structure
  heuristics.json    /ar/subscription — Hick, Fitts, design system, states
  perception.json    /ar/more         — emphasis, alignment, similarity
  rtl.json           /ar/subscription — plurals, numerals, spelling, bidi
  ltr.json           /en/home         — capitalisation, expansion, foreign runs
  parity-ar.json     /ar/home         — locale fingerprint
  parity-en.json     /en/home         — locale fingerprint, to diff against the above
  focus.json         /ar/home         — focus indicator, after a real Tab press

sample-audit-report.md               the report written from the above
```

## How to read a probe result

Three habits make the difference between using this output and being misled by it.

**Zero failures is only good news if the probe measured anything.** In
`core.json`, `contrast.measured: 42` alongside `contrast.unparseable: 0` is what
makes `failures: []` meaningful. A high `unparseable` next to zero failures means
the probe skipped the page, not that the page passed.

**`unverifiable` is not a pass.** It means a gradient or image sits behind the
text and the composited colour could not be resolved. Those need eyes.

**A count of zero can be the finding.** `interactionStates.active: 0` in
`heuristics.json` means no press feedback is defined anywhere in the product —
established only because `stylesheetsBlockedByCORS: 0` confirms every stylesheet
was readable. With blocked sheets the same zero would prove nothing.

## Reproducing

Open any page, evaluate a probe's contents in the page through your browser
tool, and read the JSON. `probe-focus.js` needs a genuine Tab keypress first;
`probe-parity.js` is run once per locale and the two outputs compared by hand.
