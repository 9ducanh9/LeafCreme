# Leaf Creme Product Catalog Recovery Report

**Investigation date:** 2026-08-10  
**Scope:** repository and Git object database only. No database query, seed, import, or mutation was performed.  
**Classification rule:** `VERIFIED` means directly present in a historical repository artifact. `RECONSTRUCTED` means inferred from a surviving artifact. `SYNTHETIC` means authored after loss or sourced from a non-Leaf Creme dataset.

## Executive Finding

Git commit `3b9931c` added `scripts/download_product_images.py` and 20 files under `uploads/product/` in one change. The script creates a filename from the then-current database row as `"{sanpham_id}_{product.ten}.jpg"`. Therefore the 20 legacy numeric IDs and display names encoded in those file names are directly recoverable.

This does **not** recover complete product rows. The script fetched replacement stock photography from Unsplash/Pexels, did not save the remote source URL, and did not export description, category, flavor, variant, price, SKU, barcode, ingredients, allergens, inventory, or database IDs beyond the filename prefix.

## Historical Sources Examined

| Source | Result | Use in this report |
|---|---|---|
| Git history on `main` and `origin/main` | 20 product-image additions first appear in `3b9931c` (2025-12-26). | Primary source for product identity and retained file path. |
| `3b9931c:scripts/download_product_images.py` | Builds image filenames from `SanPham.sanpham_id` and `SanPham.ten`; searches Unsplash/Pexels from existing DB rows. | Confirms what the file name encodes; proves retained images are replacement stock images, not an original image export. |
| `3b9931c:uploads/product/*` | 20 image objects with ID/name-bearing filenames. | Direct product identity evidence. |
| Historical `scripts/seed_gift_boxes.py` | `PRODUCT_NAME_MAPPING` references six exact product names; gift-box labels use `S`, `M`, `L`, and one `2pcs` label. | Secondary confirmation for six names; weak evidence for a former size convention only. |
| Historical `frontend/src/components/bakery/BestSellers.tsx` | References four names: vanilla-fruit cake, salted-egg-cheese sponge, matcha-cheese mousse, strawberry tiramisu. | Secondary confirmation only; it does not contain prices or records. |
| Historical `HUONG_DAN_DU_LIEU_BANH.md` | Contains API examples such as Chocolate Cake and Birthday Cake. | Excluded: examples/templates, not Leaf Creme catalog records. |
| All reachable and dangling commits/trees | No database dump, product seed, fixture, CSV, JSON, API response, migration `INSERT`, or deleted catalog export containing the original product rows was found. | Establishes missing fields are not recoverable from the repository. |
| Current untracked `data/catalog_import/*` | Contains a later recovery output, Open Food Facts imports, and `LC-SYN-*` placeholders. | Excluded as historical evidence; classified below. |
| Current untracked `scripts/seed_demo_data.py` | Claims adaptation from `DataBakery.sql`, but that SQL file is absent from current Git history and dangling trees. | Its five values are not verified historical Leaf Creme data. |
| Dangling `c3ec31a:scratch/db_audit_result.json` and verification script | Schema audit and a runtime-generated `LC_VERIFY_* FEFO Cake` test record. | Excluded as synthetic test data. |

## Recovered Product Identity and Retained Image Path

The values in this table are the only product-specific values recovered directly from Git. Each row is a **partially recovered original product**, not a complete historical catalog record.

