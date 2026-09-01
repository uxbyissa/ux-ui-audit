/**
 * probe-core.js — universal UX/UI measurement probe
 *
 * Paste into a browser console or run via a browser-automation JS eval tool.
 * Returns a JSON string. Everything it reports is measured, never inferred.
 *
 * Design rule: when the probe cannot be certain (gradient behind text,
 * off-screen element, alpha it cannot resolve), it reports "unknown" and says
 * why. A probe that guesses produces confident wrong findings, which is worse
 * than no finding at all — a reviewer can chase an "unknown", but they will
 * happily ship a false "pass".
 */
(() => {
  const OUT = { url: location.href, viewport: [innerWidth, innerHeight] };

  /* ---------- color math (WCAG 2.x relative luminance) ---------- */

  /**
   * Parse any CSS color the browser understands, by painting one pixel and
   * reading it back.
   *
   * A regex over `rgba(...)` is not sufficient: getComputedStyle now returns
   * `oklab(...)`, `oklch(...)` and `color(srgb ...)` on any site built with a
   * modern token system (Tailwind v4 and friends emit oklch by default). A
   * regex parser returns null for those, the caller skips the element, and the
   * probe reports zero contrast failures on a page it never actually measured —
   * a silent false pass, the worst outcome an audit tool can produce.
   *
   * Canvas is sRGB, so wide-gamut values clamp. That is correct here: WCAG
   * contrast is defined over sRGB.
   */
  const _cv = document.createElement("canvas");
  _cv.width = _cv.height = 1;
  const _ctx = _cv.getContext("2d", { willReadFrequently: true });

  const parseColor = (str) => {
    if (!str || str === "none") return null;
    // Fast path — the common case, and avoids a canvas round-trip per element.
    const m = str.match(/^rgba?\(([^)]+)\)$/);
    if (m) {
      const p = m[1].split(/[,\s/]+/).filter(Boolean).map(Number);
      if (p.length >= 3 && !p.some(Number.isNaN)) {
        return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
      }
    }
    try {
      // Assigning an unparseable value leaves fillStyle untouched, so probe with
      // two different sentinels: only a genuine parse failure sticks to both.
      _ctx.fillStyle = "#000000";
      _ctx.fillStyle = str;
      const first = _ctx.fillStyle;
      _ctx.fillStyle = "#ffffff";
      _ctx.fillStyle = str;
      if (first === "#000000" && _ctx.fillStyle === "#ffffff") return null;
      _ctx.clearRect(0, 0, 1, 1);
      _ctx.fillRect(0, 0, 1, 1);
      const d = _ctx.getImageData(0, 0, 1, 1).data;
      return { r: d[0], g: d[1], b: d[2], a: d[3] / 255 };
    } catch {
      return null;
    }
  };

  const lum = ({ r, g, b }) => {
    const f = (v) => {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };

  const ratio = (fg, bg) => {
    const a = lum(fg), b = lum(bg);
    return Math.round((((Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05))) * 100) / 100;
  };

  // Composite `top` (may be translucent) over `under` (assumed opaque).
  const over = (top, under) => ({
    r: top.r * top.a + under.r * (1 - top.a),
    g: top.g * top.a + under.g * (1 - top.a),
    b: top.b * top.a + under.b * (1 - top.a),
    a: 1,
  });

  /**
   * Resolve the opaque color actually painted behind `el`.
   * Returns { color, certain, reason } — `certain:false` means a gradient or
   * image is in the stack and the number must be verified by eye.
   */
  const effectiveBg = (el) => {
    const layers = [];
    let node = el, sawImage = null;
    while (node && node.nodeType === 1) {
      const cs = getComputedStyle(node);
      if (cs.backgroundImage && cs.backgroundImage !== "none" && !sawImage) {
        sawImage = cs.backgroundImage.slice(0, 60);
      }
      const c = parseColor(cs.backgroundColor);
      if (c && c.a > 0) {
        layers.push(c);
        if (c.a === 1) break;
      }
      node = node.parentElement;
    }
    let base = { r: 255, g: 255, b: 255, a: 1 };
    const rootBg = parseColor(getComputedStyle(document.documentElement).backgroundColor);
    if (rootBg && rootBg.a === 1) base = rootBg;
    let acc = base;
    for (let i = layers.length - 1; i >= 0; i--) acc = over(layers[i], acc);
    return {
      color: acc,
      certain: !sawImage,
      reason: sawImage ? "background-image/gradient in stack: " + sawImage : null,
    };
  };

  const isLarge = (cs) => {
    const px = parseFloat(cs.fontSize);
    const w = parseInt(cs.fontWeight, 10) || 400;
    return px >= 24 || (px >= 18.66 && w >= 700);
  };

  const rect = (el) => el.getBoundingClientRect();
  const visible = (el) => {
    const r = rect(el);
    if (r.width === 0 || r.height === 0) return false;
    const cs = getComputedStyle(el);
    return cs.visibility !== "hidden" && cs.display !== "none" && cs.opacity !== "0";
  };
  const label = (el) =>
    (el.innerText || el.textContent || "").trim().replace(/\s+/g, " ").slice(0, 40);

  const cssPath = (el) => {
    const parts = [];
    let n = el;
    while (n && n.nodeType === 1 && parts.length < 4) {
      let s = n.tagName.toLowerCase();
      if (n.id) { parts.unshift(s + "#" + n.id); break; }
      const cls = (n.className || "").toString().trim().split(/\s+/)[0];
      if (cls) s += "." + cls;
      parts.unshift(s);
      n = n.parentElement;
    }
    return parts.join(" > ");
  };

  /* ---------- 1. text contrast ---------- */

  const textNodes = [];
  {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const seen = new Set();
    let t;
    while ((t = walker.nextNode())) {
      const txt = t.textContent.trim();
      if (!txt || txt.length < 2) continue;
      const el = t.parentElement;
      if (!el || seen.has(el) || !visible(el)) continue;
      if (/^(script|style|noscript|title)$/i.test(el.tagName)) continue;
      seen.add(el);
      textNodes.push(el);
    }
  }

  OUT.contrast = { checked: textNodes.length, measured: 0, unparseable: 0, failures: [], unverifiable: [] };
  for (const el of textNodes.slice(0, 400)) {
    const cs = getComputedStyle(el);
    const fg = parseColor(cs.color);
    // Counted, never silent: a high `unparseable` next to zero failures means
    // the probe did not measure the page, not that the page passed.
    if (!fg) { OUT.contrast.unparseable++; continue; }
    OUT.contrast.measured++;
    const bg = effectiveBg(el);
    const fgSolid = fg.a < 1 ? over(fg, bg.color) : fg;
    const r = ratio(fgSolid, bg.color);
    const large = isLarge(cs);
    const need = large ? 3 : 4.5;
    const row = {
      text: label(el),
      selector: cssPath(el),
      fontSize: cs.fontSize,
      fontWeight: cs.fontWeight,
      color: cs.color,
      background: `rgb(${Math.round(bg.color.r)}, ${Math.round(bg.color.g)}, ${Math.round(bg.color.b)})`,
      ratio: r,
      required: need,
    };
    if (!bg.certain) {
      row.warning = bg.reason;
      if (r < need + 1.5) OUT.contrast.unverifiable.push(row);
    } else if (r < need) {
      OUT.contrast.failures.push(row);
    }
  }
  OUT.contrast.failures.sort((a, b) => a.ratio - b.ratio);
  OUT.contrast.failures = OUT.contrast.failures.slice(0, 25);
  OUT.contrast.unverifiable = OUT.contrast.unverifiable.slice(0, 10);

  /* ---------- 2. tap targets (WCAG 2.2 SC 2.5.8, min 24x24) ---------- */

  const INTERACTIVE = "a[href], button, input, select, textarea, summary, [role=button], [role=link], [role=switch], [role=checkbox], [role=tab], [tabindex]:not([tabindex='-1'])";
  const controls = [...document.querySelectorAll(INTERACTIVE)].filter(visible);

  OUT.tapTargets = { checked: controls.length, tooSmall: [] };
  for (const el of controls) {
    const r = rect(el);
    const w = Math.round(r.width), h = Math.round(r.height);
    if (w >= 24 && h >= 24) continue;
    // An inline link inside a paragraph is exempt from 2.5.8.
    const inFlow = el.tagName === "A" && getComputedStyle(el).display.includes("inline") &&
      el.parentElement && el.parentElement.innerText.trim().length > label(el).length + 10;
    OUT.tapTargets.tooSmall.push({
      text: label(el) || el.getAttribute("aria-label") || "(no text)",
      tag: el.tagName.toLowerCase(),
      selector: cssPath(el),
      size: `${w} x ${h}`,
      exemptInlineLink: inFlow,
      belowRecommended44: true,
    });
  }
  OUT.tapTargets.between24and44 = controls.filter((el) => {
    const r = rect(el);
    return (r.width >= 24 && r.width < 44) || (r.height >= 24 && r.height < 44);
  }).length;

  /* ---------- 3. accessible names & control wiring ---------- */

  const accName = (el) => {
    const al = el.getAttribute("aria-label");
    if (al && al.trim()) return { name: al.trim(), from: "aria-label" };
    const lb = el.getAttribute("aria-labelledby");
    if (lb) {
      const txt = lb.split(/\s+/).map((id) => document.getElementById(id)?.innerText || "").join(" ").trim();
      if (txt) return { name: txt, from: "aria-labelledby" };
    }
    if (el.id) {
      const l = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
      if (l) return { name: l.innerText.trim(), from: "label[for]" };
    }
    const wrap = el.closest("label");
    if (wrap) return { name: wrap.innerText.trim().replace(/\s+/g, " "), from: "wrapping label" };
    const own = label(el);
    if (own) return { name: own, from: "text content" };
    const t = el.getAttribute("title");
    if (t) return { name: t, from: "title" };
    return { name: "", from: null };
  };

  OUT.naming = { unnamed: [], pollutedNames: [], duplicateNames: [] };
  const nameMap = new Map();

  for (const el of controls) {
    const { name, from } = accName(el);
    const entry = {
      tag: el.tagName.toLowerCase(),
      type: el.getAttribute("type") || el.getAttribute("role") || "",
      selector: cssPath(el),
      accessibleName: name.slice(0, 90),
      source: from,
    };

    if (!name) {
      OUT.naming.unnamed.push(entry);
      continue;
    }

    // A <select> or group wrapped in a <label> inherits the label's whole text —
    // including every <option>. Screen readers then announce the entire list as
    // the field's name. This is silent: it looks fine on screen.
    if (from === "wrapping label") {
      const wrap = el.closest("label");
      const optionText = [...wrap.querySelectorAll("option, button")]
        .map((o) => o.textContent.trim()).filter(Boolean);
      const polluted = optionText.length > 1 && optionText.every((o) => name.includes(o));
      if (polluted || name.length > 60) {
        OUT.naming.pollutedNames.push({ ...entry, swallowedControls: optionText.slice(0, 8) });
      }
    }

    const key = name.trim().toLowerCase();
    const href = el.getAttribute("href");
    if (!nameMap.has(key)) nameMap.set(key, []);
    nameMap.get(key).push({ href, selector: cssPath(el) });
  }

  // Same visible text, different destinations: unusable in a screen-reader link list.
  for (const [name, uses] of nameMap) {
    if (uses.length < 2) continue;
    const targets = new Set(uses.map((u) => u.href).filter(Boolean));
    if (targets.size > 1) {
      OUT.naming.duplicateNames.push({ name, count: uses.length, destinations: [...targets] });
    }
  }

  /* ---------- 4. duplicate destinations ---------- */

  const byHref = new Map();
  for (const a of document.querySelectorAll("a[href]")) {
    if (!visible(a)) continue;
    const h = a.getAttribute("href");
    if (!h || h.startsWith("#") || /^(mailto|tel|javascript):/.test(h)) continue;
    const txt = accName(a).name;
    if (!byHref.has(h)) byHref.set(h, new Set());
    byHref.get(h).add(txt);
  }
  OUT.duplicateDestinations = [...byHref.entries()]
    .filter(([, names]) => names.size > 1)
    .map(([href, names]) => ({ href, labels: [...names] }));

  /* ---------- 5. document head / SEO / i18n signals ---------- */

  const meta = (sel, attr = "content") => document.querySelector(sel)?.getAttribute(attr) || null;
  OUT.head = {
    lang: document.documentElement.lang || null,
    dir: document.documentElement.dir || getComputedStyle(document.documentElement).direction,
    title: document.title || null,
    description: meta('meta[name="description"]'),
    viewport: meta('meta[name="viewport"]'),
    canonical: meta('link[rel="canonical"]', "href"),
    openGraph: [...document.querySelectorAll('meta[property^="og:"]')].map((m) => m.getAttribute("property")),
    twitter: [...document.querySelectorAll('meta[name^="twitter:"]')].map((m) => m.getAttribute("name")),
    hreflang: [...document.querySelectorAll('link[rel="alternate"][hreflang]')].map(
      (l) => l.hreflang + " -> " + l.getAttribute("href")
    ),
    structuredData: document.querySelectorAll('script[type="application/ld+json"]').length,
  };

  /* ---------- 6. document structure ---------- */

  const headings = [...document.querySelectorAll("h1,h2,h3,h4,h5,h6")].filter(visible);
  const levels = headings.map((h) => +h.tagName[1]);
  const skips = [];
  for (let i = 1; i < levels.length; i++) {
    if (levels[i] - levels[i - 1] > 1) {
      skips.push(`h${levels[i - 1]} -> h${levels[i]} at "${label(headings[i])}"`);
    }
  }
  OUT.structure = {
    h1Count: levels.filter((l) => l === 1).length,
    outline: headings.slice(0, 30).map((h) => h.tagName + ": " + label(h)),
    skippedLevels: skips,
    landmarks: ["main", "nav", "header", "footer", "aside", "[role=main]", "[role=navigation]"]
      .map((s) => s + "=" + document.querySelectorAll(s).length).join("  "),
    skipLink: !!document.querySelector('a[href^="#"]:first-of-type'),
    imagesMissingAlt: [...document.querySelectorAll("img")].filter((i) => visible(i) && !i.hasAttribute("alt"))
      .map((i) => i.currentSrc?.slice(-60) || i.src?.slice(-60)),
    totalImages: document.querySelectorAll("img").length,
  };

  /* ---------- 7. forms ---------- */

  OUT.forms = [...document.querySelectorAll("input, select, textarea")].filter(visible).map((f) => ({
    tag: f.tagName.toLowerCase(),
    type: f.type || "",
    id: f.id || null,
    name: f.name || null,
    accessibleName: accName(f).name.slice(0, 60),
    nameSource: accName(f).from,
    autocomplete: f.getAttribute("autocomplete"),
    required: f.required,
    ariaInvalid: f.getAttribute("aria-invalid"),
    ariaDescribedby: f.getAttribute("aria-describedby"),
    placeholder: f.placeholder || null,
  }));

  // A submit button disabled before the user has done anything hides *why* it is
  // disabled. The user is left guessing which field is at fault.
  OUT.disabledSubmits = [...document.querySelectorAll("button[type=submit], input[type=submit]")]
    .filter((b) => b.disabled)
    .map((b) => ({ text: label(b), selector: cssPath(b) }));

  /* ---------- 8. layout hazards ---------- */

  const de = document.documentElement;
  OUT.layout = {
    horizontalOverflow: de.scrollWidth > de.clientWidth + 1
      ? { scrollWidth: de.scrollWidth, clientWidth: de.clientWidth }
      : null,
    pageHeight: de.scrollHeight,
    screensOfScroll: Math.round((de.scrollHeight / innerHeight) * 10) / 10,
    overflowingElements: [...document.querySelectorAll("body *")]
      .filter((el) => visible(el) && rect(el).right > innerWidth + 2)
      .slice(0, 8)
      .map((el) => ({ selector: cssPath(el), right: Math.round(rect(el).right), text: label(el) })),
  };

  /* ---------- 9. performance ---------- */

  const nav = performance.getEntriesByType("navigation")[0];
  const paints = {};
  performance.getEntriesByType("paint").forEach((p) => (paints[p.name] = Math.round(p.startTime)));
  const res = performance.getEntriesByType("resource");
  OUT.performance = {
    ttfb: nav ? Math.round(nav.responseStart - nav.requestStart) : null,
    domContentLoaded: nav ? Math.round(nav.domContentLoadedEventEnd) : null,
    loadEvent: nav ? Math.round(nav.loadEventEnd) : null,
    paints,
    requestCount: res.length,
    transferKB: Math.round(res.reduce((a, r) => a + (r.transferSize || 0), 0) / 1024),
    note: "transferKB reads 0 for cached resources — hard-reload before trusting it",
  };

  return JSON.stringify(OUT, null, 1);
})();
