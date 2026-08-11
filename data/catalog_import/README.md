# Leaf Crème catalog dataset

Generated 2026-08-10, corrected 2026-08-11. **Two rounds of work happened here** — read "What actually
shipped" first; the Open Food Facts round further down is kept for its
source-research value, but it is not what ended up in the DB.

An independent audit, [docs/PRODUCT_CATALOG_RECOVERY_REPORT.md](../../docs/PRODUCT_CATALOG_RECOVERY_REPORT.md),
re-checked this recovery directly against git history with a stricter
VERIFIED/RECONSTRUCTED/SYNTHETIC classification and caught two places this
README originally overstated confidence (image originality, exact cm sizes).
Both are corrected below — read that report for the full independent trace.

## TL;DR — what actually shipped

While sourcing images for an earlier draft of this dataset, I found that
`uploads/product/1..20_*.jpg` (already committed to git) are **orphaned images**
from a real Leaf Crème product catalog that used to exist in the DB and got
lost — confirmed by:
- `scripts/seed_gift_boxes.py`'s `PRODUCT_NAME_MAPPING`, which references
  exact product names like `"Tiramisu classic coffee"` and a size format
  `"M - 14cm (3-4 người)"` that only makes sense if those products once existed
- git commit `3b9931c`, which added `scripts/download_product_images.py` and
  these exact 20 images in the same commit — the script downloads images
  *for existing DB rows*, so those 20 products existed in the DB at that point
- `HUONG_DAN_DU_LIEU_BANH.md` (removed in commit `f41ec8e`, recovered via `git show`)

### What's actually VERIFIED vs. RECONSTRUCTED vs. SYNTHETIC

An independent audit ([docs/PRODUCT_CATALOG_RECOVERY_REPORT.md](../../docs/PRODUCT_CATALOG_RECOVERY_REPORT.md))
checked this recovery against git history directly and correctly tightened
two claims this README originally overstated. Corrected here:

- **VERIFIED (directly present in a historical commit):** only the 20
  **product identity + filename pairs** — legacy `sanpham_id` 1-20, display
  name, and image file path, all read directly out of commit `3b9931c`'s tree
  (which added `scripts/download_product_images.py` and these 20 files in
  the same commit — the script only ever writes a filename for a DB row that
  already exists, so that row existed at commit time).
- **The images are NOT verified original product photography.** `download_product_images.py`
  searches Unsplash/Pexels and downloads a *replacement stock photo* — it
  never saved the original photo or its source URL. What's verified is the
  **file path being real, still-licensed stock imagery Leaf Crème already
  chose to use** — not a photograph of Leaf Crème's actual cake.
- **Category and flavor are RECONSTRUCTED, not verified**, i.e. mechanically
  split from the verified name (`"Mousse chanh dây"` → category `Mousse`,
  flavor `chanh dây`) — `SanPham.danh_muc` was free text and no historical
  value for it was ever exported.
- **The `S - 12cm / M - 14cm / L - 18cm` sizes are RECONSTRUCTED, weak evidence.**
  `seed_gift_boxes.py` contains a code *comment* showing `"M - 14cm (3-4 người)"`
  as an example of the expected format its parser looks for — that is
  evidence a size convention like this existed, not proof any specific
  product was actually 14cm. Only the **S/M/L labels themselves** are
  referenced by the gift-box mapping; the cm/serving numbers here are estimated.

So: the **names** (from filenames) and the fact that a **5×4 category split
across Mousse/Tiramisu/Bông lan/Bánh kem existed** are the solid part.
Everything else in `products_recovered.csv`/`product_variants_recovered.csv`
— category/flavor split, exact sizes, servings, weights, SKUs, and all
prices — is RECONSTRUCTED or SYNTHETIC. `scripts/build_recovered_catalog.py`
generates it from the verified names + local image files, and
`scripts/import_recovered_catalog.py` loaded it into the local dev DB —
**20 products, 60 variants** (S/M/L × 20).

**Railway was checked and ruled out as a further recovery source** (2026-08-11):
the Railway project, its Postgres service, and its data volume were all
provisioned 2026-08-09 — about 7.5 months after the December 2025 commit
that had the real catalog. No other Railway project exists on this account.
Any further recovery (original prices, descriptions, ingredients, SKUs) would
have to come from outside this repo and outside Railway — e.g. a local
Docker/Postgres volume backup, the missing `DataBakery.sql`, spreadsheets,
invoices, or admin-panel screenshots, per the audit report's recommendation.