| Legacy ID VALUE | name VALUE | image file VALUE | SOURCE | PROVENANCE | CONFIDENCE |
|---:|---|---|---|---|---|
| 1 | Mousse chanh dây | `uploads/product/1_Mousse_chanh_dây.jpg` | `3b9931c` tree + `download_product_images.py` filename rule | VERIFIED | HIGH |
| 2 | Mousse dâu tươi | `uploads/product/2_Mousse_dâu_tươi.jpg` | same | VERIFIED | HIGH |
| 3 | Mousse matcha phô mai | `uploads/product/3_Mousse_matcha_phô_mai.jpg` | same | VERIFIED | HIGH |
| 4 | Mousse chocolate đen | `uploads/product/4_Mousse_chocolate_đen.jpg` | same; also `PRODUCT_NAME_MAPPING` | VERIFIED | HIGH |
| 5 | Mousse việt quất | `uploads/product/5_Mousse_việt_quất.jpg` | same | VERIFIED | HIGH |
| 6 | Tiramisu classic coffee | `uploads/product/6_Tiramisu_classic_coffee.jpg` | same; also `PRODUCT_NAME_MAPPING` | VERIFIED | HIGH |
| 7 | Tiramisu cacao | `uploads/product/7_Tiramisu_cacao.jpg` | same | VERIFIED | HIGH |
| 8 | Tiramisu matcha | `uploads/product/8_Tiramisu_matcha.jpg` | same | VERIFIED | HIGH |
| 9 | Tiramisu dâu | `uploads/product/9_Tiramisu_dâu.jpg` | same; also historical BestSellers list | VERIFIED | HIGH |
| 10 | Tiramisu oreo | `uploads/product/10_Tiramisu_oreo.jpg` | same | VERIFIED | HIGH |
| 11 | Bông lan trứng muối basic | `uploads/product/11_Bông_lan_trứng_muối_basic.jpg` | same; also `PRODUCT_NAME_MAPPING` | VERIFIED | HIGH |
| 12 | Bông lan trứng muối phô mai | `uploads/product/12_Bông_lan_trứng_muối_phô_mai.jpg` | same; also historical BestSellers list | VERIFIED | HIGH |
| 13 | Bông lan trứng muối sốt dầu trứng | `uploads/product/13_Bông_lan_trứng_muối_sốt_dầu_trứng.jpg` | same | VERIFIED | HIGH |
| 14 | Bông lan bơ sữa trái cây | `uploads/product/14_Bông_lan_bơ_sữa_trái_cây.jpg` | same | VERIFIED | HIGH |
| 15 | Bông lan bơ sữa chocolate chips | `uploads/product/15_Bông_lan_bơ_sữa_chocolate_chips.jpg` | same; also `PRODUCT_NAME_MAPPING` | VERIFIED | HIGH |
| 16 | Bánh kem vanilla trái cây | `uploads/product/16_Banh_kem_vanilla_trai_cay.jpg` | same; also `PRODUCT_NAME_MAPPING` and historical BestSellers list | VERIFIED | HIGH |
| 17 | Bánh kem chocolate | `uploads/product/17_Bánh_kem_chocolate.jpg` | same | VERIFIED | HIGH |
| 18 | Bánh kem red velvet | `uploads/product/18_Bánh_kem_red_velvet.jpg` | same | VERIFIED | HIGH |
| 19 | Bánh kem oreo | `uploads/product/19_Bánh_kem_oreo.jpg` | same | VERIFIED | HIGH |
| 20 | Bánh kem tiramisu kem | `uploads/product/20_Bánh_kem_tiramisu_kem.jpg` | same | VERIFIED | HIGH |

### Category and Flavor Fields

The original database has free-text `SanPham.danh_muc` and `BienTheSanPham.huong_vi`; neither value was exported. The following values are lexical splits of the verified display names, so they must not be presented as the original database fields.

