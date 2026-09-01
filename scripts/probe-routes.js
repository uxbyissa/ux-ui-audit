/**
 * probe-routes.js — destination sweep
 *
 * Follows every same-origin link on the page and reports what actually comes
 * back. Catches the defect class that reads perfectly in code review: a link
 * whose label promises one destination and whose href points at another, two
 * differently-named entries sharing one route, and routes that 404 or bounce
 * to a login the author forgot was gated.
 *
 * This issues real requests as the signed-in user, so it is safe for GET
 * navigation but must never be pointed at links that mutate state. Anything
 * matching DESTRUCTIVE below is listed and skipped rather than followed.
 *
 * Returns a JSON string. Expect it to take a few seconds on a large page.
 */
(async () => {
  const DESTRUCTIVE = /(logout|signout|sign-out|delete|remove|destroy|cancel|unsubscribe|revoke|reset|purchase|checkout|pay|confirm)/i;

  const visible = (el) => {
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) return false;
    const cs = getComputedStyle(el);
    return cs.visibility !== "hidden" && cs.display !== "none";
  };
  const nameOf = (a) =>
    (a.getAttribute("aria-label") || a.innerText || a.textContent || "").trim().replace(/\s+/g, " ").slice(0, 45);

  const anchors = [...document.querySelectorAll("a[href]")].filter(visible);

  const links = [];
  for (const a of anchors) {
    const raw = a.getAttribute("href");
    if (!raw || raw.startsWith("#") || /^(mailto|tel|javascript|data):/i.test(raw)) continue;
    let url;
    try { url = new URL(raw, location.href); } catch { continue; }
    links.push({ raw, url, name: nameOf(a), sameOrigin: url.origin === location.origin });
  }

  /* --- label/destination relationships, computed before any request --- */

  const byHref = new Map();
  const byName = new Map();
  for (const l of links) {
    if (!byHref.has(l.raw)) byHref.set(l.raw, new Set());
    byHref.get(l.raw).add(l.name);
    const k = l.name.toLowerCase();
    if (!byName.has(k)) byName.set(k, new Set());
    byName.get(k).add(l.raw);
  }

  const OUT = {
    url: location.href,
    totalLinks: links.length,

    // Two labels, one destination. Usually a placeholder route that was never
    // split, and the user discovers it by landing somewhere they did not ask for.
    sharedDestinations: [...byHref.entries()]
      .filter(([, names]) => names.size > 1)
      .map(([href, names]) => ({ href, labels: [...names] })),

    // One label, several destinations. In a screen reader's link list these are
    // indistinguishable; sighted users rely on surrounding context that a
    // keyboard user never gets.
    ambiguousLabels: [...byName.entries()]
      .filter(([name, hrefs]) => hrefs.size > 1 && name.length > 0)
      .map(([name, hrefs]) => ({ label: name, destinations: [...hrefs] })),

    unnamedLinks: links.filter((l) => !l.name).map((l) => l.raw),
    external: [...new Set(links.filter((l) => !l.sameOrigin).map((l) => l.url.origin))],
    skippedAsDestructive: [],
    results: [],
  };

  /* --- follow same-origin GETs --- */

  const targets = [...new Set(links.filter((l) => l.sameOrigin).map((l) => l.raw))];
  for (const href of targets) {
    if (DESTRUCTIVE.test(href)) {
      OUT.skippedAsDestructive.push(href);
      continue;
    }
    const labels = [...(byHref.get(href) || [])];
    try {
      const res = await fetch(href, { redirect: "follow", credentials: "same-origin" });
      const landed = new URL(res.url).pathname + new URL(res.url).search;
      const asked = new URL(href, location.href).pathname + new URL(href, location.href).search;
      OUT.results.push({
        labels,
        href,
        status: res.status,
        redirectedTo: landed !== asked ? landed : null,
        // A redirect to a login page means this link is gated; if it also drops
        // the original path, the user loses their destination after signing in.
        looksGated: /login|signin|sign-in|auth/i.test(landed) && !/login|signin/i.test(asked),
        keepsReturnPath: /redirect|return|next|continue|from/i.test(landed),
      });
    } catch (e) {
      OUT.results.push({ labels, href, error: String(e).slice(0, 90) });
    }
  }

  OUT.broken = OUT.results.filter((r) => r.error || (r.status && r.status >= 400));
  OUT.gatedLosingDestination = OUT.results.filter((r) => r.looksGated && !r.keepsReturnPath);
  OUT.summary = {
    followed: OUT.results.length,
    ok: OUT.results.filter((r) => r.status === 200).length,
    broken: OUT.broken.length,
    redirected: OUT.results.filter((r) => r.redirectedTo).length,
  };
  OUT.note =
    "sharedDestinations and ambiguousLabels are the high-value rows — a 200 only proves the " +
    "route exists, not that it is the route the label promised. Open anything surprising by hand.";

  return JSON.stringify(OUT, null, 1);
})();
