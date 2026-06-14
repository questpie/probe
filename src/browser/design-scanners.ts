// Deterministic design-QA scanners, injected via page.evaluate().
//
// Each is an IIFE *string* that runs in page context and returns an array of
// findings: { layer, severity, selector, prop, measured, expected, message }.
// They are kept as strings (not imported functions) on purpose: the exact same
// source is shared with the agent-board `agent-board-design-qa` skill, which
// pastes them into whatever page-eval tool a harness exposes. Keeping one source
// of truth means a fix here is a fix there. They are dependency-free and
// backtick-free so they embed cleanly in either place.
//
// Both were hardened by dogfooding on a real board UI: read the viewport from
// documentElement.clientWidth (the eval context can report 0), report only the
// outermost overflowing element, skip SVG internals, ignore native <select>
// content-overflow, and categorise design tokens by probing CSS variables
// through a throwaway element rather than parsing their text.

export const GEOMETRY_SCAN = `(function () {
  var vw = document.documentElement.clientWidth || window.innerWidth;
  if (!vw) return [{ layer: "meta", severity: "warn", selector: "html", viewport: 0, prop: "viewport", measured: "0", expected: "> 0", message: "viewport width is 0 - page not laid out yet; retry after load" }];
  var out = [];
  function sel(el) {
    if (el.id) return "#" + el.id;
    var parts = [], n = el, depth = 0;
    while (n && n.nodeType === 1 && depth < 4) {
      var p = n.tagName.toLowerCase();
      if (n.classList && n.classList.length) p += "." + Array.prototype.slice.call(n.classList, 0, 2).join(".");
      parts.unshift(p);
      n = n.parentElement; depth++;
    }
    return parts.join(" > ");
  }
  function visible(el) {
    var r = el.getBoundingClientRect(), s = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && s.visibility !== "hidden" && s.display !== "none" && parseFloat(s.opacity) > 0 && !el.ownerSVGElement;
  }
  function add(layer, sev, el, prop, measured, expected, msg) {
    out.push({ layer: layer, severity: sev, selector: sel(el), viewport: vw, prop: prop, measured: measured, expected: expected, message: msg });
  }
  var all = Array.prototype.slice.call(document.body.querySelectorAll("*")).filter(visible);
  for (var i = 0; i < all.length; i++) {
    var el = all[i], r = el.getBoundingClientRect(), s = getComputedStyle(el);
    var tag = el.tagName.toLowerCase();
    var parentOver = el.parentElement && el.parentElement.getBoundingClientRect().right > vw + 2;
    if (r.right > vw + 2 && !parentOver) add("geometry", "blocking", el, "right", Math.round(r.right) + "px", "<= " + vw + "px", "extends " + Math.round(r.right - vw) + "px past the viewport (horizontal overflow)");
    if (el.scrollWidth > el.clientWidth + 1 && s.overflowX !== "auto" && s.overflowX !== "scroll" && tag !== "select") add("geometry", "warn", el, "scrollWidth", el.scrollWidth + "px", "<= " + el.clientWidth + "px", "content overflows its box by " + (el.scrollWidth - el.clientWidth) + "px");
    if (s.textOverflow === "ellipsis" && el.scrollWidth > el.clientWidth + 1 && !el.title && !el.getAttribute("aria-label")) add("geometry", "warn", el, "text", "truncated", "title or aria-label", "ellipsis-truncated text with no title/aria-label");
    if (el.children.length === 0 && (el.textContent || "").trim().length > 0 && r.height < 1) add("geometry", "warn", el, "height", Math.round(r.height) + "px", "> 0", "has text but renders at zero height (collapsed)");
    var interactive = (tag === "a" || tag === "button" || tag === "select" || tag === "textarea") || el.getAttribute("role") === "button" || (tag === "input" && el.type !== "hidden");
    if (interactive && (r.width < 44 || r.height < 44)) add("a11y", "warn", el, "size", Math.round(r.width) + "x" + Math.round(r.height), ">= 44x44", "tap target smaller than 44x44");
    if ((tag === "input" || tag === "textarea" || tag === "select") && parseFloat(s.fontSize) < 16) add("a11y", "polish", el, "fontSize", s.fontSize, ">= 16px", "input font under 16px (causes mobile zoom-on-focus)");
  }
  var parents = all.filter(function (p) { return p.children.length > 1; });
  for (var j = 0; j < parents.length; j++) {
    var kids = Array.prototype.filter.call(parents[j].children, visible);
    if (kids.length < 2) continue;
    var lefts = kids.map(function (k) { return Math.round(k.getBoundingClientRect().left); });
    var counts = {};
    lefts.forEach(function (v) { counts[v] = (counts[v] || 0) + 1; });
    var dom = null, best = 0;
    for (var key in counts) { if (counts[key] > best) { best = counts[key]; dom = parseInt(key, 10); } }
    if (dom !== null && best >= 2) {
      for (var a = 0; a < kids.length; a++) {
        var d = lefts[a] - dom;
        if (d !== 0 && Math.abs(d) <= 4) add("geometry", "warn", kids[a], "left", lefts[a] + "px", dom + "px", "left edge off by " + d + "px from its siblings (near-miss misalignment)");
      }
    }
    for (var x = 0; x < kids.length; x++) {
      for (var y = x + 1; y < kids.length; y++) {
        var ra = kids[x].getBoundingClientRect(), rb = kids[y].getBoundingClientRect();
        var ox = Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left);
        var oy = Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top);
        if (ox > 2 && oy > 2) add("geometry", "warn", kids[y], "overlap", Math.round(ox) + "x" + Math.round(oy) + "px", "no overlap", "overlaps a sibling by " + Math.round(ox) + "x" + Math.round(oy) + "px");
      }
    }
  }
  return out.slice(0, 200);
})()`;

