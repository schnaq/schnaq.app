# schnaq.app

Join page of [schnaq](https://landing.schnaq.com): participants enter the
eight-digit access code of a schnaq and are forwarded to it in the app. A
`?code=12345678` query parameter pre-fills the code.

It is a single static page in `public/` with self-hosted fonts and no
dependencies. The copy is German by default and switches to English for
browsers that don't prefer German. The code is checked against
`https://api.app.schnaq.com/schnaq/by-access-code`.

Pushes to `main` deploy to Vercel via GitHub Actions.