| Product | category VALUE | flavor VALUE | SOURCE | PROVENANCE | CONFIDENCE |
|---|---|---|---|---|---|
| Mousse chanh dây | Mousse | Chanh dây | verified name | RECONSTRUCTED | MEDIUM |
| Mousse dâu tươi | Mousse | Dâu tươi | verified name | RECONSTRUCTED | MEDIUM |
| Mousse matcha phô mai | Mousse | Matcha phô mai | verified name | RECONSTRUCTED | MEDIUM |
| Mousse chocolate đen | Mousse | Chocolate đen | verified name | RECONSTRUCTED | MEDIUM |
| Mousse việt quất | Mousse | Việt quất | verified name | RECONSTRUCTED | MEDIUM |
| Tiramisu classic coffee | Tiramisu | Classic coffee | verified name | RECONSTRUCTED | MEDIUM |
| Tiramisu cacao | Tiramisu | Cacao | verified name | RECONSTRUCTED | MEDIUM |
| Tiramisu matcha | Tiramisu | Matcha | verified name | RECONSTRUCTED | MEDIUM |
| Tiramisu dâu | Tiramisu | Dâu | verified name | RECONSTRUCTED | MEDIUM |
| Tiramisu oreo | Tiramisu | Oreo | verified name | RECONSTRUCTED | MEDIUM |
| Bông lan trứng muối basic | Bông lan | Trứng muối basic | verified name | RECONSTRUCTED | MEDIUM |
| Bông lan trứng muối phô mai | Bông lan | Trứng muối phô mai | verified name | RECONSTRUCTED | MEDIUM |
| Bông lan trứng muối sốt dầu trứng | Bông lan | Trứng muối sốt dầu trứng | verified name | RECONSTRUCTED | MEDIUM |
| Bông lan bơ sữa trái cây | Bông lan | Bơ sữa trái cây | verified name | RECONSTRUCTED | MEDIUM |
| Bông lan bơ sữa chocolate chips | Bông lan | Bơ sữa chocolate chips | verified name | RECONSTRUCTED | MEDIUM |
| Bánh kem vanilla trái cây | Bánh kem | Vanilla trái cây | verified name | RECONSTRUCTED | MEDIUM |
| Bánh kem chocolate | Bánh kem | Chocolate | verified name | RECONSTRUCTED | MEDIUM |
| Bánh kem red velvet | Bánh kem | Red velvet | verified name | RECONSTRUCTED | MEDIUM |
| Bánh kem oreo | Bánh kem | Oreo | verified name | RECONSTRUCTED | MEDIUM |
| Bánh kem tiramisu kem | Bánh kem | Tiramisu kem | verified name | RECONSTRUCTED | MEDIUM |

### Variants and Size Evidence

No original `bienthesanpham` row exists in the repository. The historical gift-box integration expects the following labels. It is evidence of a UI/integration convention, not a row export or proof that every listed size existed for every product.

| Product VALUE | historical label VALUE | SOURCE | PROVENANCE | CONFIDENCE |
|---|---|---|---|---|
| Tiramisu classic coffee | S, M, L referenced | `scripts/seed_gift_boxes.py` gift-box items and mapping | RECONSTRUCTED | MEDIUM |
| Mousse chocolate đen | S, M, L referenced | same | RECONSTRUCTED | MEDIUM |
| Mousse dâu tươi | M referenced | same | RECONSTRUCTED | MEDIUM |
| Bông lan trứng muối basic | S, M, L referenced | same | RECONSTRUCTED | MEDIUM |
| Bông lan bơ sữa chocolate chips | M referenced | same | RECONSTRUCTED | MEDIUM |
| Bánh kem vanilla trái cây | `2pcs` referenced through `Bánh kem nhỏ` mapping | same | RECONSTRUCTED | LOW |

The comment in that script says it searches DB values matching `M - 14cm (3-4 người)`. This is only a former expected format. The current `S - 12cm`, `M - 14cm`, `L - 18cm`, serving counts, weights, and 60 generated variants in `data/catalog_import/product_variants_recovered.csv` are all **RECONSTRUCTED or SYNTHETIC**, not original records.

## Missing or Non-Historical Fields (Applies to Every Recovered Product)

