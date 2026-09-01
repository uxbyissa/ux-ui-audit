/**
 * probe-focus.js — focus indicator measurement
 *
 * Run this AFTER a real Tab keypress, not before. Programmatic .focus() does
 * not satisfy :focus-visible, so a probe that focuses elements itself will
 * report "no focus ring" on sites that have a perfectly good one. That false
 * negative is the reason this is a separate script with a required precondition
 * rather than part of probe-core.
 *
 * Usage:
 *   1. Press Tab (a genuine key event through the automation layer).
 *   2. Run this. It measures whatever is focused right now.
 *   3. Repeat for a handful of different control types — a link, a button, a
 *      text input, a custom widget. Focus styles are often defined per
 *      component, so one sample proves nothing about the rest.
 *
 * Returns a JSON string.
 */
(() => {
  const el = document.activeElement;
  if (!el || el === document.body) {
    return JSON.stringify({
      error: "Nothing is focused. Press Tab through the automation layer first, then re-run.",
    });
  }

  // Painted-pixel parser: getComputedStyle returns oklab()/oklch()/color() on
  // modern token systems, which a regex over rgba() silently drops. See the
  // longer note in probe-core.js.
  const _cv = document.createElement("canvas");
  _cv.width = _cv.height = 1;
  const _ctx = _cv.getContext("2d", { willReadFrequently: true });
  const parse = (s) => {
    if (!s || s === "none") return null;
    const m = (s || "").match(/^rgba?\(([^)]+)\)$/);
    if (m) {
      const p = m[1].split(/[,\s/]+/).filter(Boolean).map(Number);
      if (p.length >= 3 && !p.some(Number.isNaN)) {
        return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
      }
    }
    try {
      _ctx.fillStyle = "#000000";
      _ctx.fillStyle = s;
      const first = _ctx.fillStyle;
      _ctx.fillStyle = "#ffffff";
      _ctx.fillStyle = s;
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
    const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  const ratio = (a, b) => {
    const x = lum(a), y = lum(b);
    return Math.round(((Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)) * 100) / 100;
  };
  const bgBehind = (node) => {
    let n = node.parentElement;
    while (n) {
      const c = parse(getComputedStyle(n).backgroundColor);
      if (c && c.a === 1) return c;
      n = n.parentElement;
    }
    return parse(getComputedStyle(document.body).backgroundColor) || { r: 255, g: 255, b: 255, a: 1 };
  };

  const cs = getComputedStyle(el);
  const ground = bgBehind(el);
  const ringColor = parse(cs.outlineColor);
  const width = parseFloat(cs.outlineWidth) || 0;
  const hasOutline = cs.outlineStyle !== "none" && width > 0;
  const hasShadowRing = cs.boxShadow && cs.boxShadow !== "none" && !/^rgba\(0, 0, 0, 0\)/.test(cs.boxShadow);

  const contrast = ringColor && hasOutline ? ratio(ringColor, ground) : null;

  const out = {
    focusedElement: {
      tag: el.tagName.toLowerCase(),
      role: el.getAttribute("role"),
      tabindex: el.getAttribute("tabindex"),
      text: (el.innerText || el.value || "").trim().replace(/\s+/g, " ").slice(0, 45),
      ariaLabel: el.getAttribute("aria-label"),
    },
    focusVisibleMatches: el.matches(":focus-visible"),
    indicator: {
      outlineStyle: cs.outlineStyle,
      outlineWidth: cs.outlineWidth,
      outlineColor: cs.outlineColor,
      outlineOffset: cs.outlineOffset,
      boxShadow: (cs.boxShadow || "").slice(0, 90),
      backgroundBehind: `rgb(${ground.r}, ${ground.g}, ${ground.b})`,
    },
    verdict: {},
  };

  if (!hasOutline && !hasShadowRing) {
    out.verdict.visibleIndicator = "FAIL — no outline and no ring-like box-shadow. WCAG 2.4.7 (Focus Visible).";
  } else if (!hasOutline && hasShadowRing) {
    out.verdict.visibleIndicator = "box-shadow ring only — measure its contrast by eye; this probe cannot resolve shadow color against the ground reliably.";
  } else {
    out.verdict.contrastRatio = contrast;
    out.verdict.contrastRequired = 3;
    out.verdict.contrastPasses = contrast >= 3;
    out.verdict.note_1_4_11 =
      contrast >= 3
        ? "Passes WCAG 2.2 SC 1.4.11 (Non-text Contrast, ≥ 3:1)."
        : `FAIL — ${contrast}:1 against rgb(${ground.r}, ${ground.g}, ${ground.b}); SC 1.4.11 requires ≥ 3:1.`;
    out.verdict.note_thickness =
      width >= 2
        ? "Thickness meets the 2px guidance in SC 2.4.13 (Focus Appearance)."
        : `${width}px is thin; SC 2.4.13 (AAA) asks for a 2px-equivalent perimeter. Not an AA failure, but it reads as a weak indicator.`;
  }

  // A focusable element with no semantic role is announced as plain text and
  // will not respond to Space/Enter the way users expect.
  const NATIVE = /^(a|button|input|select|textarea|summary)$/;
  if (!NATIVE.test(el.tagName.toLowerCase()) && !el.getAttribute("role")) {
    out.verdict.semantics =
      `FAIL — <${el.tagName.toLowerCase()} tabindex="${el.getAttribute("tabindex")}"> with no role. ` +
      "Screen readers announce it as text, and keyboard activation is not wired for free. " +
      "Use a real <a> or <button>, or add an explicit role plus key handlers.";
  }

  return JSON.stringify(out, null, 1);
})();
