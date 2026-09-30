# dwain.me

Build output for [dwain.me](https://dwain.me). **Do not edit here.**

The source is `apps/dwain-me` in the SnapSuite mono-repo. `bun run publish` there
builds the site and replaces this repo's contents. Cloudflare Pages project
`dwain` builds from `main` (no build command, output directory `public`).

- `public/`: the static site
- `functions/api/contact.ts`: POST /api/contact, forwarded to the
  `dwain-me-contact` Worker over the `CONTACT_WORKER` service binding
