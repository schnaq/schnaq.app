// Builds the static site into dist/: wraps the HTML fragments in content/ with
// the shared layout, copies static/ and writes the sitemap. No dependencies.
//
//   node build.mjs

import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

const SITE = 'https://schnaq.app'
const OUT = 'dist'
const YEAR = new Date().getFullYear()

const urls = {
  app: 'https://app.schnaq.com',
  github: 'https://github.com/schnaq/schnaq',
}

const home = (lang) => (lang === 'de' ? '/' : `/${lang}/`)
// The access code form in the hero of the home page.
const joinUrl = (lang) => `${home(lang)}#join`

// Section ids on the home page, shared by both languages.
const sections = ['how-it-works', 'features', 'open-source']

const ui = {
  de: {
    locale: 'de_DE',
    skip: 'Zum Inhalt springen',
    navLabel: 'Hauptnavigation',
    sections: ['So geht’s', 'Funktionen', 'Open Source'],
    joinLink: 'Mit Code teilnehmen',
    switchLabel: 'English version',
    toApp: 'Zur App',
    homeLabel: 'schnaq Startseite',
    tagline: 'Live-Umfragen, Wortwolken und Q&A für Veranstaltungen. Kostenlos und Open Source.',
    product: ['Produkt', 'schnaq erstellen', 'Quellcode auf GitHub', 'Publikationen'],
    legal: ['Rechtliches', 'Impressum', 'Datenschutz', 'AGB', 'Verhaltensregeln'],
    copyright: `© 2021–${YEAR} schnaq GmbH, Düsseldorf. schnaq® ist eine eingetragene Marke.`,
    madeIn: 'Entwickelt mit 🐘 in Düsseldorf',
  },
  en: {
    locale: 'en_GB',
    skip: 'Skip to content',
    navLabel: 'Main',
    sections: ['How it works', 'Features', 'Open source'],
    joinLink: 'Join with a code',
    switchLabel: 'Deutsche Version',
    toApp: 'Open the app',
    homeLabel: 'schnaq home',
    tagline: 'Live polls, word clouds and Q&A for events. Free and open source.',
    product: ['Product', 'Create a schnaq', 'Source code on GitHub', 'Publications'],
    legal: ['Legal', 'Legal notice', 'Privacy', 'Terms (German)', 'Code of conduct'],
    copyright: `© 2021–${YEAR} schnaq GmbH, Düsseldorf. schnaq® is a registered trademark.`,
    madeIn: 'Made with 🐘 in Düsseldorf',
  },
}

// Footer columns as [heading, [[href, label], …]]. ui.product and ui.legal
// hold the heading followed by the labels, in the order of the hrefs here.
function footerColumns(lang) {
  const column = ([heading, ...labels], hrefs) => [heading, hrefs.map((href, i) => [href, labels[i]])]
  return [
    column(ui[lang].product, [`${urls.app}/${lang}/schnaq/create`, urls.github, `/${lang}/publications/`]),
    // The imprint is the company's, on schnaq.com; terms and privacy are the app's.
    column(ui[lang].legal, [
      `https://schnaq.com/${lang}/legal-note`,
      `/${lang}/privacy/`,
      '/de/agb/',
      `/${lang}/code-of-conduct/`,
    ]),
    [
      'schnaq',
      [
        [`https://schnaq.com/${lang}`, 'schnaq.com'],
        [`https://schnaq.com/${lang}/labs/schnaq`, 'schnaq Labs'],
        ['https://www.linkedin.com/company/schnaq', 'LinkedIn'],
        ['mailto:info@schnaq.com', 'info@schnaq.com'],
      ],
    ],
  ]
}

// Every page is content/<lang>/<slug>.html, published at /<lang>/<slug>/ (the
// home page at home(lang)), with [title, description?] per language. A slug
// in both languages links the two as alternates.
const pageTitles = {
  home: {
    de: [
      'schnaq – Live-Umfragen, Wortwolken und Q&A für Veranstaltungen',
      'Mit schnaq stellt dein Publikum Fragen, stimmt live ab und füllt Wortwolken – per Code und ohne Anmeldung. Kostenlos und Open Source.',
    ],
    en: [
      'schnaq – Live polls, word clouds and Q&A for events',
      'With schnaq your audience asks questions, votes live and fills word clouds – with a code and without signing up. Free and open source.',
    ],
  },
  privacy: { de: ['Datenschutz'], en: ['Privacy policy'] },
  agb: { de: ['Allgemeine Geschäftsbedingungen'] },
  'code-of-conduct': { de: ['Verhaltensregeln'], en: ['Code of conduct'] },
  publications: {
    de: ['Publikationen', 'Forschung, Artikel und Interviews rund um schnaq und strukturierte Online-Diskussionen.'],
    en: ['Publications', 'Research, articles and interviews about schnaq and structured online discussions.'],
  },
}

