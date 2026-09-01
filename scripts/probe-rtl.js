/**
 * probe-rtl.js — Arabic / RTL interface probe
 *
 * Catches the class of defect that no mainstream accessibility tool looks for,
 * because axe, Lighthouse and friends were built around English. Every check
 * here comes from a bug that ships regularly in real Arabic products:
 * an English `{count} {noun}` template applied to a language with six plural
 * forms, letter-spacing that severs a cursive script, three numeral systems on
 * one screen, a dialect mismatch that makes a product feel foreign to its own
 * audience.
 *
 * These are reported as *candidates*, not verdicts. Language needs a human
 * reader — the probe's job is to hand that reader a short, high-signal list
 * instead of the whole page. Read the `note` on each section before writing a
 * finding.
 *
 * Returns a JSON string.
 */
(() => {
  const AR = "؀-ۿݐ-ݿﭐ-﷿ﹰ-﻿";
  const reAr = new RegExp("[" + AR + "]");
  const OUT = { url: location.href, lang: document.documentElement.lang, dir: document.documentElement.dir };

  const rect = (el) => el.getBoundingClientRect();
  const visible = (el) => {
    const r = rect(el);
    if (!r.width || !r.height) return false;
    const cs = getComputedStyle(el);
    return cs.visibility !== "hidden" && cs.display !== "none" && cs.opacity !== "0";
  };
  const cssPath = (el) => {
    const p = [];
    let n = el;
    while (n && n.nodeType === 1 && p.length < 3) {
      let s = n.tagName.toLowerCase();
      if (n.id) { p.unshift(s + "#" + n.id); break; }
      const c = (n.className || "").toString().trim().split(/\s+/)[0];
      if (c) s += "." + c;
      p.unshift(s);
      n = n.parentElement;
    }
    return p.join(" > ");
  };

  /* Collect visible text once; every check below reuses this.
   *
   * Deliberately element-level, not TreeWalker/SHOW_TEXT. A framework renders
   * `{count} {label}` as *separate* adjacent text nodes — "1", " ", "المجلدات"
   * — even though the element has no element children. Walking text nodes
   * therefore never sees "1 المجلدات" as one string, and the plural check, the
   * single most valuable one here, silently finds nothing on exactly the
   * markup it exists to catch.
   *
   * Two passes:
   *   leaves  — elements with no element children: their textContent joins the
   *             split nodes back together.
   *   groups  — small containers whose text spans a couple of child elements,
   *             catching <span>1</span><span>كتب</span>. Capped tightly so a
   *             page wrapper does not swallow the document.
   */
  const nodes = [];
  {
    const seen = new Set();
    const push = (text, el) => {
      const t = (text || "").replace(/\s+/g, " ").trim();
      if (!t) return;
      const key = t + "|" + (el.tagName || "");
      if (seen.has(key)) return;
      seen.add(key);
      nodes.push({ text: t, el });
    };
    for (const el of document.querySelectorAll("body *")) {
      if (/^(script|style|noscript|svg|path|br)$/i.test(el.tagName)) continue;
      if (!visible(el)) continue;
      if (el.children.length === 0) {
        push(el.textContent, el);
      } else if (el.children.length <= 4) {
        const t = (el.innerText || "").replace(/\s+/g, " ").trim();
        if (t && t.length <= 120) push(t, el);
      }
    }
  }
  const arNodes = nodes.filter((n) => reAr.test(n.text));
  OUT.textNodes = { total: nodes.length, arabic: arNodes.length };

  /* ---------- 1. broken plural agreement ----------
     Arabic marks number in six forms, not two. An English template
     `${count} ${label}` produces "1 المجلدات" — literally "1 the-folders" —
     which reads as broken software to any native speaker. */

  const WESTERN = "0-9", INDIC = "٠-٩";
  const rePlural = new RegExp(
    `(?:^|[^${WESTERN}${INDIC}])([${WESTERN}${INDIC}]+)\\s*([${AR}]{2,}(?:\\s[${AR}]{2,})?)`,
    "g"
  );
  const toInt = (s) => parseInt(s.replace(/[٠-٩]/g, (d) => d.charCodeAt(0) - 0x0660), 10);

  // Keyed on numeral + first noun word, keeping the shortest rendering. The
  // group pass reads across sibling elements, so the same defect surfaces both
  // as "1 كتب" and as "1 كتب الرئيسية" where the next element's text runs on.
  // The short form is the true string; the long one is a scanning artefact.
  const plByKey = new Map();
  for (const n of arNodes) {
    let m;
    rePlural.lastIndex = 0;
    while ((m = rePlural.exec(n.text))) {
      const count = toInt(m[1]);
      const noun = m[2];
      const definite = /^ال/.test(noun);
      // 1 and 2 never take a plural noun in Arabic; a definite noun after a
      // numeral is almost always a template that forgot the language.
      if (!(definite || count === 1 || count === 2 || count === 0)) continue;
      const firstWord = noun.split(/\s+/)[0];
      const key = count + "|" + firstWord;
      const snippet = m[0].trim();
      const prev = plByKey.get(key);
      if (prev && prev.rendered.length <= snippet.length) continue;
      plByKey.set(key, {
        rendered: snippet,
        count,
        noun: firstWord,
        nounIsDefinite: definite,
        expectedForm:
          count === 0 ? "zero form: لا توجد ... / لا يوجد ..."
          : count === 1 ? "singular: <noun> واحد"
          : count === 2 ? "dual: <noun>ان / <noun>ين"
          : "3–10 take the plural; 11+ take an accusative singular",
        selector: cssPath(n.el),
      });
    }
  }
  OUT.pluralCandidates = [...plByKey.values()].slice(0, 25);
  OUT.pluralNote =
    "Verify each by reading it aloud. Fix with Intl.PluralRules('ar') — it returns " +
    "zero/one/two/few/many/other, and every one of those needs its own string.";

  /* ---------- 2. numeral system mixing ----------
     Arabic-Indic (٠١٢) and Western (012) are both correct Arabic; using both
     on one screen is not. It reads as two different products stitched together. */

  const arabicText = arNodes.map((n) => n.text).join(" ");
  const indicHits = arabicText.match(new RegExp(`[${INDIC}]`, "g")) || [];
  const westernHits = arabicText.match(new RegExp(`[${WESTERN}]`, "g")) || [];
  OUT.numerals = {
    arabicIndicCount: indicHits.length,
    westernCount: westernHits.length,
    mixed: indicHits.length > 0 && westernHits.length > 0,
    samplesIndic: arNodes.filter((n) => new RegExp(`[${INDIC}]`).test(n.text))
      .slice(0, 6).map((n) => n.text.slice(0, 50)),
    samplesWestern: arNodes.filter((n) => new RegExp(`[${WESTERN}]`).test(n.text))
      .slice(0, 6).map((n) => n.text.slice(0, 50)),
    note: "Either system is fine — pick one and route every number through Intl.NumberFormat. " +
      "Dates formatted by one library and counters by another is the usual cause.",
  };

  /* ---------- 3. dialect / register mixing ----------
     A study app that greets you in MSA, explains a feature in Egyptian and
     labels a button in Levantine feels machine-assembled. Users read this as
     carelessness long before they can name why. */

  const REGISTERS = {
    egyptian: ["عشان", "دلوقتي", "كده", "ازاي", "بتاع", "دي ", "ده ", "مش عايز", "هيعمل", "هترتب", "على قد", "علشان", "أوي", "حاجة"],
    levantine: ["هلق", "شو ", "كتير", "منيح", "لهيك", "بدي", "بدك", "هاد ", "هيك", "منيحة", "عم ت", "لسا"],
    gulf: ["وش ", "چذي", "أبغى", "زين ", "مو ", "شلون", "حق ", "يبغى"],
    maghrebi: ["بزاف", "دابا", "واخا", "كيفاش", "بغيت"],
    msa: ["يُرجى", "يمكنك", "الرجاء", "قم بـ", "لديك", "سوف", "الذي", "التي", "عندما", "حيث"],
  };
  OUT.registerMix = { detected: {}, samples: [] };
  for (const [reg, words] of Object.entries(REGISTERS)) {
    const hits = [];
    for (const n of arNodes) {
      for (const w of words) {
        if (n.text.includes(w)) hits.push({ marker: w.trim(), text: n.text.slice(0, 70) });
      }
    }
    if (hits.length) {
      OUT.registerMix.detected[reg] = hits.length;
      OUT.registerMix.samples.push(...hits.slice(0, 3).map((h) => ({ register: reg, ...h })));
    }
  }
  OUT.registerMix.registersPresent = Object.keys(OUT.registerMix.detected).length;
  OUT.registerMix.note =
    "More than one non-MSA register on a page is the finding. Dialect alongside MSA is " +
    "fine when it is a deliberate voice; three registers never is. Markers are heuristic — read the samples.";

  /* ---------- 4. gendered imperatives ----------
     Arabic imperatives carry gender. UI copy that says اعملي addresses only
     women; mixing اعمل and اعملي across one product addresses nobody
     consistently. The durable fix is usually a verbal noun (إنشاء), which is
     gender-neutral. */

  const VERB_PAIRS = [
    ["اعمل", "اعملي", "إنشاء"], ["اختر", "اختاري", "اختيار"], ["ابدأ", "ابدئي", "بدء"],
    ["أدخل", "أدخلي", "إدخال"], ["سجّل", "سجّلي", "تسجيل"], ["سجل", "سجلي", "تسجيل"],
    ["احفظ", "احفظي", "حفظ"], ["أرسل", "أرسلي", "إرسال"], ["حدّد", "حدّدي", "تحديد"],
    ["حدد", "حددي", "تحديد"], ["أضف", "أضيفي", "إضافة"], ["اكتب", "اكتبي", "كتابة"],
    ["ارفع", "ارفعي", "رفع"], ["احذف", "احذفي", "حذف"], ["راجع", "راجعي", "مراجعة"],
    ["تابع", "تابعي", "متابعة"], ["جرّب", "جرّبي", "تجربة"], ["شارك", "شاركي", "مشاركة"],
  ];
  const boundary = (w) => new RegExp(`(?:^|[\\s"'،.،!?:(\\[])${w}(?:$|[\\s"'،.،!?:)\\]])`);
  OUT.genderedImperatives = { masculine: [], feminine: [], note:
    "Feminine imperatives in shared UI exclude most users. Both forms present means the " +
    "product contradicts itself. Prefer the verbal noun in the third column — it addresses everyone." };
  for (const [m, f, neutral] of VERB_PAIRS) {
    for (const n of arNodes) {
      if (boundary(f).test(n.text)) {
        OUT.genderedImperatives.feminine.push({ form: f, neutralAlternative: neutral, text: n.text.slice(0, 60), selector: cssPath(n.el) });
      } else if (boundary(m).test(n.text)) {
        OUT.genderedImperatives.masculine.push({ form: m, neutralAlternative: neutral, text: n.text.slice(0, 60) });
      }
    }
  }
  OUT.genderedImperatives.bothFormsPresent =
    OUT.genderedImperatives.feminine.length > 0 && OUT.genderedImperatives.masculine.length > 0;
  OUT.genderedImperatives.feminine = OUT.genderedImperatives.feminine.slice(0, 12);
  OUT.genderedImperatives.masculine = OUT.genderedImperatives.masculine.slice(0, 12);

  /* ---------- 5. orthography ----------
     Only high-confidence pairs. A spell-checker that cries wolf gets ignored,
     so anything ambiguous in context is deliberately left out. */

  const SPELLING = [
    ["اكثر", "أكثر"], ["اقل", "أقل"], ["احدث", "أحدث"], ["افضل", "أفضل"],
    ["انت ", "أنت "], ["انا ", "أنا "], ["اذا ", "إذا "], ["اضافة", "إضافة"],
    ["انشاء", "إنشاء"], ["الغاء", "إلغاء"], ["ارسال", "إرسال"], ["اعدادات", "إعدادات"],
    ["اختبارات", null], ["برجاء", "يُرجى"], ["تخطى", "تخطٍ / تخطي"],
  ];
  OUT.spelling = [];
  for (const [wrong, right] of SPELLING) {
    if (!right) continue;
    for (const n of arNodes) {
      if (n.text.includes(wrong)) {
        OUT.spelling.push({ found: wrong.trim(), suggested: right, text: n.text.slice(0, 60), selector: cssPath(n.el) });
      }
    }
  }
  OUT.spelling = OUT.spelling.slice(0, 20);
  OUT.spellingNote = "Hamza errors read as illiteracy to Arabic readers, the way 'teh' does in English.";

  /* ---------- 6. letter-spacing on Arabic ----------
     Arabic is cursive: letters connect. letter-spacing pries them apart and
     produces text that looks damaged. It almost always arrives from a design
     system whose type scale was written for Latin and applied globally. */

  OUT.letterSpacing = [];
  for (const n of arNodes) {
    const cs = getComputedStyle(n.el);
    const ls = cs.letterSpacing;
    if (ls && ls !== "normal" && Math.abs(parseFloat(ls)) > 0.01) {
      OUT.letterSpacing.push({
        text: n.text.slice(0, 45), letterSpacing: ls, selector: cssPath(n.el),
        severity: "breaks cursive joining — Arabic must use letter-spacing: normal",
      });
    }
  }
  OUT.letterSpacing = OUT.letterSpacing.slice(0, 15);

  /* ---------- 7. line-height and text-transform ----------
     Arabic ascenders, descenders and optional diacritics need more leading than
     Latin; 1.2–1.4 collides. text-transform is a no-op on Arabic and signals
     Latin-first CSS applied without review. */

  OUT.typography = { tightLineHeight: [], uppercaseOnArabic: [], fontStacks: {} };
  for (const n of arNodes) {
    const cs = getComputedStyle(n.el);
    const fs = parseFloat(cs.fontSize), lh = parseFloat(cs.lineHeight);
    if (fs && lh && lh / fs < 1.5 && n.text.length > 25) {
      OUT.typography.tightLineHeight.push({
        text: n.text.slice(0, 45), ratio: Math.round((lh / fs) * 100) / 100,
        recommended: "≥ 1.6 for Arabic body text", selector: cssPath(n.el),
      });
    }
    if (cs.textTransform === "uppercase" || cs.textTransform === "capitalize") {
      OUT.typography.uppercaseOnArabic.push({ text: n.text.slice(0, 40), textTransform: cs.textTransform });
    }
    const f = cs.fontFamily;
    OUT.typography.fontStacks[f] = (OUT.typography.fontStacks[f] || 0) + 1;
  }
  OUT.typography.tightLineHeight = OUT.typography.tightLineHeight.slice(0, 12);
  OUT.typography.uppercaseOnArabic = OUT.typography.uppercaseOnArabic.slice(0, 8);

  /* ---------- 8. physical CSS in an RTL document ----------
     Physical properties (margin-left, text-align: left) do not mirror. They
     survive translation testing because the bug only appears in the other
     direction. Logical properties (margin-inline-start, text-align: start) do. */

  OUT.physicalCss = { fromStylesheets: [], computedLeftAlign: [] };
  const PHYSICAL = /(?:^|[;{\s])(margin-left|margin-right|padding-left|padding-right|border-left|border-right|left|right)\s*:/g;
  try {
    for (const sheet of document.styleSheets) {
      let rules;
      try { rules = sheet.cssRules; } catch { continue; } // cross-origin
      if (!rules) continue;
      for (const rule of rules) {
        if (!rule.cssText || !rule.selectorText) continue;
        const hits = rule.cssText.match(PHYSICAL);
        if (hits) {
          OUT.physicalCss.fromStylesheets.push({
            selector: rule.selectorText.slice(0, 70),
            properties: [...new Set(hits.map((h) => h.replace(/[^a-z-]/g, "")))],
          });
        }
        if (OUT.physicalCss.fromStylesheets.length > 40) break;
      }
      if (OUT.physicalCss.fromStylesheets.length > 40) break;
    }
  } catch (e) { OUT.physicalCss.error = String(e); }

  for (const n of arNodes) {
    const cs = getComputedStyle(n.el);
    if (cs.direction === "rtl" && cs.textAlign === "left") {
      OUT.physicalCss.computedLeftAlign.push({ text: n.text.slice(0, 40), selector: cssPath(n.el) });
    }
  }
  OUT.physicalCss.computedLeftAlign = OUT.physicalCss.computedLeftAlign.slice(0, 10);
  OUT.physicalCss.note =
    "Stylesheet hits are candidates, not defects — physical properties are correct for " +
    "genuinely direction-independent things. Check the ones on layout containers and text blocks.";

  /* ---------- 9. bidi hazards ----------
     Latin, digits, punctuation and currency inside Arabic reorder unless the
     run is isolated. Prices, filenames, version numbers and emails are where
     this bites: "$7.99" can render as "7.99$" on the wrong side of the label. */

  OUT.bidiHazards = [];
  for (const n of arNodes) {
    const hasLatin = /[A-Za-z]/.test(n.text);
    const hasRisky = /[$€£%@#/\\|+\-–—:()[\]{}<>]|\d/.test(n.text);
    if (!hasLatin && !hasRisky) continue;
    const cs = getComputedStyle(n.el);
    const isolated = cs.unicodeBidi.includes("isolate") || n.el.closest("bdi") ||
      n.el.getAttribute("dir") || /[⁦-⁩‎‏]/.test(n.text);
    if (isolated) continue;
    OUT.bidiHazards.push({
      text: n.text.slice(0, 60),
      containsLatin: hasLatin,
      selector: cssPath(n.el),
      unicodeBidi: cs.unicodeBidi,
    });
  }
  OUT.bidiHazards = OUT.bidiHazards.slice(0, 15);
  OUT.bidiNote =
    "Screenshot these before reporting — many render fine. The fix is <bdi> or " +
    "unicode-bidi: isolate around the embedded run, never a hardcoded reorder.";

  /* ---------- 10. untranslated strings ----------
     Pure-Latin visible text on an Arabic route is usually a missing translation
     key. Brand names are the legitimate exception. */

  const BRAND_OK = /^(iOS|Android|Google|Apple|Facebook|X|WhatsApp|PDF|DOCX|TXT|ZIP|AI|API|OK|ID|URL|EN|AR|https?:|www\.|@|\$|\d)/i;
  OUT.untranslated = [];
  if ((document.documentElement.lang || "").startsWith("ar")) {
    for (const n of nodes) {
      const t = n.text.trim();
      if (t.length < 4 || reAr.test(t)) continue;
      if (!/[A-Za-z]{3,}/.test(t)) continue;
      if (BRAND_OK.test(t)) continue;
      OUT.untranslated.push({ text: t.slice(0, 60), selector: cssPath(n.el) });
    }
  }
  OUT.untranslated = OUT.untranslated.slice(0, 20);
  OUT.untranslatedNote = "User-generated content (names, filenames, titles) is a false positive — check the selector.";

  /* ---------- 11. truncation direction ----------
     End-truncation on a filename hides the extension and, with a noisy prefix,
     everything that identifies the file. Middle-truncation keeps both ends. */

  OUT.truncation = [];
  for (const n of nodes) {
    const cs = getComputedStyle(n.el);
    if (cs.textOverflow !== "ellipsis" || cs.whiteSpace !== "nowrap") continue;
    const r = rect(n.el);
    if (n.el.scrollWidth <= n.el.clientWidth + 1) continue; // not actually clipped
    OUT.truncation.push({
      full: n.text.slice(0, 70),
      renderedWidth: Math.round(r.width),
      contentWidth: n.el.scrollWidth,
      looksLikeFilename: /\.[a-z0-9]{2,5}$/i.test(n.text),
      selector: cssPath(n.el),
    });
  }
  OUT.truncation = OUT.truncation.slice(0, 12);
  OUT.truncationNote =
    "Filenames and identifiers should truncate in the middle so the extension and the " +
    "distinguishing tail survive. Better still, show a human title instead of a filename.";

  return JSON.stringify(OUT, null, 1);
})();
