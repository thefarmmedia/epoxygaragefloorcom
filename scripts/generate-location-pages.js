// Generates the /epoxy-garage-floor-cost/ SEO landing pages (one per state + a
// hub index), plus sitemap.xml and robots.txt. These are plain static files —
// re-run this script and commit the output whenever pricing or copy changes.
//
//   node scripts/generate-location-pages.js
"use strict";

const fs = require("fs");
const path = require("path");
const { STATES, slugify } = require("./data/states");
const { premiumCapForState } = require("../netlify/functions/_lib/markets");
const { calcPriceRange, COATING_RATE } = require("../netlify/functions/_lib/pricing");

const SITE_URL = "https://epoxygaragefloors.ai";
const PUBLIC_DIR = path.join(__dirname, "..", "public");
const OUT_DIR = path.join(PUBLIC_DIR, "epoxy-garage-floor-cost");

const SIZES = [
  { key: "1car", label: "1-Car", sub: "~240 sq ft" },
  { key: "2car", label: "2-Car", sub: "~440 sq ft" },
  { key: "3car", label: "3-Car", sub: "~640 sq ft" },
  { key: "4car", label: "4+ Car", sub: "~860 sq ft" },
];

const FINISHES = [
  { key: "solid", label: "Solid Color", sub: "Classic, budget-friendly" },
  { key: "flake", label: "Flake / Chip", sub: "Textured, hides dirt" },
  { key: "metallic", label: "Metallic", sub: "Premium, 3D look" },
];

// Premium-slot cap (from the same market tiers used for contractor matching)
// doubles as a rough regional labor-cost signal for these directional ranges.
function regionMultiplierForState(code) {
  const cap = premiumCapForState(code);
  if (cap === 3) return 1.12;
  if (cap === 2) return 1.0;
  return 0.9;
}

function fmt(n) {
  return "$" + n.toLocaleString("en-US");
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

function head({ title, description, canonical }) {
  return `<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(description)}">
<link rel="canonical" href="${canonical}">
<link rel="icon" href="/images/logo.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Anton&family=Lobster&family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/css/style.css">`;
}

function header() {
  return `<header class="site-header">
  <div class="wrap">
    <a href="/" class="brand"><img src="/images/logo.png" alt="EpoxyGarageFloors.ai"></a>
    <nav class="nav-links">
      <a href="/#how-it-works">How It Works</a>
      <a href="/#gallery">Recent Projects</a>
      <a href="/epoxy-garage-floor-cost/">Cost By State</a>
      <a href="/contractors/">For Contractors</a>
      <a href="/dashboard/">Pro Login</a>
    </nav>
    <div class="header-cta">
      <a href="/#quote" class="btn btn-outline">Get My Free Quote</a>
      <button class="nav-toggle" aria-label="Menu">&#9776;</button>
    </div>
  </div>
</header>`;
}

function footer() {
  return `<footer class="site-footer">
  <div class="wrap">
    <div class="footer-grid">
      <div>
        <a href="/" class="brand"><img src="/images/logo.png" alt="EpoxyGarageFloors.ai"></a>
        <p class="muted" style="margin-top:14px; font-size:13.5px; max-width:38ch;">The nationwide network connecting homeowners with certified epoxy garage floor and concrete coating installers.</p>
      </div>
      <div>
        <h5>Homeowners</h5>
        <a href="/#quote">Get A Free Quote</a>
        <a href="/#how-it-works">How It Works</a>
        <a href="/epoxy-garage-floor-cost/">Cost By State</a>
      </div>
      <div>
        <h5>Contractors</h5>
        <a href="/contractors/">Join The Network</a>
        <a href="/dashboard/">Pro Login</a>
      </div>
      <div>
        <h5>Company</h5>
        <a href="mailto:hello@epoxygaragefloors.ai">Contact Us</a>
      </div>
    </div>
    <div class="footer-bottom">
      <span>&copy; <span id="year"></span> EpoxyGarageFloors.ai — All rights reserved.</span>
      <span>Nationwide epoxy garage floor installer network</span>
    </div>
  </div>
</footer>

<script>document.getElementById("year").textContent = new Date().getFullYear();</script>
<script src="/js/main.js"></script>`;
}

function breadcrumbs(items) {
  const html = items
    .map((item, i) => {
      const isLast = i === items.length - 1;
      return isLast
        ? `<span>${escapeHtml(item.label)}</span>`
        : `<a href="${item.href}">${escapeHtml(item.label)}</a><span class="sep">/</span>`;
    })
    .join(" ");
  return `<nav class="breadcrumbs" aria-label="Breadcrumb">${html}</nav>`;
}

function breadcrumbSchema(items) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.label,
      item: item.href.startsWith("http") ? item.href : `${SITE_URL}${item.href}`,
    })),
  };
}