This also fixed a real, previously silent bug: `seed_gift_boxes.py` couldn't
match any product (all `find_bienthe_by_name` calls returned `None`) because
the products it looks for didn't exist. Running it now creates 8 gift boxes
with 23 real BOM links (verified — see "Verification" below).

**What's still not recoverable:** the original prices. Nothing in the repo
records them. `product_variants_recovered.csv` prices are estimates
benchmarked against real, currently-listed Vietnamese bakery prices (sources
below) — not a claim about what Leaf Crème originally charged.

## Files (recovered catalog — what's actually in the DB)

- [products_recovered.csv](products_recovered.csv) / [products_recovered.json](products_recovered.json) — 20 products
- [product_variants_recovered.csv](product_variants_recovered.csv) — 60 variants (S/M/L per product)
- [scripts/build_recovered_catalog.py](../../scripts/build_recovered_catalog.py) — reconstructs the CSVs from `uploads/product/` + the hardcoded recovered name list
- [scripts/import_recovered_catalog.py](../../scripts/import_recovered_catalog.py) — idempotent DB import

### Recovered product list

| # | Category | Product | Flavor |
|--:|---|---|---|
| 1-5 | Mousse | chanh dây, dâu tươi, matcha phô mai, chocolate đen, việt quất | Passion fruit, strawberry, matcha-cheese, dark chocolate, blueberry |
| 6-10 | Tiramisu | classic coffee, cacao, matcha, dâu, oreo | Coffee, cacao, matcha, strawberry, oreo |
| 11-15 | Bông lan | trứng muối basic/phô mai/sốt dầu trứng, bơ sữa trái cây/chocolate chips | Salted-egg sponge (3 variations), buttermilk sponge (2 variations) |
| 16-20 | Bánh kem | vanilla trái cây, chocolate, red velvet, oreo, tiramisu kem | Vanilla-fruit, chocolate, red velvet, oreo, tiramisu-cream |

Every variant comes in S (12cm, 2-3 người), M (14cm, 3-4 người — the one size
the recovered `seed_gift_boxes.py` comment gave as a real example), L (18cm,
6-8 người).

### Price benchmarking sources (estimates, not recovered originals)

