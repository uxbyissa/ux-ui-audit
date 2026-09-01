# Arabic & RTL interface reference

The rules behind `scripts/probe-rtl.js`. Read this when auditing an Arabic
product, or when you need to judge whether a probe candidate is a real defect.

## Contents

1. [Plural agreement](#1-plural-agreement)
2. [Numerals](#2-numerals)
3. [Register and dialect](#3-register-and-dialect)
4. [Gender in UI copy](#4-gender-in-ui-copy)
5. [Typography](#5-typography)
6. [Direction and bidi](#6-direction-and-bidi)
7. [Layout mirroring](#7-layout-mirroring)
8. [Dates, times, currency](#8-dates-times-currency)
9. [Orthography](#9-orthography)
10. [False positives](#10-false-positives)

---

## 1. Plural agreement

English has two forms. Arabic has six, and they are not interchangeable.

| Count | Form | Example |
|---|---|---|
| 0 | negation, not a number | `لا توجد اختبارات` |
| 1 | singular, no numeral needed | `كتاب واحد` or just `كتاب` |
| 2 | dual | `كتابان` / `كتابين` |
| 3–10 | plural of paucity | `٣ كتب` |
| 11–99 | **singular**, accusative | `١١ كتاباً` |
| 100+ | **singular**, genitive | `١٠٠ كتاب` |

The failure mode is always the same: an English template `{count} {label}` where
`label` is a fixed plural string.

```
rendered:  1 المجلدات      reads as "1 the-folders"
rendered:  1 كتب           reads as "1 books"
correct:   مجلد واحد  ·  كتاب واحد
```

Two tells that a template is at fault rather than a typo:

- **A definite noun after a numeral.** `ال` prefixed to a counted noun is almost
  never correct — the numeral already determines definiteness.
- **Numeral-first word order** in a string that should read naturally. `1 المجلدات`
  puts the digit where English wants it, not where Arabic does.

**Fix:** `Intl.PluralRules('ar')` returns `zero | one | two | few | many | other`.
Each needs its own translation string. A library that only ships `one`/`other`
keys cannot express Arabic and will need its schema widened.

Arabic also inverts the usual agreement for 3–10 (the "polarity" rule), so
hand-written special cases tend to be wrong. Use the API.

---

## 2. Numerals

Both systems are correct Arabic:

- **Arabic-Indic** `٠١٢٣٤٥٦٧٨٩` — common in the Levant, Egypt, the Gulf
- **Western** `0123456789` — common in the Maghreb, and everywhere in technical
  and financial contexts

The defect is **mixing them in one interface**. It usually happens because dates
go through one formatter (or a server locale) and counters go through another,
or through raw string interpolation.

```
١ سبتمبر ٢٠٢٦        ← Arabic-Indic, from a date library
10%  ·  1/5  ·  20%   ← Western, from string interpolation
٧٫٩٩ US$              ← Arabic-Indic + Arabic decimal separator
```

Note `٫` (U+066B, Arabic decimal separator) and `٬` (U+066C, thousands) — these
are the correct separators when using Arabic-Indic digits, and mixing them with
Western digits is its own inconsistency.

**Fix:** one decision for the whole product, enforced through
`Intl.NumberFormat` with an explicit `numberingSystem` (`'arab'` or `'latn'`).
Never interpolate a raw number into an Arabic string.

---

## 3. Register and dialect

Modern Standard Arabic is understood everywhere. Dialects are not — Egyptian is
widely understood through media, Levantine less so, Gulf and Maghrebi least
across regions.

Using one dialect deliberately is a valid brand voice. Using several, or mixing
dialect with MSA inside one screen, reads as software assembled by different
people who never spoke to each other.

Markers the probe looks for:

| Register | Markers |
|---|---|
| Egyptian | عشان · دلوقتي · كده · ازاي · بتاع · هيـ (future) · على قد · أوي |
| Levantine | هلق · شو · كتير · منيح · لهيك · بدي/بدك · هيك · عم + verb · لسا |
| Gulf | وش · چذي · أبغى · شلون · مو |
| Maghrebi | بزاف · دابا · واخا · كيفاش |
| MSA | يُرجى · الرجاء · يمكنك · لديك · سوف · الذي/التي |

Real example of the defect, all on one screen:

```
"ليمو هيرتّبلك خطة على قد وقتك"     Egyptian
"بتتعدّل مع تقدّمك"                  Levantine
"حدد كتاب على الأقل لبدء دردشة"     MSA
```

**Fix:** pick one register and write a one-page voice guide. For a product
serving multiple Arab countries, simplified MSA travels furthest.

Note that `برجاء` is Egyptian-inflected formal usage; standard MSA is `يُرجى`.

---

## 4. Gender in UI copy

Arabic imperatives and adjectives carry gender. `اعمل` addresses a man, `اعملي`
a woman. Shared UI that picks one excludes the other; UI that mixes both
contradicts itself.

```
"اعملي خطتي"   feminine imperative + first-person possessive — two problems
"إنشاء خطتي"   verbal noun, addresses everyone
```

**Fix:** prefer the **verbal noun** (المصدر) for buttons and actions. It is
gender-neutral, shorter, and reads as a label rather than a command.

| Gendered | Neutral |
|---|---|
| اعمل / اعملي | إنشاء |
| اختر / اختاري | اختيار |
| ابدأ / ابدئي | بدء |
| سجّل / سجّلي | تسجيل |
| احفظ / احفظي | حفظ |
| أضف / أضيفي | إضافة |
| ارفع / ارفعي | رفع |

Where the product knows the user's gender, gendered copy is a feature — but it
must then be gendered *everywhere*, not on one screen.

---

## 5. Typography

**`letter-spacing` destroys Arabic.** The script is cursive; letters join. Adding
tracking pries them apart and produces text that looks corrupted. This arrives
almost every time from a Latin-first design system applying a global type scale.
Arabic text must use `letter-spacing: normal`.

**Line height needs more room.** Arabic has tall ascenders, deep descenders and
optional diacritics that sit above and below the baseline. A 1.2–1.4 ratio that
looks tight-and-modern in Latin collides in Arabic. Use **≥ 1.6** for body text.

**`text-transform` is a no-op.** Arabic has no letter case. Seeing
`text-transform: uppercase` applied to Arabic is harmless in itself but reliably
indicates CSS written for Latin and never reviewed.

**Font fallback is silent and ugly.** A stack like `Inter, sans-serif` renders
Arabic through whatever the OS substitutes, which varies per device. Always name
an Arabic face explicitly. Well-supported Google Fonts options: Cairo, Tajawal,
Almarai, IBM Plex Sans Arabic, Readex Pro, Noto Kufi Arabic, Noto Naskh Arabic.

**Arabic runs longer than English** by roughly 20–25% in body copy and often
shorter in single words. Fixed-width buttons sized for English will wrap or clip.

---

## 6. Direction and bidi

Set `dir="rtl"` and `lang="ar"` on `<html>`. Both — `lang` drives font
selection, hyphenation and screen-reader pronunciation independently of `dir`.

**Embedded LTR runs reorder.** Latin words, numbers, currency, filenames, URLs,
emails and version strings inside Arabic text are laid out by the Unicode
bidirectional algorithm, and neutral characters between them (punctuation,
spaces, `$`, `/`) attach to whichever run wins. Results like `7.99$` on the wrong
side, or a filename whose extension jumps to the front.

**Fix:** wrap the embedded run in `<bdi>` — it isolates automatically and is the
right default. `unicode-bidi: isolate` on the container does the same in CSS.
Avoid `<bdo>` and hardcoded control characters; those override the algorithm
rather than isolating, and they break when the content changes.

**Truncation direction.** `text-overflow: ellipsis` clips the *end*. On a
filename that hides the extension and the distinguishing tail:

```
_OceanofPDF.com_Rework_-_Jason_Fried.pdf
→ shown as "_OceanofPDF.com_Rew…"    the title and .pdf are gone
```

Truncate identifiers in the middle, or show a human-readable title instead.

---

## 7. Layout mirroring

Physical CSS properties do not mirror. Logical ones do.

| Physical | Logical |
|---|---|
| `margin-left` | `margin-inline-start` |
| `padding-right` | `padding-inline-end` |
| `left` / `right` | `inset-inline-start` / `inset-inline-end` |
| `border-left` | `border-inline-start` |
| `text-align: left` | `text-align: start` |

Physical properties are correct when the thing genuinely is direction-independent
(a drop shadow offset, a decorative flourish). They are wrong on anything that
should follow reading order.

**What mirrors:** layout, navigation order, progress direction, back/forward
arrows, sliders, carousels and their indicators, list bullets, form label
alignment.

**What does not mirror:** clocks, media transport controls (play always points
right), musical notation, checkmarks, most logos, phone numbers, and any
graphic with real-world orientation.

**Carousel and progress direction** is the most-missed one: in RTL, "next"
advances leftward and the first indicator sits on the right.

---

## 8. Dates, times, currency

- The week starts **Saturday** in most Arab locales, not Sunday or Monday.
- Month names differ by region: `يناير` (Gulf/Egypt) vs `كانون الثاني`
  (Levant/Iraq). `Intl.DateTimeFormat` with the right locale handles this;
  `ar` alone may not give the variant your users expect. Prefer `ar-EG`,
  `ar-SA`, `ar-PS` etc.
- Currency: `US$` is unusual in Arabic UI. Prefer `$7.99` kept as an isolated
  LTR run, or `٧٫٩٩ دولار`. Let `Intl.NumberFormat` with `style: 'currency'`
  place the symbol.
- Calendars: some audiences expect Hijri alongside Gregorian. Ask before
  reporting its absence as a defect.

---

## 9. Orthography

High-confidence errors worth flagging. Hamza mistakes read to Arabic speakers
roughly the way "teh" reads in English.

| Wrong | Right |
|---|---|
| اكثر | أكثر |
| اقل | أقل |
| افضل | أفضل |
| انت | أنت |
| اذا | إذا |
| انشاء | إنشاء |
| الغاء | إلغاء |
| ارسال | إرسال |
| اعدادات | إعدادات |
| برجاء | يُرجى |
| تخطى (as "skip") | تخطٍ / تخطي |

Also common: a space before `؟` or `!` (`نسيت كلمة المرور ؟`). Arabic
punctuation attaches directly to the preceding word, as in English. And the
question mark should be the Arabic `؟` (U+061F), not `?`.

---

## 10. False positives

Before writing any of these up, check:

- **Dialect markers inside user-generated content.** A group name or a chat
  title written by a user is not a product copy defect.
- **Latin text that is a brand name.** `Google`, `PDF`, `iOS`, `AI` are correct
  untranslated. The probe allowlists common ones but not yours.
- **`لا يوجد` vs `لا توجد`.** Agreement depends on the noun's gender:
  `لا يوجد محتوى` is correct (masculine), `لا يوجد اختبارات` is not
  (`اختبارات` is a feminine plural → `لا توجد`).
- **Deliberate single-dialect voice.** One consistent dialect is a choice.
  Report only the *mixing*.
- **Bidi hazards that render correctly.** Many do. Screenshot before reporting.
- **Physical CSS on direction-independent properties.** Check what the rule
  actually styles before calling it a mirroring bug.
