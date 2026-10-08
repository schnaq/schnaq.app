# schnaq.app

Product site of the [schnaq app](https://github.com/schnaq/schnaq) – live
polls, word clouds and Q&A for events – and the place where participants join
a schnaq with its eight-digit access code. Plain static HTML, no framework, no
runtime dependencies.

```
content/   page bodies as HTML fragments (de/, en/)
static/    CSS, join script, fonts, images, robots.txt – copied as is
build.mjs  wraps the fragments in the shared layout and writes dist/
```

```sh
node build.mjs                      # build into dist/
python3 -m http.server -d dist 8000 # preview on http://localhost:8000
```

Pages, titles and the header/footer copy live in `build.mjs`. Fragments may
use `{{icon:name}}`, `{{app}}`, `{{join}}`, `{{github}}` and `{{lang}}`.

The access code form sits in the hero of the home page (`#join`).
`static/assets/join.js` checks the code against
`https://api.app.schnaq.com/schnaq/by-access-code` and forwards to the schnaq;
`?code=12345678` pre-fills it, so QR codes and old links keep working.

The terms (AGB) and the privacy policy of the app live here; the imprint is the
company's on schnaq.com. `vercel.json` sets the build and redirects the URLs of
the former WordPress site. With `trailingSlash: true`, redirect sources end in
`/`. landing.schnaq.com redirects every path to this site. Pushes to `main`
deploy to production via GitHub Actions.

The design follows the schnaq app and schnaq.com: Space Grotesk and Inter
(self-hosted, OFL), brand blue `#1292ee`, orange `#ff9901`, navy `#001452`.