| Category | Base prices used (S/M/L, VND) | Benchmarked against |
|---|---|---|
| Mousse | 190,000 / 220,000 / 340,000 | [Tin Phat Bakery](https://tinphatbakery.com/shop-page/banh-kem-mousse-chanh-day-tp-2071/) real passion-fruit mousse price list by size (14cm=220k, 16cm=280k, 18cm=340k) |
| Tiramisu | 170,000 / 200,000 / 310,000 | Aggregated real listings (14cm≈200k, 16cm≈250k, 18cm≈310k) — [lofita.vn](https://lofita.vn/vi/banh-tiramisu-gia-bao-nhieu.html), [Christine](https://fatagi.vn/banh-sinh-nhat-gia-250k/) |
| Bông lan | 170,000 / 200,000 / 250,000 | [Tiệm bánh Anh Thư via saigonreview](https://saigonreview.vn/topAZ/tiem-banh-bong-lan-trung-muoi-ngon-nhat-sai-gon) real salted-egg-sponge price list (16cm=160-230k, 20cm=210-270k, 25cm=290-330k) |
| Bánh kem | 150,000 / 250,000 / 380,000 | [Thu Hường Cake size-14](https://thuhuongcake.vn/banh-kem-size-14) (200-350k) and [size-16](https://thuhuongcake.vn/banh-kem-size-16) (250-400k) real listed price ranges |

Same price applies across all flavors within a category (no fabricated
per-flavor delta — there's no source for that level of precision, so it
wasn't invented). `price_data_origin=synthetic` on every row regardless.

### Verification performed

```
python scripts/build_recovered_catalog.py      # -> 20 products, 60 variants, 0 missing images
python scripts/import_recovered_catalog.py      # -> imported into local dev DB (idempotent, re-run safe)
python scripts/seed_gift_boxes.py               # -> 8 gift boxes created, 23 BOM items linked (was 0 before)
```

## What's obtained from real data vs. reconstructed vs. estimated

(Using the VERIFIED / RECONSTRUCTED / SYNTHETIC classification from the audit report.)

- **VERIFIED:** the 20 legacy `sanpham_id` + display name + image file path triples, read directly from commit `3b9931c`'s tree.
- **Real but not original:** the 20 image files themselves — genuine, still-licensed Unsplash/Pexels stock photos Leaf Crème's own pipeline already downloaded and committed, but replacement stock imagery, not verified photographs of Leaf Crème's actual cakes.
- **RECONSTRUCTED** (mechanically derived from the verified name, or weak secondary evidence — not fabricated, not from an external dataset, but not verified either): category assignment, flavor labels, the S/M/L size-label convention.
- **SYNTHETIC, explicitly flagged:** exact cm sizes, servings, weights, all prices (`price_data_origin=synthetic`), and internal IDs/SKUs.
- **Left explicitly missing, not invented:** ingredients, allergens, descriptions, barcodes — no source (internal or external) has Leaf Crème's actual recipes, so these are `null`/unverified rather than guessed. Do not treat this dataset as allergen-safe.

## Schema gap report (unchanged from investigation — no DB changes made)

Same gaps apply as documented in the earlier round below: no `Category`,
`Ingredient`, or `Allergen` tables exist; `bienthesanpham.kich_thuoc` is a
single free-text field holding what should be 3 separate columns (size,
weight, servings); there are no provenance columns anywhere in `models.py`.
This import folds provenance into `mo_ta` as a workaround. See "Schema gap
report" in the appendix section for the full table — nothing was changed in
`models.py` per the task's instruction not to redesign the DB unnecessarily.

## Import instructions

```bash
python scripts/build_recovered_catalog.py     # regenerate CSVs from uploads/product/
python scripts/import_recovered_catalog.py --dry-run   # preview
python scripts/import_recovered_catalog.py              # import (idempotent, matches on SKU)
python scripts/seed_gift_boxes.py                        # now works — links gift boxes to real variants
```

## Limitations

- Prices are market-benchmarked estimates, not Leaf Crème's real historical prices (unrecoverable — flag before using for actual checkout/payment testing beyond dev seeding).
- Ingredients and allergens are missing everywhere in this dataset (not guessed — see above). Must be filled in by Leaf Crème before any production/allergen-facing use.
- `Macaron Mix` and a `Bánh kem nhỏ (2pcs)` gift-box item remain unmatched in `seed_gift_boxes.py` — those specific products never existed even in the recovered set (no image/name evidence for them), so this is an accurate reflection of what's real vs. missing, not a bug.

---

# Appendix: Open Food Facts round (superseded, kept for source-research value)

The first pass of this task used Open Food Facts (real, ODbL-licensed
packaged-goods data) before the recovery discovery above made it clear
Leaf Crème already had a better-fitting real catalog buried in its own repo.
The OFF-based files (`products.csv`, `product_variants.csv`, `categories.csv`,
`ingredients.csv`, `product_ingredients.csv`, `products.json`, `raw/`) are
still present in this folder as a record of that research, **but nothing from
them is in the DB** — they were removed and replaced by the recovered catalog
above.

## A. Source research

| Source | Records checked | Fields | Images | License | Recommended |
|---|---:|---|---|---|---|
| **Open Food Facts** — [world.openfoodfacts.org](https://world.openfoodfacts.org) | 30,398 global "cakes"; 598 "tiramisu"; 1,582 "pound-cake"; only **4 Vietnam-tagged cakes** | name, brand, categories, ingredients_text, allergens_tags, barcode, quantity, image_url | Yes, per-product | Data: ODbL 1.0. Images: typically CC BY-SA | For a generic bakery demo, yes. **For Leaf Crème specifically, no** — see recovery finding above; it turned out to have real data of its own. |
| Kaggle bakery transaction datasets | 21k+ rows | Date/time/item name only | No | Unspecified/CC0, varies | No — wrong shape (basket data, not a catalog). |
| Hugging Face Food-101 / MM-Food-100K | 100k+ images | Image + class label | Yes | Foodspotting fair-use only / OpenRAIL-M non-commercial | No — unclear or explicitly non-commercial licensing. |

## B–F. Full detail

The original Open Food Facts composition decision, data-model mapping,
quality report, and limitations for that superseded approach are preserved
in git history (this file's previous version) and in the still-present
`products.csv` / `data_quality_report.md` files in this folder, for anyone
who wants to compare approaches later.
