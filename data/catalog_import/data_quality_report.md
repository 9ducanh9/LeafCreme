# Leaf Creme catalog dataset — data quality report

Total records: 21
Valid records (no hard-fail issues): 21
Duplicates (slug/barcode/sku): 0
Missing images: 5 (LC-SYN-0001, LC-SYN-0002, LC-SYN-0003, LC-SYN-0004, LC-SYN-0005)
Missing variants: 0
Missing/invalid prices: 0
Invalid categories: 0
Records requiring review: 10

## Hard-fail issues
- none

## Requires manual review before production use
- 31 variant price(s) are synthetic placeholders, not sourced — needs Leaf Crème pricing review before production use.
- 5 product(s) missing real ingredients data: ['LC-SYN-0001', 'LC-SYN-0002', 'LC-SYN-0003', 'LC-SYN-0004', 'LC-SYN-0005']
- 5 product(s) with unverified/missing allergen data — DO NOT treat as allergen-safe: ['LC-SYN-0001', 'LC-SYN-0002', 'LC-SYN-0003', 'LC-SYN-0004', 'LC-SYN-0005']