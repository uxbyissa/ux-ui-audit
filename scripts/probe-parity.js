/**
 * probe-parity.js — cross-locale fingerprint
 *
 * Bilingual products fail in a way neither single-locale audit can see: the
 * two versions drift. A feature is renamed in one language and not the other,
 * a card exists in one and is missing in the other, a number is stale on one
 * side. Each locale looks fine in isolation. The defect only exists in the
 * comparison.
 *
 * This probe does not do the comparison itself, deliberately. Fetching the
 * counterpart URL returns a server shell that a client-rendered app has not
 * filled in yet, so a cross-fetch diff produces confident nonsense. Instead it
 * emits a *fingerprint* of the page as actually rendered.
 *
 * Usage:
 *   1. Open the page in locale A, run this, keep the JSON.
 *   2. Open the same route in locale B, run this, keep the JSON.
 *   3. Compare the two fingerprints. What to look for is listed under
 *      `compareChecklist` in the output.
 *
 * Returns a JSON string.
 */
(() => {
  const rect = (el) => el.getBoundingClientRect();
  const visible = (el) => {
    const r = rect(el);
    if (!r.width || !r.height) return false;
    const cs = getComputedStyle(el);
    return cs.visibility !== "hidden" && cs.display !== "none" && cs.opacity !== "0";
  };
  const clean = (s) => (s || "").replace(/\s+/g, " ").trim();
  const name = (el) =>
    clean(el.getAttribute("aria-label") || el.innerText || el.textContent || el.value || "");

  /* ---------- locale identification ---------- */

  const html = document.documentElement;
  const pathParts = location.pathname.split("/").filter(Boolean);
  const localeInPath = /^[a-z]{2}(-[A-Z]{2})?$/.test(pathParts[0] || "") ? pathParts[0] : null;
  const routeWithoutLocale = localeInPath ? "/" + pathParts.slice(1).join("/") : location.pathname;

  const alternates = [...document.querySelectorAll('link[rel="alternate"][hreflang]')]
    .map((l) => l.hreflang + " -> " + l.getAttribute("href"));

  // Locale switchers are the usual way a user crosses over; if the switcher
  // drops the current route, every language change costs the user their place.
  const switcherCandidates = [...document.querySelectorAll("a[href], button")]
    .filter((el) => visible(el) && /^(ع|ar|en|EN|AR|english|arabic|العربية|الإنجليزية)$/i.test(name(el)))
    .map((el) => ({
      label: name(el),
      tag: el.tagName.toLowerCase(),
      href: el.getAttribute("href"),
      keepsRoute: el.getAttribute("href") ? el.getAttribute("href").includes(routeWithoutLocale) && routeWithoutLocale !== "/" : null,
      ariaCurrent: el.getAttribute("aria-current"),
    }));

  /* ---------- structural fingerprint ----------
   * Counts should match across locales. A difference means content exists on
   * one side and not the other — usually a missing translation that the app
   * renders as nothing rather than as a visible fallback. */

  const INTERACTIVE = "a[href], button, input:not([type=hidden]), select, textarea, [role=button], [role=link], [role=tab], [role=switch]";
  const headings = [...document.querySelectorAll("h1,h2,h3,h4,h5,h6")].filter(visible);
  const controls = [...document.querySelectorAll(INTERACTIVE)].filter(visible);

  /* ---------- string inventory ----------
   * The ordered list of user-visible labels. Comparing two of these side by
   * side is what surfaces a renamed feature or an absent section. */

  const labels = controls.map(name).filter(Boolean);
  const headingText = headings.map((h) => h.tagName + ": " + name(h));

  /* ---------- names and numbers ----------
   * Two classes of drift worth isolating.
   *
   * Capitalised multi-use words are candidate product or feature names. A name
   * spelled two ways across locales — or twice within one — is the kind of
   * defect that survives for years because each occurrence looks fine alone.
   *
   * Numbers should be identical across locales, allowing for numeral system.
   * A price or limit that differs between languages is a data bug, and it is
   * one users notice immediately. */

  const bodyText = clean(document.body.innerText);
  const capitalised = {};
  for (const m of bodyText.matchAll(/\b([A-Z][a-z]{2,15})\b/g)) {
    capitalised[m[1]] = (capitalised[m[1]] || 0) + 1;
  }
  const nameCandidates = Object.entries(capitalised)
    .filter(([w]) => !/^(The|This|That|And|For|With|Your|You|Are|All|New|Add|Get|See|Not|Yes|No|Home|Menu|Page|Next|Back|Save|Sent|Sign|Log|Set|Our|Its|Has|Was|Can|May|Now|Day|Week|Month|Year|Mon|Tue|Wed|Thu|Fri|Sat|Sun|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Oct|Nov|Dec)$/.test(w))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([w, n]) => w + " ×" + n);

  // Near-duplicate capitalised words within this page: Limo/Lemo, Analyse/Analyze.
  const words = Object.keys(capitalised);
  const nearDuplicates = [];
  const editDistance = (a, b) => {
    if (Math.abs(a.length - b.length) > 1) return 9;
    const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
    for (let j = 0; j <= b.length; j++) dp[0][j] = j;
    for (let i = 1; i <= a.length; i++)
      for (let j = 1; j <= b.length; j++)
        dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    return dp[a.length][b.length];
  };
  for (let i = 0; i < words.length; i++) {
    for (let j = i + 1; j < words.length; j++) {
      const a = words[i], b = words[j];
      if (a.length < 4 || b.length < 4) continue;
      if (a.toLowerCase() === b.toLowerCase()) continue;
      if (editDistance(a.toLowerCase(), b.toLowerCase()) === 1) {
        nearDuplicates.push({ a, b, countA: capitalised[a], countB: capitalised[b] });
      }
    }
  }

  const numerals = {
    western: (bodyText.match(/[0-9]/g) || []).length,
    arabicIndic: (bodyText.match(/[٠-٩]/g) || []).length,
  };
  const numericValues = [...new Set(
    [...bodyText.matchAll(/(?:^|[^\w])([0-9]+(?:[.,][0-9]+)?%?)(?![\w])/g)].map((m) => m[1])
  )].slice(0, 30);

  const OUT = {
    url: location.href,
    locale: {
      htmlLang: html.lang || null,
      htmlDir: html.dir || getComputedStyle(html).direction,
      localeInPath,
      routeWithoutLocale,
      hreflangAlternates: alternates,
      hreflangPresent: alternates.length > 0,
    },
    localeSwitcher: {
      candidates: switcherCandidates,
      note: "keepsRoute:false means switching language drops the user's current page. " +
        "A switcher should swap the locale segment and preserve the rest of the path.",
    },
    structure: {
      headings: headings.length,
      headingOutline: headingText.slice(0, 25),
      interactiveControls: controls.length,
      images: document.querySelectorAll("img").length,
      forms: document.querySelectorAll("form").length,
      pageHeight: html.scrollHeight,
    },
    labels: labels.slice(0, 60),
    labelCount: labels.length,
    nameCandidates,
    nearDuplicateNames: nearDuplicates.slice(0, 10),
    numerals,
    numericValues,
    title: document.title,
    metaDescription: document.querySelector('meta[name="description"]')?.content || null,

    compareChecklist: [
      "structure.headings and structure.interactiveControls should match. A gap means content renders in one locale and not the other.",
      "labels: read both lists side by side. An entry present in one and absent in the other is a missing translation the app rendered as nothing.",
      "nameCandidates: the same product or feature must appear under one name in every locale. Check nearDuplicateNames first — that is where Limo/Lemo-class defects surface.",
      "numericValues: prices, limits and counts should be identical across locales once the numeral system is accounted for. A difference is a data bug, not a translation one.",
      "title and metaDescription should differ (they are translated) but must both be present and route-specific.",
      "locale.hreflangPresent should be true on both sides, and each should point at the other.",
      "localeSwitcher.keepsRoute should be true — otherwise every language change sends the user back to the start.",
      "numerals: each locale should commit to one system. Both counts non-zero on one page is a mixing defect.",
    ],
  };

  return JSON.stringify(OUT, null, 1);
})();
