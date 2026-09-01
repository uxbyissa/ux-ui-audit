/**
 * probe-heuristics.js — design-psychology measurement
 *
 * Implements the measurable half of a UX evaluation matrix: Hick's Law,
 * Fitts's Law, design-system conformance, interaction-state coverage, and
 * microcopy presence.
 *
 * These are laws with formulas, so they deserve arithmetic rather than
 * impressions. "The screen feels busy" is a matter of taste and gets argued
 * with; "38 interactive targets on first view, Hick index 5.3 against a
 * norm of 2–3" is a number, and it points at which controls to cut.
 *
 * A note on what this probe does NOT claim. These figures describe structure,
 * not experience. A high Hick index on a dashboard built for experts may be
 * correct — density is the product. Treat every output as a question to
 * investigate, and always report the number with the context that makes it
 * meaningful.
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
  const inViewport = (el) => {
    const r = rect(el);
    return r.top < innerHeight && r.bottom > 0 && r.left < innerWidth && r.right > 0;
  };
  // innerText is render-aware, so it returns "" for icon buttons whose only
  // text is visually hidden — exactly the controls a report most needs named.
  // Fall through to aria-label and textContent before giving up.
  const label = (el) =>
    (el.innerText || el.getAttribute("aria-label") || el.textContent || el.value || "")
      .trim().replace(/\s+/g, " ").slice(0, 32);
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

  const INTERACTIVE =
    "a[href], button, input:not([type=hidden]), select, textarea, summary, " +
    "[role=button], [role=link], [role=switch], [role=checkbox], [role=radio], [role=tab], " +
    "[role=menuitem], [onclick], [tabindex]:not([tabindex='-1'])";
  const controls = [...document.querySelectorAll(INTERACTIVE)].filter(visible);
  const firstScreen = controls.filter(inViewport);

  /* ================= 1. Hick's Law / cognitive load ================= */
  /* T = b · log2(n + 1). The constant b is empirical and person-specific, so
   * the absolute time is meaningless here; log2(n+1) is the comparable part.
   * It is reported as an index, not as seconds, to avoid implying a precision
   * the model does not have. */

  const hick = (n) => Math.round(Math.log2(n + 1) * 100) / 100;

  const navGroups = [...document.querySelectorAll("nav, [role=navigation], [role=menu], [role=tablist]")]
    .filter(visible)
    .map((g) => ({
      selector: cssPath(g),
      choices: g.querySelectorAll(INTERACTIVE).length,
      hickIndex: hick(g.querySelectorAll(INTERACTIVE).length),
    }));

  const forms = [...document.querySelectorAll("form")].filter(visible).map((f) => {
    const fields = [...f.querySelectorAll("input:not([type=hidden]):not([type=submit]), select, textarea")].filter(visible);
    const required = fields.filter((x) => x.required || x.getAttribute("aria-required") === "true");
    return {
      selector: cssPath(f),
      fields: fields.length,
      requiredFields: required.length,
      // Each field is a decision plus a typing cost. Long forms are the single
      // most reliable predictor of abandonment in a transactional flow.
      note: fields.length > 7 ? "long form — consider splitting into steps or deferring optional fields" : null,
    };
  });

  const selects = [...document.querySelectorAll("select")].filter(visible).map((s) => ({
    selector: cssPath(s),
    options: s.options.length,
    hickIndex: hick(s.options.length),
    note: s.options.length > 12 ? "long option list — needs search, grouping, or a better default" : null,
  }));

  OUT.cognitiveLoad = {
    interactiveTotal: controls.length,
    interactiveFirstScreen: firstScreen.length,
    hickIndexFirstScreen: hick(firstScreen.length),
    reference: "Typical well-scoped screen: 8–15 interactive targets on first view (index ~3.2–4.0). " +
      "Density is not automatically wrong — an expert dashboard earns it. Ask whether the screen has one obvious primary task.",
    distinctTextBlocks: [...document.querySelectorAll("p, li, span, div")]
      .filter((e) => visible(e) && e.children.length === 0 && e.textContent.trim().length > 20 && inViewport(e)).length,
    navigationGroups: navGroups,
    forms,
    longSelects: selects.filter((s) => s.note),
  };

  /* ================= 2. Fitts's Law ================= */
  /* ID = log2(D/W + 1). Larger index = harder acquisition. Distance is measured
   * from where the hand already is: on touch that is the thumb rest near the
   * bottom of the screen; on pointer it is wherever the previous action left
   * the cursor, approximated here by the viewport centre. */

  const isTouch = innerWidth < 768;
  const origin = isTouch
    ? { x: innerWidth / 2, y: innerHeight * 0.9 }   // thumb rest, bottom centre
    : { x: innerWidth / 2, y: innerHeight / 2 };

  const fitts = (el) => {
    const r = rect(el);
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const D = Math.hypot(cx - origin.x, cy - origin.y);
    const W = Math.min(r.width, r.height);   // the constraining dimension
    if (W <= 0) return null;
    return {
      index: Math.round(Math.log2(D / W + 1) * 100) / 100,
      distance: Math.round(D),
      width: Math.round(r.width),
      height: Math.round(r.height),
    };
  };

  // A primary action: filled background, or an explicit primary/cta class.
  const looksPrimary = (el) => {
    const cs = getComputedStyle(el);
    const bg = cs.backgroundColor;
    const filled = bg && !/rgba\(0, 0, 0, 0\)|transparent/.test(bg);
    const named = /\b(primary|cta|submit|main-action|btn-primary)\b/i.test((el.className || "").toString());
    return filled || named;
  };

  const primaries = firstScreen.filter((el) => looksPrimary(el) && rect(el).width > 60);

  OUT.fitts = {
    inputMode: isTouch ? "touch (origin: thumb rest, bottom centre)" : "pointer (origin: viewport centre)",
    primaryActions: primaries.map((el) => ({
      text: label(el) || "(icon only)",
      selector: cssPath(el),
      ...fitts(el),
      // On a phone the top of the screen needs a hand shift. Primary actions
      // belong in the lower half.
      reachability: isTouch
        ? (rect(el).top > innerHeight * 0.55 ? "easy thumb reach"
          : rect(el).top > innerHeight * 0.3 ? "mid — needs a stretch"
          : "top of screen — requires regripping the device")
        : "n/a",
    })),
    competingPrimaries: primaries.length > 1
      ? {
          count: primaries.length,
          labels: primaries.map((el) => label(el)),
          note: "More than one control styled as primary on one screen means none of them is. " +
            "Give the intended action the filled treatment and demote the rest to outline or text.",
        }
      : null,
    hardestTargets: controls
      .filter(inViewport)
      .map((el) => ({ text: label(el) || "(icon)", selector: cssPath(el), ...fitts(el) }))
      .filter((x) => x.index)
      .sort((a, b) => b.index - a.index)
      .slice(0, 8),
  };

  /* ================= 3. Design-system conformance ================= */
  /* A design system is a constrained set of values. Counting the distinct
   * values actually rendered tells you whether the system is real or whether
   * it is a folder of components everyone edits ad hoc. */

  const sample = [...document.querySelectorAll("body *")].filter(visible).slice(0, 1200);
  const tally = (fn) => {
    const m = new Map();
    for (const el of sample) {
      const v = fn(getComputedStyle(el), el);
      if (v == null || v === "" || v === "0px" || v === "normal" || v === "none") continue;
      m.set(v, (m.get(v) || 0) + 1);
    }
    return m;
  };
  const top = (m, n = 12) => [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([v, c]) => v + " ×" + c);

  const fontSizes = tally((cs, el) => (el.textContent.trim() ? cs.fontSize : null));
  const fontWeights = tally((cs, el) => (el.textContent.trim() ? cs.fontWeight : null));
  const radii = tally((cs) => cs.borderRadius);
  const spacing = new Map();
  for (const el of sample) {
    const cs = getComputedStyle(el);
    for (const p of ["paddingTop", "paddingBottom", "paddingLeft", "paddingRight", "gap"]) {
      const v = cs[p];
      if (!v || v === "0px" || v === "normal") continue;
      spacing.set(v, (spacing.get(v) || 0) + 1);
    }
  }
  const colors = tally((cs, el) => (el.textContent.trim() ? cs.color : null));
  const families = tally((cs, el) => (el.textContent.trim() ? cs.fontFamily.split(",")[0].trim() : null));

  const verdict = (n, healthy, label) =>
    n <= healthy ? `${n} — consistent` : `${n} — above a typical ${label} scale (${healthy} or fewer); check whether these are tokens or one-off values`;

  OUT.designSystem = {
    distinctFontSizes: { count: fontSizes.size, verdict: verdict(fontSizes.size, 10, "type"), values: top(fontSizes) },
    distinctFontWeights: { count: fontWeights.size, values: top(fontWeights, 8) },
    distinctFontFamilies: { count: families.size, values: top(families, 6) },
    distinctSpacingValues: { count: spacing.size, verdict: verdict(spacing.size, 14, "spacing"), values: top(spacing) },
    distinctBorderRadii: { count: radii.size, verdict: verdict(radii.size, 6, "radius"), values: top(radii, 8) },
    distinctTextColors: { count: colors.size, verdict: verdict(colors.size, 8, "text-colour"), values: top(colors) },
    usesCustomProperties: (() => {
      try {
        const rootStyles = getComputedStyle(document.documentElement);
        let n = 0;
        for (let i = 0; i < rootStyles.length; i++) if (rootStyles[i].startsWith("--")) n++;
        return n;
      } catch { return null; }
    })(),
    note: "Counts include third-party embeds. Cross-check a surprising number against the token file before reporting it.",
  };

  /* ================= 4. Interaction states ================= */
  /* Cannot be seen in a screenshot: a static image captures exactly one state.
   * Read the stylesheets instead. A control with no hover, focus or active
   * rule gives the user no confirmation that the system registered them. */

  const stateRules = { hover: 0, focus: 0, focusVisible: 0, active: 0, disabled: 0, checked: 0, ariaExpanded: 0, ariaBusy: 0 };
  let readableSheets = 0, blockedSheets = 0;
  for (const sheet of document.styleSheets) {
    let rules;
    try { rules = sheet.cssRules; readableSheets++; } catch { blockedSheets++; continue; }
    if (!rules) continue;
    for (const rule of rules) {
      const sel = rule.selectorText;
      if (!sel) continue;
      if (sel.includes(":hover")) stateRules.hover++;
      if (sel.includes(":focus-visible")) stateRules.focusVisible++;
      else if (sel.includes(":focus")) stateRules.focus++;
      if (sel.includes(":active")) stateRules.active++;
      if (sel.includes(":disabled") || sel.includes("[disabled]")) stateRules.disabled++;
      if (sel.includes(":checked")) stateRules.checked++;
      if (sel.includes("aria-expanded")) stateRules.ariaExpanded++;
      if (sel.includes("aria-busy") || sel.includes("data-loading")) stateRules.ariaBusy++;
    }
  }

  OUT.interactionStates = {
    ruleCounts: stateRules,
    stylesheetsRead: readableSheets,
    stylesheetsBlockedByCORS: blockedSheets,
    missing: Object.entries(stateRules).filter(([, n]) => n === 0).map(([k]) => k),
    pointerCursorMissing: controls
      .filter((el) => el.tagName !== "INPUT" && el.tagName !== "TEXTAREA" && getComputedStyle(el).cursor !== "pointer")
      .slice(0, 8)
      .map((el) => ({ text: label(el) || "(icon)", selector: cssPath(el), cursor: getComputedStyle(el).cursor })),
    transitionsPresent: controls.filter((el) => {
      const t = getComputedStyle(el).transitionDuration;
      return t && t !== "0s";
    }).length,
    liveRegions: document.querySelectorAll("[aria-live], [role=status], [role=alert], [role=log]").length,
    note: blockedSheets
      ? `${blockedSheets} stylesheet(s) unreadable (cross-origin) — the counts are a floor, not a total.`
      : "All stylesheets readable; counts are complete for this page.",
  };

  /* ================= 5. Microcopy and error tolerance ================= */

  const fields = [...document.querySelectorAll("input:not([type=hidden]):not([type=submit]):not([type=button]), select, textarea")]
    .filter(visible);

  OUT.microcopy = {
    fieldsTotal: fields.length,
    withHelperText: fields.filter((f) => f.getAttribute("aria-describedby")).length,
    withoutHelperText: fields
      .filter((f) => !f.getAttribute("aria-describedby"))
      .slice(0, 10)
      .map((f) => ({ selector: cssPath(f), type: f.type || f.tagName.toLowerCase() })),
    // A placeholder disappears the moment typing starts, taking the only
    // instruction with it, and it usually fails contrast as well.
    placeholderAsOnlyLabel: fields
      .filter((f) => {
        if (!f.placeholder) return false;
        const hasLabel = (f.id && document.querySelector(`label[for="${CSS.escape(f.id)}"]`)) ||
          f.closest("label") || f.getAttribute("aria-label") || f.getAttribute("aria-labelledby");
        return !hasLabel;
      })
      .map((f) => ({ selector: cssPath(f), placeholder: f.placeholder })),
    requiredMarked: fields.filter((f) => f.required || f.getAttribute("aria-required") === "true").length,
    errorContainers: document.querySelectorAll("[role=alert], [aria-live=assertive], [aria-invalid=true]").length,
    submitBlockedWithoutExplanation: [...document.querySelectorAll("button[type=submit], input[type=submit]")]
      .filter((b) => b.disabled)
      .map((b) => ({
        text: label(b),
        note: "Disabled before the user has acted. The user cannot tell which field is at fault, " +
          "and a disabled control announces nothing to a screen reader. Keep it enabled and " +
          "surface field-level errors on submit.",
      })),
  };

  /* ================= 6. Visual hierarchy (structural half) ================= */
  /* Whether the eye actually lands in the right place needs a screenshot. What
   * can be measured here is whether the type scale creates a hierarchy at all,
   * and whether the largest element is the page's actual subject. */

  const textEls = sample.filter((e) => e.children.length === 0 && e.textContent.trim().length > 1 && inViewport(e));
  const sized = textEls
    .map((e) => ({ px: parseFloat(getComputedStyle(e).fontSize), text: e.textContent.trim().slice(0, 40), tag: e.tagName }))
    .sort((a, b) => b.px - a.px);
  const uniqueSizes = [...new Set(sized.map((s) => s.px))].sort((a, b) => b - a);
  const body = uniqueSizes.length ? (sized.map((s) => s.px).sort((a, b) => a - b)[Math.floor(sized.length / 2)]) : null;

  OUT.visualHierarchy = {
    largestTextOnScreen: sized[0] || null,
    typeScaleSteps: uniqueSizes.slice(0, 10),
    medianBodySize: body,
    headlineToBodyRatio: sized[0] && body ? Math.round((sized[0].px / body) * 100) / 100 : null,
    ratioNote: "Below ~1.5 the headline does not separate from body text and the eye has no entry point. " +
      "Above ~3 on a dense screen the jump can leave the middle of the hierarchy empty.",
    smallTextUnder12px: textEls
      .filter((e) => parseFloat(getComputedStyle(e).fontSize) < 12)
      .slice(0, 8)
      .map((e) => ({ text: e.textContent.trim().slice(0, 30), size: getComputedStyle(e).fontSize })),
    requiresScreenshot: "Gestalt grouping, scan path, and whether the visual emphasis matches the task priority " +
      "cannot be derived from the DOM. Capture the viewport and assess those separately.",
  };

  return JSON.stringify(OUT, null, 1);
})();
