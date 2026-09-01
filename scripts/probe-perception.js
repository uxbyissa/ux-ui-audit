/**
 * probe-perception.js — Gestalt, affordance and response-time measurement
 *
 * The criteria here are usually filed under "needs a designer's eye". Most of
 * them do not. Gestalt grouping is a claim about *distance*, similarity is a
 * claim about *shared visual attributes*, alignment is a claim about *shared
 * edges* — all three are geometry, and geometry is in the DOM.
 *
 * What genuinely still needs eyes: whether the resulting grouping matches the
 * user's mental model, and whether the whole thing is pleasant. This probe
 * measures the mechanics so a reviewer can spend their attention on the part
 * that actually requires them.
 *
 * Returns a JSON string.
 */
(() => {
  const OUT = { url: location.href, viewport: [innerWidth, innerHeight] };
  const rect = (el) => el.getBoundingClientRect();
  const visible = (el) => {
    const r = rect(el);
    if (!r.width || !r.height) return false;
    const cs = getComputedStyle(el);
    return cs.visibility !== "hidden" && cs.display !== "none" && cs.opacity !== "0";
  };
  const inView = (el) => {
    const r = rect(el);
    return r.top < innerHeight && r.bottom > 0;
  };
  const txt = (el) =>
    (el.innerText || el.getAttribute("aria-label") || el.textContent || "").trim().replace(/\s+/g, " ").slice(0, 34);
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
  const rtl = getComputedStyle(document.documentElement).direction === "rtl";

  /* ============ 1. Gestalt proximity ============
   * Related things should sit closer together than unrelated things. The
   * failure has a signature: a heading separated from its own content by more
   * space than separates it from the previous block, so the eye attaches the
   * label to the wrong group. That is measurable — it is just a gap comparison. */

  const proximity = { uniformlySpacedGroups: [], orphanedHeadings: [] };
  for (const container of document.querySelectorAll("body *")) {
    const kids = [...container.children].filter(visible);
    if (kids.length < 3 || kids.length > 30) continue;
    const cs = getComputedStyle(container);
    const vertical = !cs.display.includes("flex") || cs.flexDirection.startsWith("column");
    if (!vertical) continue;

    const gaps = [];
    for (let i = 1; i < kids.length; i++) {
      const g = Math.round(rect(kids[i]).top - rect(kids[i - 1]).bottom);
      if (g >= 0 && g < 400) gaps.push(g);
    }
    if (gaps.length < 2) continue;

    const uniq = [...new Set(gaps)];
    // Every gap identical across many children: the layout states no grouping
    // at all, so the reader has to derive structure from the words alone.
    if (uniq.length === 1 && kids.length >= 5 && uniq[0] > 0) {
      proximity.uniformlySpacedGroups.push({
        selector: path(container),
        children: kids.length,
        gap: uniq[0] + "px",
        note: "identical spacing throughout — no visual grouping is expressed",
      });
    }
  }

  // Heading closer to what precedes it than to what it labels.
  for (const h of document.querySelectorAll("h1,h2,h3,h4,h5,h6,legend")) {
    if (!visible(h)) continue;
    const next = h.nextElementSibling, prev = h.previousElementSibling;
    if (!next || !visible(next)) continue;
    const below = Math.round(rect(next).top - rect(h).bottom);
    const above = prev && visible(prev) ? Math.round(rect(h).top - rect(prev).bottom) : null;
    if (above != null && below > above && below - above >= 6) {
      proximity.orphanedHeadings.push({
        heading: txt(h),
        selector: path(h),
        spaceAbove: above + "px",
        spaceBelow: below + "px",
        note: "closer to the preceding block than to the content it labels — the eye groups it upward",
      });
    }
  }
  proximity.uniformlySpacedGroups = proximity.uniformlySpacedGroups.slice(0, 8);
  proximity.orphanedHeadings = proximity.orphanedHeadings.slice(0, 10);
  OUT.proximity = proximity;

  /* ============ 2. Gestalt similarity ============
   * Controls that do the same kind of job should look the same, so the eye can
   * classify them without reading. Divergent treatment across one role means
   * the user re-learns the vocabulary on every screen. */

  // A pill radius is authored as 9999px and computes to ~33554400px, which
  // renders in a report as scientific notation and reads like a bug in the
  // probe. Name the intent instead of printing the number.
  const radius = (cs) => {
    const v = parseFloat(cs.borderRadius);
    if (!Number.isFinite(v)) return cs.borderRadius;
    return v > 500 ? "pill" : cs.borderRadius;
  };
  const styleKey = (el) => {
    const cs = getComputedStyle(el);
    return [cs.backgroundColor, radius(cs), cs.fontSize, cs.fontWeight, Math.round(rect(el).height) + "px tall"].join(" | ");
  };
  const roleBuckets = new Map();
  for (const el of document.querySelectorAll("button, a[href], input[type=submit], [role=button]")) {
    if (!visible(el) || rect(el).width < 40) continue;
    const role = el.tagName === "A" ? "link-styled-control" : "button";
    if (!roleBuckets.has(role)) roleBuckets.set(role, new Map());
    const b = roleBuckets.get(role);
    const k = styleKey(el);
    if (!b.has(k)) b.set(k, []);
    b.get(k).push(txt(el) || "(icon)");
  }
  OUT.similarity = [...roleBuckets.entries()].map(([role, variants]) => ({
    role,
    distinctTreatments: variants.size,
    variants: [...variants.entries()].slice(0, 8).map(([style, examples]) => ({
      style, count: examples.length, examples: examples.slice(0, 4),
    })),
    note: variants.size > 4
      ? "many visual treatments for one control type — check these are deliberate tiers (primary/secondary/tertiary) and not drift"
      : null,
  }));

  /* ============ 3. Alignment / grid ============
   * A grid shows up as a small set of shared edges. Many distinct edges means
   * blocks were positioned individually, which reads as visual noise even when
   * no single element looks wrong. */

  const blocks = [...document.querySelectorAll("body *")].filter(
    (el) => visible(el) && inView(el) && rect(el).width > 120 && rect(el).height > 24
  );
  const edge = (el) => Math.round(rtl ? innerWidth - rect(el).right : rect(el).left);
  const edges = new Map();
  for (const el of blocks) {
    const e = edge(el);
    edges.set(e, (edges.get(e) || 0) + 1);
  }
  const sortedEdges = [...edges.entries()].sort((a, b) => b[1] - a[1]);
  OUT.alignment = {
    readingEdge: rtl ? "inline-start = right (RTL)" : "inline-start = left (LTR)",
    blocksMeasured: blocks.length,
    distinctEdges: edges.size,
    dominantEdges: sortedEdges.slice(0, 6).map(([px, n]) => px + "px ×" + n),
    strayEdges: sortedEdges.filter(([, n]) => n === 1).length,
    note: "A handful of dominant edges carrying most blocks indicates a grid. " +
      "A long tail of one-off edges is where visual noise comes from — check the stray ones first.",
  };

  /* ============ 4. Miller's Law — chunking ============
   * Working memory holds a limited number of items. Long flat lists of choices
   * with no subgrouping exceed it, and the user re-scans instead of remembering. */

  const CHOICE = "a[href], button, [role=menuitem], [role=option], [role=tab], li";
  OUT.chunking = [...document.querySelectorAll("nav, ul, ol, [role=menu], [role=tablist], [role=listbox], fieldset")]
    .filter(visible)
    .map((g) => {
      const items = [...g.children].filter((c) => visible(c) && c.matches(CHOICE));
      const subheads = g.querySelectorAll("h2,h3,h4,h5,legend,[role=group],optgroup").length;
      return { selector: path(g), items: items.length, subgroups: subheads };
    })
    .filter((g) => g.items > 9 && g.subgroups === 0)
    .slice(0, 8)
    .map((g) => ({ ...g, note: `${g.items} flat choices with no subgrouping — beyond comfortable working-memory span (about 7±2)` }));

  /* ============ 5. Doherty threshold — perceived response ============
   * Below roughly 400ms an interface feels immediate; past it the user starts
   * waiting. Where work genuinely takes longer, a skeleton that shows the
   * shape of the result reads as faster than a spinner that shows nothing. */

  const longTasks = performance.getEntriesByType ? (performance.getEntriesByType("longtask") || []) : [];
  const events = performance.getEntriesByType ? (performance.getEntriesByType("event") || []) : [];
  const slowEvents = events
    .map((e) => ({ type: e.name, duration: Math.round(e.duration) }))
    .filter((e) => e.duration > 200)
    .slice(0, 8);

  const skeletonish = document.querySelectorAll(
    '[class*="skeleton" i], [class*="shimmer" i], [class*="placeholder" i], [data-loading], [aria-busy="true"]'
  ).length;
  const spinnerish = document.querySelectorAll(
    '[class*="spinner" i], [class*="loader" i], [class*="loading" i], [role=progressbar]'
  ).length;

  OUT.responsiveness = {
    dohertyThresholdMs: 400,
    longTasksOver50ms: longTasks.length,
    slowInteractionEvents: slowEvents,
    skeletonElements: skeletonish,
    spinnerElements: spinnerish,
    loadingStrategy:
      skeletonish > 0 ? "skeleton screens present — perceived wait is shorter"
      : spinnerish > 0 ? "spinner only — consider skeletons that show the shape of the incoming content"
      : "no loading affordance detected on this snapshot",
    note: "Event timings only cover interactions that happened while this page was open. " +
      "Interact with the primary flow first, then re-run, or these will read empty.",
  };

  /* ============ 6. Emphasis inflation ============
   * Refactoring UI's point: you emphasise by de-emphasising everything else.
   * When most of the page is already loud, nothing reads as important. */

  const textEls = [...document.querySelectorAll("body *")].filter(
    (el) => visible(el) && inView(el) && el.children.length === 0 && el.textContent.trim().length > 1
  );
  const weights = textEls.map((el) => parseInt(getComputedStyle(el).fontWeight, 10) || 400);
  const bold = weights.filter((w) => w >= 600).length;
  const sizes = textEls.map((el) => parseFloat(getComputedStyle(el).fontSize)).sort((a, b) => a - b);
  const median = sizes[Math.floor(sizes.length / 2)] || 16;

  OUT.emphasis = {
    textElementsOnScreen: textEls.length,
    boldOrHeavier: bold,
    proportionBold: textEls.length ? Math.round((bold / textEls.length) * 100) + "%" : null,
    largerThanMedian1_5x: textEls.filter((el) => parseFloat(getComputedStyle(el).fontSize) >= median * 1.5).length,
    note: textEls.length && bold / textEls.length > 0.4
      ? "over 40% of on-screen text is semibold or heavier — weight has stopped carrying hierarchy"
      : "weight distribution leaves room for emphasis to register",
  };

  /* ============ 7. Clickability affordance ============
   * Krug's rule: the user should never spend even a moment wondering whether
   * something is clickable. An inline link that shares its colour with the
   * surrounding text and carries no underline is invisible as a control. */

  OUT.affordance = { indistinctInlineLinks: [], noPointerCursor: [] };
  for (const a of document.querySelectorAll("a[href]")) {
    if (!visible(a) || !inView(a)) continue;
    const cs = getComputedStyle(a);
    const parent = a.parentElement;
    if (!parent) continue;
    const pcs = getComputedStyle(parent);
    const inline = cs.display.includes("inline");
    const sameColour = cs.color === pcs.color;
    const noUnderline = !cs.textDecorationLine.includes("underline");
    const noWeight = cs.fontWeight === pcs.fontWeight;
    const noBg = /rgba\(0, 0, 0, 0\)|transparent/.test(cs.backgroundColor);
    const noBorder = parseFloat(cs.borderBottomWidth) === 0;
    if (inline && sameColour && noUnderline && noWeight && noBg && noBorder) {
      OUT.affordance.indistinctInlineLinks.push({
        text: txt(a), selector: path(a), colour: cs.color,
        note: "identical to surrounding text in colour, weight and decoration — nothing marks it as clickable",
      });
    }
  }
  OUT.affordance.indistinctInlineLinks = OUT.affordance.indistinctInlineLinks.slice(0, 10);
  OUT.affordance.noPointerCursor = [...document.querySelectorAll("button, [role=button], a[href]")]
    .filter((el) => visible(el) && inView(el) && getComputedStyle(el).cursor !== "pointer")
    .slice(0, 8)
    .map((el) => ({ text: txt(el) || "(icon)", selector: path(el), cursor: getComputedStyle(el).cursor }));

  /* ============ 8. Constraints — poka-yoke inputs ============
   * Preventing an error costs the user nothing; reporting one after submit
   * costs them a round trip. Input type, inputmode and validation attributes
   * are the cheapest prevention available and are usually simply omitted. */

  const SEMANTIC = { email: /mail/i, tel: /phone|tel|mobile|جوال|هاتف/i, url: /url|website|link/i, number: /count|qty|amount|age|number|رقم/i };
  OUT.constraints = [...document.querySelectorAll("input")]
    .filter((f) => visible(f) && !["hidden", "submit", "button", "checkbox", "radio", "file"].includes(f.type))
    .map((f) => {
      const hint = (f.name || f.id || f.placeholder || f.getAttribute("aria-label") || "").toString();
      let suggested = null;
      for (const [t, re] of Object.entries(SEMANTIC)) {
        if (re.test(hint) && f.type !== t) { suggested = t; break; }
      }
      const guards = ["pattern", "min", "max", "step", "maxlength", "minlength", "inputmode"]
        .filter((a) => f.hasAttribute(a));
      return {
        selector: path(f),
        type: f.type,
        suggestedType: suggested,
        validationAttributes: guards,
        // Long free-text fields for structured data (card, phone, IBAN) are
        // where chunking and formatting pay off most — Johnson's working-memory
        // point applied to input rather than output.
        structuredDataCandidate: /card|iban|account|phone|tel|code|otp|بطاقة|حساب|رمز/i.test(hint) && guards.length === 0,
      };
    })
    .filter((f) => f.suggestedType || f.validationAttributes.length === 0)
    .slice(0, 12);

  /* ============ 9. Top-of-screen real estate ============
   * Tidwell's point: the first band of the screen is the most valuable space
   * on the page. If it carries only branding, the user pays a scroll before
   * reaching anything useful. */

  const topBand = [...document.querySelectorAll("body *")].filter((el) => {
    const r = rect(el);
    return visible(el) && r.top >= 0 && r.top < 120 && r.width > 40;
  });
  OUT.topBand = {
    heightExamined: "0–120px",
    elements: topBand.length,
    interactive: topBand.filter((el) => el.matches("a[href], button, input, select, [role=button]")).length,
    contentBearing: topBand.filter((el) => el.children.length === 0 && el.textContent.trim().length > 2)
      .slice(0, 8).map((el) => txt(el)),
    note: "Branding alone in this band costs the user a scroll before the first useful thing. " +
      "Confirm the most-requested action or the key status is reachable without scrolling.",
  };

  return JSON.stringify(OUT, null, 1);
})();