export const TOKEN_SCAN = `(function () {
  var names = {};
  for (var si = 0; si < document.styleSheets.length; si++) {
    var rules; try { rules = document.styleSheets[si].cssRules; } catch (e) { continue; }
    if (!rules) continue;
    for (var ri = 0; ri < rules.length; ri++) {
      var rule = rules[ri];
      if (!rule.style || typeof rule.selectorText !== "string") continue;
      var sl = rule.selectorText;
      if (sl.indexOf(":root") < 0 && sl.indexOf("html") < 0 && sl !== "*") continue;
      for (var pi = 0; pi < rule.style.length; pi++) { var prop = rule.style[pi]; if (prop.indexOf("--") === 0) names[prop] = true; }
    }
  }
  var probe = document.createElement("div");
  probe.style.position = "absolute"; probe.style.left = "-9999px"; probe.style.top = "0";
  document.body.appendChild(probe);
  var colorSet = {}, shadowSet = {}, radiusSet = {}, nShadow = 0, nRadius = 0;
  for (var name in names) {
    var ref = "var(" + name + ")";
    probe.style.backgroundColor = ""; probe.style.backgroundColor = ref;
    var bc = getComputedStyle(probe).backgroundColor;
    if (bc && bc !== "rgba(0, 0, 0, 0)" && bc !== "transparent") { colorSet[bc] = true; continue; }
    probe.style.boxShadow = ""; probe.style.boxShadow = ref;
    var bs = getComputedStyle(probe).boxShadow;
    if (bs && bs !== "none") { if (!shadowSet[bs]) { shadowSet[bs] = true; nShadow++; } continue; }
    probe.style.borderTopLeftRadius = ""; probe.style.borderTopLeftRadius = ref;
    var br = parseFloat(getComputedStyle(probe).borderTopLeftRadius);
    if (!isNaN(br) && br > 0) { if (!radiusSet[Math.round(br)]) { radiusSet[Math.round(br)] = true; nRadius++; } }
  }
  function rgb(s) { if (!s) return null; var o = s.indexOf("("); var c = s.indexOf(")"); if (o < 0 || c < 0) return null; var a = s.slice(o + 1, c).split(","); if (a.length < 3) return null; return [parseFloat(a[0]), parseFloat(a[1]), parseFloat(a[2]), a.length > 3 ? parseFloat(a[3]) : 1]; }
  var palette = []; for (var ck in colorSet) { var pc = rgb(ck); if (pc) palette.push(pc); }
  function dist(c) { var b = 1e9; for (var i = 0; i < palette.length; i++) { var d = Math.abs(c[0] - palette[i][0]) + Math.abs(c[1] - palette[i][1]) + Math.abs(c[2] - palette[i][2]); if (d < b) b = d; } return b; }
  var out = [];
  function sel(el) { if (el.id) return "#" + el.id; var parts = [], n = el, d = 0; while (n && n.nodeType === 1 && d < 4) { var p = n.tagName.toLowerCase(); if (n.classList && n.classList.length) p += "." + Array.prototype.slice.call(n.classList, 0, 2).join("."); parts.unshift(p); n = n.parentElement; d++; } return parts.join(" > "); }
  function visible(el) { var r = el.getBoundingClientRect(), s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.visibility !== "hidden" && s.display !== "none" && parseFloat(s.opacity) > 0 && !el.ownerSVGElement; }
  function add(sev, el, prop, measured, expected, msg) { out.push({ layer: "tokens", severity: sev, selector: sel(el), prop: prop, measured: measured, expected: expected, message: msg }); }
  var all = Array.prototype.slice.call(document.body.querySelectorAll("*")).filter(visible);
  var COLOR_TOL = 10;
  for (var i = 0; i < all.length; i++) {
    var el = all[i], s = getComputedStyle(el);
    if (nShadow > 0) { var esh = s.boxShadow; if (esh && esh !== "none" && !shadowSet[esh]) add("warn", el, "box-shadow", esh, "a shadow token", "off-token box-shadow (one-off, not a design token)"); }
    if (nRadius > 0) { var c4 = [s.borderTopLeftRadius, s.borderTopRightRadius, s.borderBottomRightRadius, s.borderBottomLeftRadius]; for (var ci = 0; ci < 4; ci++) { var rv = parseFloat(c4[ci]); if (!isNaN(rv) && rv > 0 && rv < 200 && !radiusSet[Math.round(rv)]) { add("polish", el, "border-radius", Math.round(rv) + "px", "a radius token", "off-token border-radius " + Math.round(rv) + "px"); break; } } }
    if (palette.length > 0) { var cks = [["color", s.color], ["background-color", s.backgroundColor], ["border-color", s.borderTopColor]]; for (var k = 0; k < 3; k++) { var cv = rgb(cks[k][1]); if (cv && cv[3] > 0.05 && dist(cv) > COLOR_TOL) add("polish", el, cks[k][0], cks[k][1], "a color token", "off-palette " + cks[k][0]); } }
  }
  probe.remove();
  return out.slice(0, 200);
})()`;
