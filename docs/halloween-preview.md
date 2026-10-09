# Halloween Cute Preview

Approved direction: cute Halloween, no theme switch. The owner subsequently
approved integration into the real storefront. No database changes or production
deployment are included in this local implementation.

- Preview: `http://127.0.0.1:3099/halloween-demo.html`.
- Source: `frontend/public/halloween-demo.html`.
- Assets: `frontend/public/halloween-demo/`.
- Existing branding and catalog images retained; copied catalog images use
  local preview filenames, without altering the originals.
- Homepage, product size/quantity selection, in-memory cart and Leafie sample
  conversation are interactive. They make no API/model/payment calls.
- All prices/availability are labeled illustrative. Generated Halloween cake
  styling is not presented as a product currently offered by the business.
- Desktop 1440px and mobile 390px verified with installed headless Playwright:
  no horizontal overflow, broken images or JS page errors; 20cm quantity-two
  chocolate cart totals 780,000 illustrative VND; sample chat renders its reply.

## Integrated Storefront (2026-10-08)

- Actual app: `http://127.0.0.1:3099/`, using the existing localhost API on 8000.
- Semantic colors are scoped to `MainLayout`'s customer wrapper, not `:root`;
  admin retains its current theme. No flag, switch or date-based activation.
- Production hero asset: `frontend/public/seasonal/halloween-hero.png`, copied
  from the approved generated concept and explicitly captioned as illustration.
- Real product images, prices, variants and availability continue to come from
  the existing API. No preview product data or placeholder prices were copied.
- Leafie welcome/suggestions and panel appearance are seasonal. Its real request
  path, conversation history, retry and product-card behavior remain unchanged.
- Checkout, payment QR and approval/business workflows were not edited.
- Backend started only against the verified localhost `bakery` DB, with
  `SCHEDULER_ENABLED=false` to avoid background business writes during preview.
  No migrations, seeding, bank callbacks or AI requests were run for UI verification.
- Lint, 60 unit tests, production build and 12 mocked browser tests passed
  (four opt-in live-backend cases skipped). Real local smoke reads returned 28
  existing products; homepage/product/mobile/chat rendered without JS errors or
  horizontal overflow. API write requests were blocked in the smoke-test browser.
- Demo HTML/assets and older unrelated prompt edits remain separate from the
  implementation; any future commit/push must be scoped to intended release files.

## Hero Asset

Created with the built-in image generation tool, then copied into the workspace
as `frontend/public/halloween-demo/hero.png`. Existing assets were not edited.

Prompt:

> Create a photorealistic wide 16:9 editorial bakery website hero photograph for
> a cute Halloween seasonal preview for Leaf Creme. A real-looking small round
> pale pistachio frosted cake decorated with adorable white meringue ghosts with
> tiny chocolate eyes, little berry-red candy details, a few small pastel coral
> pumpkins and two matching ghost-decorated cupcakes. Cake and cupcakes clearly
> visible and beautifully appetizing, no people. Clean soft mint-green studio
> backdrop, bright diffuse daylight, crisp food detail, minimal carefully arranged
> props. Composition: cake arrangement on RIGHT half and generous uniform
> uncluttered pale mint empty space on LEFT half for website text overlay. Not
> dark or spooky; cheerful restrained cute boutique bakery art direction, white,
> mint, berry red and tiny coral accents, no purple, no beige, no gradient blobs.
> Full scene composition, no cropping of cake, no borders or cards. NO text, NO
> logos, NO watermarks. This is a concept photograph of possible seasonal cake
> styling, not a real product offering.
# Updated Scope: Original Banner, App-Wide Theme

The approved follow-up restores the original seven-slide banner and original image paths unchanged. The generated Halloween hero remains a preview asset only, not the homepage banner.

Seasonal semantic tokens now apply app-wide, including account, cart and checkout screens. Admin receives matching mint/green and berry accents through its existing MUI theme; success, warning, error and information colors remain unchanged. No data, payment or approval behavior changes. No toggle. Deployment is handled separately through the existing CI/CD pipeline.