function faqItems(stateName, overallLow, overallHigh) {
  return [
    {
      q: `How much does an epoxy garage floor cost in ${stateName}?`,
      a: `Most homeowners in ${stateName} pay between ${fmt(overallLow)} and ${fmt(overallHigh)} for a professionally installed epoxy garage floor, depending on garage size, current floor condition, and the finish you choose. Use the instant quote tool above for a price range based on your specific garage.`,
    },
    {
      q: "What's the difference between solid, flake, and metallic epoxy?",
      a: "Solid color is the most budget-friendly and gives a clean, classic look. Flake (or chip) systems add texture and hide dirt and tire marks well, making them popular for daily-use garages. Metallic epoxy creates a premium, three-dimensional marbled look and costs more due to the extra material and installer skill involved.",
    },
    {
      q: "Does floor condition affect the price?",
      a: "Yes. Cracks, oil stains, or previous coatings that need to be ground off all add prep time and cost. A floor in good condition needs only surface prep and etching, while major damage may require crack repair or diamond grinding before coating.",
    },
    {
      q: "Is the price range I get instant, or a final quote?",
      a: `The number you see is a directional estimate based on your answers. Your matched, licensed and insured ${stateName} installer confirms the exact price after reviewing photos or visiting in person — there's no obligation to book.`,
    },
  ];
}

function faqSchema(items) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };
}