| FIELD | VALUE | SOURCE | PROVENANCE | CONFIDENCE |
|---|---|---|---|---|
| description | Not recovered | No product row, API export, seed, fixture, or historical frontend text found. | Not available; do not invent. | HIGH |
| price | Not recovered | No historical price value found. Current recovered CSV marks every price `synthetic`. | SYNTHETIC if using current estimates; otherwise missing. | HIGH |
| original SKU | Not recovered | Image filename contains legacy numeric ID only; no SKU export found. | Not available; generated `MOU-*`, `TIRA-*`, `BL-*`, `BK-*` codes are SYNTHETIC. | HIGH |
| barcode | Not recovered | No barcode field/value in historical catalog artifacts. | Not available. Open Food Facts barcodes are external, not Leaf Creme. | HIGH |
| original product image | Not recovered | `download_product_images.py` fetched stock images from Unsplash/Pexels and saved no source URL. | The retained image **file path** is VERIFIED; its visual is a RECONSTRUCTED replacement, not a verified original product photograph. | HIGH |
| ingredients | Not recovered | No recipe, ingredient fixture, or source product row found. | Not available. Open Food Facts ingredient lists must not be applied. | HIGH |
| allergens | Not recovered | No recipe, allergen fixture, or source product row found. | Not available. Do not show an allergen-safe claim. | HIGH |
| inventory / lots | Not recovered | No original inventory export found. Current seed lots are later fixtures. | Not available. | HIGH |

## Data Explicitly Excluded From Original Recovery

| Data | Classification | Reason |
|---|---|---|
| `data/catalog_import/products.json` Open Food Facts rows | SYNTHETIC for Leaf Creme | They are real external packaged-goods records, but not Leaf Creme products. |
| `LC-SYN-0001` through `LC-SYN-0005` | SYNTHETIC | Explicit placeholders in the current dataset. |
| Current `products_recovered.*` IDs, slugs, category/flavor labels, SKUs, S/M/L variants, weights, servings, and prices | Mixed RECONSTRUCTED/SYNTHETIC | The builder creates these after loss. Only its name/image references trace back to historical artifacts. |
| `scripts/seed_demo_data.py` products `BN-001`, `BN-002`, `BD-001`, `BD-002`, `BP-001` | RECONSTRUCTED, LOW | Script is untracked and cites a missing `DataBakery.sql`; no matching historical source was found in Git. Do not call them original Leaf Creme products yet. |
| `ORDER-TEST-CAKE-001` and `LC_VERIFY_* FEFO Cake` | SYNTHETIC | Explicit order/inventory test fixtures. |
| Gift-box prices and BOM in `seed_gift_boxes.py` | RECONSTRUCTED, LOW | They are frontend integration data, not original product catalog rows or product-price evidence. |
| `HUONG_DAN_DU_LIEU_BANH.md` example cakes/prices/SKUs | SYNTHETIC examples | Documentation expressly presents examples/templates. |

## Counts and Remaining Gaps

| Measure | Result | Basis |
|---|---:|---|
| Original product identities recovered | 20 | One name-bearing image file for IDs 1-20 in `3b9931c`. |
| Products partially recovered | 20 | Every recovered identity is missing multiple material catalog fields. |
| Additional original products only reconstructable | 0 identified | No extra original product identity is evidenced outside the 20 files. |
| Original products completely lost | Unknown | The repository gives no authoritative original catalog total, so an additional-loss count cannot be calculated honestly. |
| Fully recovered original product records | 0 | No complete original database row, seed, API response, or export survives. |

Missing for all 20: original descriptions, canonical `danh_muc`, stored flavor/variant rows, size/weight/serving details, prices, original SKUs, barcodes, original image provenance, recipes, allergens, lots, stock, and historical sales data.

## Recommended Next Recovery Step

1. Preserve the 20 identity/image artifacts as a **read-only recovery manifest**; do not import the generated current dataset as historical truth.
2. Search outside this repository for the only sources likely to recover the missing fields: PostgreSQL/Docker volume backups, Railway/Postgres backup or snapshot, prior hosting storage, the missing `DataBakery.sql`, spreadsheet exports, invoices, admin screenshots, and original image storage.
3. If an original database backup is found, export `sanpham`, `bienthesanpham`, `lohangsanpham`, price history, and any recipe/allergen source before running any seed/import.
4. If no source is found, have Leaf Creme explicitly approve a new catalog. Create new values under a new migration/manifest and retain the provenance labels; never backfill generated prices, SKUs, recipes, or allergens as historical data.
