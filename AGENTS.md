# Jicui Jasmine Agent

This repository is a standalone React / Vite frontend and Node.js backend. It does not require the original app-building platform.

- Use Node.js 24. Read README.md for local startup and deployment.
- Public API types live in shared/contracts.ts. Keep frontend and server contracts aligned.
- All model calls and credentials belong on the server. Never commit .env files, local databases or admin tokens.
- Imported menu records are unverified source material. Never invent ingredients, allergen absence, caffeine levels, allowed customizations or brand endorsements.
- A generated tea card is a reference sheet, not a submitted store order. Rules preview must always be labeled as non-AI.
- Prices, item IDs, availability and supported options are checked by the server. Model output must not bypass these checks.
- Preserve working user changes. Do not push unless the user explicitly requests it.
- Before handoff run npm run check and npm run build, then exercise the local app. Report any blocked live-provider or container checks accurately.