function renderStatePage(entry) {
  const { code, name, cities } = entry;
  const slug = slugify(name);
  const canonical = `${SITE_URL}/epoxy-garage-floor-cost/${slug}/`;
  const multiplier = regionMultiplierForState(code);

  const sizeRows = SIZES.map((s) => {
    const { low, high } = calcPriceRange({
      size: s.key, coating: "notsure", condition: "good", regionMultiplier: multiplier,
    });
    return { ...s, low, high };
  });

  const finishRows = FINISHES.map((f) => {
    const [rateLow, rateHigh] = COATING_RATE[f.key];
    const low = Math.round(rateLow * multiplier * 100) / 100;
    const high = Math.round(rateHigh * multiplier * 100) / 100;
    const total = calcPriceRange({
      size: "2car", coating: f.key, condition: "good", regionMultiplier: multiplier,
    });
    return { ...f, low, high, totalLow: total.low, totalHigh: total.high };
  });

  const overallLow = Math.min(...sizeRows.map((r) => r.low));
  const overallHigh = Math.max(...sizeRows.map((r) => r.high));
  const cityList = cities.join(", ");
  const faqs = faqItems(name, overallLow, overallHigh);
  const crumbs = [
    { label: "Home", href: "/" },
    { label: "Cost By State", href: "/epoxy-garage-floor-cost/" },
    { label: name, href: `/epoxy-garage-floor-cost/${slug}/` },
  ];

  const jsonLd = [breadcrumbSchema(crumbs), faqSchema(faqs)]
    .map((obj) => `<script type="application/ld+json">${JSON.stringify(obj)}</script>`)
    .join("\n");

  const title = `Epoxy Garage Floor Cost in ${name} (2026 Price Guide) | EpoxyGarageFloors.ai`;
  const description = `See average epoxy garage floor prices in ${name} — from ${fmt(overallLow)} to ${fmt(overallHigh)} — then get an instant price range and a free match with a certified, insured installer near you.`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
${head({ title, description, canonical })}
${jsonLd}
</head>
<body>

${header()}

<section class="section" style="padding-top:36px;">
  <div class="wrap">
    ${breadcrumbs(crumbs)}
    <span class="pill-badge"><span class="dot"></span>Serving ${escapeHtml(cityList)}${cities.length > 1 ? " &amp; all of " + escapeHtml(name) : ""}</span>
    <h1>Epoxy Garage Floor Cost in <span class="script">${escapeHtml(name)}</span></h1>
    <p class="lede" style="max-width:70ch;">Homeowners across ${escapeHtml(name)} typically pay <strong>${fmt(overallLow)} – ${fmt(overallHigh)}</strong> for a professionally installed epoxy garage floor. Answer a few quick questions to get your own instant price range, then get matched with a certified, insured installer serving your area — free, no obligation.</p>
    <div class="trust-row">
      <span><span class="dot"></span>Licensed &amp; insured pros only</span>
      <span><span class="dot"></span>Serving all of ${escapeHtml(name)}</span>
      <span><span class="dot"></span>Free for homeowners</span>
    </div>
    <div style="margin-top:28px;">
      <a href="/?state=${code}#quote" class="btn btn-primary btn-lg">Get My ${escapeHtml(name)} Price Range</a>
    </div>
  </div>
</section>

<section class="section section-alt">
  <div class="wrap center">
    <span class="eyebrow">Average Cost By Garage Size</span>
    <h2>${escapeHtml(name)} Price Ranges</h2>
    <p class="muted" style="max-width:60ch;margin:0 auto;">Directional estimates for a floor in good condition. Cracks, stains, or old coatings that need removal will add to the cost.</p>
    <div class="stat-grid">
      ${sizeRows.map((r) => `<div class="stat-card">
        <div class="size">${r.label}<br><span style="font-weight:400;text-transform:none;">${r.sub}</span></div>
        <div class="range">${fmt(r.low)}–${fmt(r.high)}</div>
      </div>`).join("\n      ")}
    </div>
  </div>
</section>

<section class="section">
  <div class="wrap center">
    <span class="eyebrow">Cost By Finish</span>
    <h2>Solid, Flake &amp; Metallic Pricing</h2>
    <p class="muted" style="max-width:60ch;margin:0 auto;">Shown per square foot, plus a typical total for a 2-car (~440 sq ft) garage.</p>
    <div style="overflow-x:auto;">
      <table class="finish-table">
        <thead><tr><th>Finish</th><th>$ / sq ft</th><th>Typical 2-Car Total</th></tr></thead>
        <tbody>
          ${finishRows.map((r) => `<tr>
            <td><strong>${r.label}</strong><br><span class="muted" style="font-size:12.5px;">${r.sub}</span></td>
            <td>$${r.low.toFixed(2)} – $${r.high.toFixed(2)}</td>
            <td>${fmt(r.totalLow)} – ${fmt(r.totalHigh)}</td>
          </tr>`).join("\n          ")}
        </tbody>
      </table>
    </div>
  </div>
</section>

<section class="section section-alt">
  <div class="wrap">
    <div class="pro-cta">
      <div>
        <h3>See Your Exact ${escapeHtml(name)} Price Range</h3>
        <p>Takes about a minute — get an instant estimate and a free match with a certified installer near you.</p>
      </div>
      <a href="/?state=${code}#quote" class="btn btn-primary btn-lg">Get My Free Quote</a>
    </div>
  </div>
</section>

<section class="section" id="gallery">
  <div class="wrap center">
    <span class="eyebrow">Recent Projects</span>
    <h2>Real Floors From Our Network</h2>
    <div class="gallery-grid" id="gallery-grid"></div>
  </div>
</section>

<section class="section section-alt">
  <div class="wrap center">
    <span class="eyebrow">FAQ</span>
    <h2>${escapeHtml(name)} Epoxy Flooring Questions</h2>
    <div class="faq-list">
      ${faqs.map((f) => `<details class="faq-item">
        <summary>${escapeHtml(f.q)}</summary>
        <p>${escapeHtml(f.a)}</p>
      </details>`).join("\n      ")}
    </div>
  </div>
</section>

<section class="section">
  <div class="wrap center">
    <span class="eyebrow">More Cost Guides</span>
    <h2>Browse Other States</h2>
    <a href="/epoxy-garage-floor-cost/" class="btn btn-outline" style="margin-top:12px;">View All 50 States</a>
  </div>
</section>

${footer()}

<script src="/js/gallery-data.js"></script>
<script>
  const galleryGrid = document.getElementById("gallery-grid");
  if (galleryGrid && window.EGF_GALLERY) {
    const items = window.EGF_GALLERY.slice(0, 8);
    galleryGrid.innerHTML = items.map(
      (item) => \`<img src="\${item.src}" alt="\${item.alt}" loading="lazy">\`
    ).join("");
  }
</script>
</body>
</html>
`;
}

function renderHubPage() {
  const canonical = `${SITE_URL}/epoxy-garage-floor-cost/`;
  const title = "Epoxy Garage Floor Cost By State (2026 Guide) | EpoxyGarageFloors.ai";
  const description = "Average epoxy garage floor prices for all 50 states. Pick your state for a detailed cost breakdown, or get an instant price range and a free match with a certified installer near you.";
  const crumbs = [{ label: "Home", href: "/" }, { label: "Cost By State", href: "/epoxy-garage-floor-cost/" }];
  const jsonLd = `<script type="application/ld+json">${JSON.stringify(breadcrumbSchema(crumbs))}</script>`;

  const links = STATES.map((s) => {
    const slug = slugify(s.name);
    return `<a href="/epoxy-garage-floor-cost/${slug}/">${escapeHtml(s.name)}</a>`;
  }).join("\n      ");

  return `<!DOCTYPE html>
<html lang="en">
<head>
${head({ title, description, canonical })}
${jsonLd}
</head>
<body>

${header()}

<section class="section" style="padding-top:36px;">
  <div class="wrap center">
    ${breadcrumbs(crumbs)}
    <span class="pill-badge"><span class="dot"></span>All 50 States + DC</span>
    <h1>Epoxy Garage Floor Cost <span class="script">By State</span></h1>
    <p class="lede" style="max-width:60ch;margin:0 auto;">Epoxy and polyaspartic coating prices vary by region, garage size, and floor condition. Pick your state below for a detailed local price guide, or skip straight to your instant quote.</p>
    <a href="/#quote" class="btn btn-primary btn-lg" style="margin-top:12px;">Get My Free Price Range</a>
  </div>
</section>

<section class="section section-alt">
  <div class="wrap">
    <div class="state-directory">
      ${links}
    </div>
  </div>
</section>

${footer()}
</body>
</html>
`;
}

function renderSitemap() {
  const staticUrls = ["/", "/contractors/", "/epoxy-garage-floor-cost/"];
  const stateUrls = STATES.map((s) => `/epoxy-garage-floor-cost/${slugify(s.name)}/`);
  const urls = [...staticUrls, ...stateUrls];
  const body = urls
    .map((u) => `  <url><loc>${SITE_URL}${u}</loc></url>`)
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
}

function renderRobots() {
  return `User-agent: *\nAllow: /\nDisallow: /dashboard/\nDisallow: /thank-you/\n\nSitemap: ${SITE_URL}/sitemap.xml\n`;
}

function main() {
  fs.rmSync(OUT_DIR, { recursive: true, force: true });
  fs.mkdirSync(OUT_DIR, { recursive: true });

  for (const entry of STATES) {
    const slug = slugify(entry.name);
    const dir = path.join(OUT_DIR, slug);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, "index.html"), renderStatePage(entry));
  }

  fs.writeFileSync(path.join(OUT_DIR, "index.html"), renderHubPage());
  fs.writeFileSync(path.join(PUBLIC_DIR, "sitemap.xml"), renderSitemap());
  fs.writeFileSync(path.join(PUBLIC_DIR, "robots.txt"), renderRobots());

  console.log(`Generated ${STATES.length} state pages + hub page + sitemap.xml + robots.txt`);
}

main();
