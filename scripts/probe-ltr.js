/**
 * probe-ltr.js — LTR / English localisation probe
 *
 * The mirror of probe-rtl.js. Same premise, different failure modes: an
 * English interface has its own template bugs, and they are just as invisible
 * to accessibility tooling because they are grammatical and typographic rather
 * than structural.
 *
 * Most of these also matter for a product that has not been translated *yet*.
 * "1 items", a container with no room for a longer word, a date written
 * 03/04/2026 — each is a defect today and a much more expensive one the day a
 * second locale is added.
 *
 * Returns a JSON string. Like the RTL probe, the language checks return
 * candidates for a human to read, not verdicts.
 */
(() => {
  const OUT = { url: location.href, lang: document.documentElement.lang, dir: document.documentElement.dir };
  const rect = (el) => el.getBoundingClientRect();
  const visible = (el) => {
    const r = rect(el);
    if (!r.width || !r.height) return false;
    const cs = getComputedStyle(el);
    return cs.visibility !== "hidden" && cs.display !== "none" && cs.opacity !== "0";
  };
  const path = (el) => {
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

  /* Element-level collection, for the same reason as the RTL probe: a
   * framework renders `{count} {label}` as separate adjacent text nodes, so a
   * TreeWalker never sees "1 items" as one string — and that is precisely the
   * string this probe exists to find. */
  const nodes = [];
  {
    const seen = new Set();
    const push = (text, el) => {
      const t = (text || "").replace(/\s+/g, " ").trim();
      if (!t) return;
      const key = t + "|" + el.tagName;
      if (seen.has(key)) return;
      seen.add(key);
      nodes.push({ text: t, el });
    };
    for (const el of document.querySelectorAll("body *")) {
      if (/^(script|style|noscript|svg|path|br)$/i.test(el.tagName)) continue;
      if (!visible(el)) continue;
      if (el.children.length === 0) push(el.textContent, el);
      else if (el.children.length <= 4) {
        const t = (el.innerText || "").replace(/\s+/g, " ").trim();
        if (t && t.length <= 140) push(t, el);
      }
    }
  }
  OUT.textNodes = nodes.length;

  /* ---------- 1. English plural templates ----------
   * `${count} ${label}` with a hardcoded plural label. Less visually jarring
   * than the Arabic equivalent and therefore more likely to survive to
   * production, but it reads as unfinished software all the same. */

  const IRREGULAR = /\b(?:this|its|his|hers|ours|yours|theirs|is|was|has|as|gas|bus|class|status|analysis|address|process|access|less|press|business|success|progress|series|species)\b/i;
  const plural = [];
  const seenPl = new Set();
  for (const n of nodes) {
    // "1 items", "1 files", "1 results" — singular count, plural noun
    for (const m of n.text.matchAll(/(?:^|[^\w.])(1)\s+([a-z]+(?:s|es|ies))\b/gi)) {
      if (IRREGULAR.test(m[2])) continue;
      const s = m[0].trim();
      if (seenPl.has(s.toLowerCase())) continue;
      seenPl.add(s.toLowerCase());
      plural.push({ rendered: s, issue: "singular count with a plural noun", suggested: `1 ${m[2].replace(/(ies|es|s)$/i, (x) => (x === "ies" ? "y" : ""))}` });
    }
    // "0 items" where a zero-state sentence reads better
    for (const m of n.text.matchAll(/(?:^|[^\w.])(0)\s+([a-z]+s)\b/gi)) {
      const s = m[0].trim();
      if (seenPl.has(s.toLowerCase())) continue;
      seenPl.add(s.toLowerCase());
      plural.push({ rendered: s, issue: "zero rendered as a count", suggested: `No ${m[2]} yet` });
    }
    // "1 file(s)" — the parenthetical dodge
    for (const m of n.text.matchAll(/\b\w+\(s\)/gi)) {
      const s = m[0];
      if (seenPl.has(s.toLowerCase())) continue;
      seenPl.add(s.toLowerCase());
      plural.push({ rendered: s, issue: "(s) construction — avoids the plural rather than solving it", suggested: "use Intl.PluralRules with one/other strings" });
    }
  }
  OUT.pluralCandidates = plural.slice(0, 20);
  OUT.pluralNote = "Fix with Intl.PluralRules('en') — one/other. Adding a locale later needs zero/two/few/many, so structure the keys for it now.";

  /* ---------- 2. Capitalisation consistency ----------
   * Title Case and sentence case are both fine. Both on the same screen is
   * the defect: it reads as several people's work stitched together, and it
   * is the single most common polish failure in an English UI. */

  const SMALL = new Set(["a","an","the","and","or","but","for","nor","on","at","to","from","by","of","in","with","as","is","it"]);
  const classify = (s) => {
    const words = s.trim().split(/\s+/).filter((w) => /^[A-Za-z]/.test(w));
    if (words.length < 2) return null;
    if (s === s.toUpperCase() && /[A-Z]{2,}/.test(s)) return "UPPERCASE";
    const significant = words.filter((w, i) => i === 0 || !SMALL.has(w.toLowerCase()));
    const capped = significant.filter((w) => /^[A-Z]/.test(w)).length;
    if (capped === significant.length) return "Title Case";
    if (/^[A-Z]/.test(words[0]) && capped === 1) return "Sentence case";
    return null;
  };

  const LABELS = "button, a[href], h1, h2, h3, h4, [role=button], [role=tab], label, th, legend";
  const caseBuckets = { "Title Case": [], "Sentence case": [], UPPERCASE: [] };
  for (const el of document.querySelectorAll(LABELS)) {
    if (!visible(el)) continue;
    const t = (el.innerText || el.textContent || "").trim().replace(/\s+/g, " ");
    if (!t || t.length > 60 || /[.!?]$/.test(t)) continue;   // sentences are exempt
    const c = classify(t);
    if (c && caseBuckets[c].length < 12) caseBuckets[c].push({ text: t, tag: el.tagName.toLowerCase() });
  }
  const stylesUsed = Object.entries(caseBuckets).filter(([, v]) => v.length > 0);
  OUT.capitalisation = {
    stylesFound: stylesUsed.map(([k, v]) => k + " ×" + v.length),
    mixed: stylesUsed.filter(([k]) => k !== "UPPERCASE").length > 1,
    samples: Object.fromEntries(stylesUsed.map(([k, v]) => [k, v.slice(0, 5).map((x) => x.text)])),
    note: "Pick one and apply it to every label of the same rank. UPPERCASE is a separate decision — " +
      "screen readers may spell out short all-caps strings, and it costs roughly 10% reading speed in long ones.",
  };

  /* ---------- 3. Ambiguous dates and unformatted numbers ---------- */

  const dates = [], numbers = [];
  for (const n of nodes) {
    for (const m of n.text.matchAll(/\b(\d{1,2})\/(\d{1,2})\/(\d{2,4})\b/g)) {
      // Only ambiguous when both parts could be a month.
      if (+m[1] <= 12 && +m[2] <= 12) {
        dates.push({ rendered: m[0], issue: "ambiguous: 03/04 reads as March 4 in the US and 3 April elsewhere", suggested: "Intl.DateTimeFormat, or an unambiguous format like 3 Apr 2026" });
      }
    }
    // Large integers with no grouping separators are hard to scan.
    for (const m of n.text.matchAll(/(?:^|[^\d.,])(\d{5,})(?![\d.,])/g)) {
      if (/20\d\d/.test(m[1])) continue;             // a year
      if (/^\d{10,}$/.test(m[1])) continue;          // an id or timestamp
      numbers.push({ rendered: m[1], suggested: Number(m[1]).toLocaleString("en-US") });
    }
  }
  OUT.formatting = {
    ambiguousDates: dates.slice(0, 8),
    ungroupedNumbers: numbers.slice(0, 8),
    note: "Route every date and number through Intl. Hardcoded formats are the first thing to break in a second locale.",
  };

  /* ---------- 4. Text expansion headroom ----------
   * English is among the most compact UI languages. Translations run 20–35%
   * longer (German, Russian, and Arabic in body copy), so a control whose text
   * already fills its box will clip the day it is translated. This is cheap to
   * see now and expensive to discover after launch. */

  const tight = [];
  for (const el of document.querySelectorAll("button, a[href], [role=button], label, th, .btn")) {
    if (!visible(el)) continue;
    const cs = getComputedStyle(el);

    // Only `nowrap` elements can actually clip when text grows — everything
    // else wraps to a new line instead, which is a layout question rather than
    // a translation risk. Without this gate every block container reports
    // 100% full, because a block's scrollWidth equals its clientWidth by
    // definition, and the section fills with noise that hides the real cases.
    if (cs.whiteSpace !== "nowrap") continue;

    // clientWidth and scrollWidth are both integers in the same coordinate
    // space; mixing in getBoundingClientRect().width introduces subpixel
    // fractions that render as a nonsensical "101% full".
    const available = el.clientWidth;
    if (available <= 0) continue;
    const content = el.scrollWidth;
    const fill = content / available;
    if (fill <= 0.9) continue;

    tight.push({
      text: (el.innerText || el.textContent || "").trim().replace(/\s+/g, " ").slice(0, 34),
      selector: path(el),
      contentWidth: content,
      boxWidth: available,
      fill: Math.round(fill * 100) + "%",
      horizontalPadding: Math.round(parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight)),
      alreadyClipped: content > available,
    });
  }
  OUT.expansionHeadroom = {
    tightControls: tight.slice(0, 12),
    note: "Anything over ~90% full has no room for a longer translation. Let controls size to content, " +
      "or test with a 30%-longer pseudo-locale before shipping a second language.",
  };

  /* ---------- 5. Concatenation smells ----------
   * A sentence assembled from fragments cannot be translated: word order
   * differs between languages, so the pieces end up in the wrong sequence.
   * The tell is a visible fragment that is not a sentence on its own. */

  const FRAGMENT = /^(?:of|out of|to|from|by|in|on|at|and|or|the|a|an|is|are|was|were|has|have|with|for|per|since|until|showing|results?|items?|left|remaining|ago)$/i;
  const concat = [];
  for (const n of nodes) {
    if (n.el.children.length !== 0) continue;
    const t = n.text.trim();
    if (t.length > 14) continue;
    if (FRAGMENT.test(t) || /^[:;,]$/.test(t)) {
      concat.push({ fragment: t, selector: path(n.el), parentText: (n.el.parentElement?.innerText || "").replace(/\s+/g, " ").trim().slice(0, 60) });
    }
  }
  OUT.concatenation = {
    fragments: concat.slice(0, 10),
    note: "Fragments rendered as their own nodes indicate a sentence built by concatenation. " +
      "Use a single interpolated string per sentence so a translator can reorder it.",
  };

  /* ---------- 6. Foreign-language runs without lang ----------
   * WCAG 3.1.2. A screen reader keeps its current voice and pronounces the
   * foreign text as gibberish. Also catches strings left over from another
   * locale's translation file. */

  const pageLang = (document.documentElement.lang || "en").slice(0, 2).toLowerCase();
  const SCRIPTS = {
    ar: /[؀-ۿ]/, he: /[֐-׿]/, ru: /[Ѐ-ӿ]/,
    zh: /[一-鿿]/, ja: /[぀-ヿ]/, ko: /[가-힯]/,
    el: /[Ͱ-Ͽ]/, th: /[฀-๿]/,
  };
  const foreign = [];
  for (const n of nodes) {
    if (n.el.children.length !== 0) continue;
    for (const [code, re] of Object.entries(SCRIPTS)) {
      if (code === pageLang) continue;
      if (!re.test(n.text)) continue;
      if (n.el.closest("[lang]") && n.el.closest("[lang]").lang.slice(0, 2).toLowerCase() === code) continue;
      foreign.push({ script: code, text: n.text.slice(0, 50), selector: path(n.el), hasLangAttribute: !!n.el.closest("[lang]") });
      break;
    }
  }
  OUT.foreignRuns = {
    pageLang,
    runs: foreign.slice(0, 12),
    note: "Two possible causes, and they need different fixes: genuine foreign content missing a lang " +
      "attribute (WCAG 3.1.2), or an untranslated string leaking from another locale. User-generated " +
      "content is a false positive — check the selector.",
  };

  /* ---------- 7. Truncation ---------- */

  const trunc = [];
  for (const n of nodes) {
    const cs = getComputedStyle(n.el);
    if (cs.textOverflow !== "ellipsis" || cs.whiteSpace !== "nowrap") continue;
    if (n.el.scrollWidth <= n.el.clientWidth + 1) continue;
    trunc.push({
      full: n.text.slice(0, 60),
      boxWidth: Math.round(rect(n.el).width),
      contentWidth: n.el.scrollWidth,
      shortfall: n.el.scrollWidth - n.el.clientWidth + "px",
      looksLikeFilename: /\.[a-z0-9]{2,5}$/i.test(n.text),
      selector: path(n.el),
    });
  }
  OUT.truncation = {
    clipped: trunc.slice(0, 12),
    note: "Check the shortfall before redesigning — text clipped by a handful of pixels is a container " +
      "sizing bug, not a content-length problem. Identifiers should truncate in the middle so the " +
      "extension and distinguishing tail survive.",
  };

  /* ---------- 8. Sentence punctuation consistency ----------
   * Helper text that sometimes ends in a period and sometimes does not is the
   * kind of inconsistency nobody reports and everybody notices. */

  const helpers = [...document.querySelectorAll("p, small, .help, .hint, [class*=help i], [class*=hint i], [class*=description i]")]
    .filter(visible)
    .map((el) => (el.innerText || "").trim())
    .filter((t) => t.length > 20 && t.length < 200 && /^[A-Za-z]/.test(t));
  const withStop = helpers.filter((t) => /[.!?]$/.test(t)).length;
  OUT.punctuation = helpers.length >= 3 ? {
    helperTexts: helpers.length,
    endingWithPeriod: withStop,
    consistent: withStop === 0 || withStop === helpers.length,
    note: withStop > 0 && withStop < helpers.length
      ? "Mixed — some helper texts end in a period and some do not. Pick one."
      : "Consistent.",
  } : { helperTexts: helpers.length, note: "Too few helper texts on this page to judge." };

  return JSON.stringify(OUT, null, 1);
})();