const pages = Object.entries(pageTitles).flatMap(([slug, langs]) => {
  const pathIn = (lang) => (slug === 'home' ? home(lang) : `/${lang}/${slug}/`)
  return Object.entries(langs).map(([lang, [title, description]]) => {
    const other = Object.keys(langs).find((l) => l !== lang)
    return {
      lang,
      slug,
      title,
      description,
      path: pathIn(lang),
      content: `${lang}/${slug}`,
      alternate: other && { lang: other, path: pathIn(other) },
    }
  })
})
pages.push({ lang: 'de', path: '/404.html', content: '404', title: 'Seite nicht gefunden', noindex: true })

// Stroke icons on a 24px grid, referenced as {{icon:name}} in the fragments.
const icons = {
  poll: '<path d="M4 6h9M4 12h16M4 18h6"/>',
  cloud: '<path d="M7 18.5a4.5 4.5 0 0 1-.7-8.95 6 6 0 0 1 11.5 1A4 4 0 0 1 17 18.5z"/>',
  qa: '<path d="M20.5 12a8.5 8.5 0 0 1-12.3 7.6L3.5 20.5l.9-4.7A8.5 8.5 0 1 1 20.5 12z"/><path d="M9.8 9.6a2.3 2.3 0 1 1 3 2.2c-.5.2-.8.6-.8 1.1v.6M12 16.2h.01"/>',
  activation: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="3.5"/>',
  mindmap:
    '<circle cx="12" cy="12" r="2.5"/><circle cx="4.5" cy="5.5" r="2"/><circle cx="19.5" cy="5.5" r="2"/><circle cx="19.5" cy="18.5" r="2"/><circle cx="4.5" cy="18.5" r="2"/><path d="M10.1 10.4 6 7M13.9 10.4 18 7M13.9 13.6 18 17M10.1 13.6 6 17"/>',
  feedback: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V2.8h6V4M9 12.5l2 2 4-4"/>',
  moderation: '<path d="M12 3 5 6v5c0 4.5 3 8.3 7 10 4-1.7 7-5.5 7-10V6z"/><path d="m9 12 2 2 4-4"/>',
  theme:
    '<path d="M12 3a9 9 0 1 0 0 18c1.1 0 1.7-.9 1.4-1.9-.3-1 .4-2.1 1.5-2.1H17a4 4 0 0 0 4-4c0-5.5-4-10-9-10z"/><circle cx="7.5" cy="11" r="1"/><circle cx="10" cy="7" r="1"/><circle cx="14.5" cy="7" r="1"/>',
  embed: '<path d="m8 8-4 4 4 4M16 8l4 4-4 4M13.5 5l-3 14"/>',
}

const escape = (s) => s.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;')

const logo = (lang, attrs = '') =>
  `<a class="logo" href="${home(lang)}" aria-label="${ui[lang].homeLabel}">
        <img src="/assets/img/schnaqqi.webp" width="120" height="77" alt=""${attrs}>schnaq
      </a>`

function structuredData(page) {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'schnaq',
    url: SITE + page.path,
    description: page.description,
    applicationCategory: 'EducationalApplication',
    operatingSystem: 'Web',
    inLanguage: Object.keys(ui),
    license: 'https://www.gnu.org/licenses/agpl-3.0.html',
    codeRepository: urls.github,
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' },
    publisher: {
      '@type': 'Organization',
      name: 'schnaq GmbH',
      url: 'https://schnaq.com',
      sameAs: ['https://github.com/schnaq', 'https://www.linkedin.com/company/schnaq'],
    },
  })
}

function layout(page, body) {
  const t = ui[page.lang]
  const isHome = page.slug === 'home'
  const title = isHome ? page.title : `${page.title} – schnaq`
  const description = page.description ?? t.tagline
  const alt = page.alternate
  const head = [
    page.noindex ? '<meta name="robots" content="noindex">' : `<link rel="canonical" href="${SITE}${page.path}">`,
    ...(alt
      ? [
          `<link rel="alternate" hreflang="${page.lang}" href="${SITE}${page.path}">`,
          `<link rel="alternate" hreflang="${alt.lang}" href="${SITE}${alt.path}">`,
        ]
      : []),
  ]

  return `<!doctype html>
<html lang="${page.lang}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title}</title>
  <meta name="description" content="${escape(description)}">
  ${head.join('\n  ')}
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="schnaq">
  <meta property="og:title" content="${escape(title)}">
  <meta property="og:description" content="${escape(description)}">
  <meta property="og:url" content="${SITE}${page.path}">
  <meta property="og:image" content="${SITE}/assets/img/og-${page.lang}.png">
  <meta property="og:locale" content="${t.locale}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="theme-color" content="#1292ee">
  <link rel="icon" href="/assets/img/favicon.png" type="image/png">
  <link rel="apple-touch-icon" href="/assets/img/apple-touch-icon.png">
  <link rel="preload" href="/assets/fonts/space-grotesk-latin-wght-normal.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="preload" href="/assets/fonts/inter-latin-wght-normal.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="stylesheet" href="/assets/site.css">${
    isHome
      ? `\n  <script type="application/ld+json">${structuredData(page)}</script>\n  <script src="/assets/join.js" defer></script>`
      : ''
  }
</head>
<body>
  <a class="skip-link" href="#main">${t.skip}</a>
  <header class="site-header">
    <div class="wrap">
      ${logo(page.lang)}
      <nav class="site-nav" aria-label="${t.navLabel}">
        <a href="${joinUrl(page.lang)}">${t.joinLink}</a>
        ${sections.map((id, i) => `<a href="${home(page.lang)}#${id}">${t.sections[i]}</a>`).join('\n        ')}
      </nav>${
        alt
          ? `\n      <a class="lang-switch" href="${alt.path}" hreflang="${alt.lang}" lang="${alt.lang}" aria-label="${t.switchLabel}">${alt.lang.toUpperCase()}</a>`
          : ''
      }
      <a class="btn btn-primary btn-sm" href="${urls.app}/${page.lang}/">${t.toApp}</a>
    </div>
  </header>
  <main id="main">
${isHome ? body : `<article class="wrap prose">\n${body}\n</article>`}
  </main>
  <footer class="site-footer">
    <div class="wrap">
      <div class="footer-grid">
        <div>
          ${logo(page.lang, ' loading="lazy"')}
          <p>${t.tagline}</p>
          <p><a class="btn btn-accent btn-sm" href="${joinUrl(page.lang)}">${t.joinLink}</a></p>
        </div>
        ${footerColumns(page.lang)
          .map(
            ([heading, items], i) => `<nav aria-labelledby="footer-${i}">
          <h2 id="footer-${i}">${heading}</h2>
          <ul>
            ${items.map(([href, text]) => `<li><a href="${href}">${text}</a></li>`).join('\n            ')}
          </ul>
        </nav>`,
          )
          .join('\n        ')}
      </div>
      <div class="footer-bottom">
        <span>${t.copyright}</span>
        <span>${t.madeIn}</span>
      </div>
    </div>
  </footer>
</body>
</html>
`
}

function render(fragment, lang) {
  const values = { ...urls, lang, join: joinUrl(lang) }
  return fragment.replace(/\{\{(\w+)(?::(\w+))?\}\}/g, (match, key, name) => {
    if (key === 'icon' && icons[name]) {
      return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name]}</svg>`
    }
    if (!name && key in values) return values[key]
    throw new Error(`Unknown placeholder: ${match}`)
  })
}

async function write(path, html) {
  const file = join(OUT, path.endsWith('/') ? `${path}index.html` : path)
  await mkdir(dirname(file), { recursive: true })
  await writeFile(file, html)
}

await rm(OUT, { recursive: true, force: true })
await cp('static', OUT, { recursive: true })

for (const page of pages) {
  const fragment = await readFile(`content/${page.content}.html`, 'utf8')
  await write(page.path, layout(page, render(fragment, page.lang).trimEnd()))
}

const locs = pages.filter((p) => !p.noindex).map((p) => `  <url><loc>${SITE}${p.path}</loc></url>`)
await write(
  '/sitemap.xml',
  `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${locs.join('\n')}
</urlset>
`,
)

console.log(`Built ${pages.length} pages into ${OUT}/`)
