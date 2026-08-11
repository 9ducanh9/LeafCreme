#!/usr/bin/env python3
"""Verify mọi cặp màu semantic đạt WCAG 2.1 AA. Chạy trong CI.

Agent KHÔNG được sửa file này (CLAUDE.md §1.1).
Đổi palette thì sửa tokens.css rồi cập nhật CHECKS ở đây — nhưng phải xin xác nhận.
"""
import sys

def lum(h):
    h = h.lstrip('#')
    r, g, b = [int(h[i:i+2], 16) / 255 for i in (0, 2, 4)]
    f = lambda c: c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)

def ratio(a, b):
    l1, l2 = sorted([lum(a), lum(b)], reverse=True)
    return round((l1 + 0.05) / (l2 + 0.05), 2)

CANVAS, SURFACE, SUBTLE = '#FFFBF5', '#FFFFFF', '#FBF4EA'

# (tên, fg, bg, ngưỡng)   4.5 = body text, 3.0 = non-text / state indicator
CHECKS = [
    ('fg-strong / canvas',         '#241B14', CANVAS,    4.5),
    ('fg-default / canvas',        '#3A2E24', CANVAS,    4.5),
    ('fg-default / surface',       '#3A2E24', SURFACE,   4.5),
    ('fg-default / subtle',        '#3A2E24', SUBTLE,    4.5),
    ('fg-muted / canvas',          '#5A4C3C', CANVAS,    4.5),
    ('fg-subtle / canvas',         '#7A6A56', CANVAS,    4.5),
    ('fg-subtle / surface',        '#7A6A56', SURFACE,   4.5),
    ('brand-fg / canvas',          '#9A3412', CANVAS,    4.5),
    ('accent-fg / canvas',         '#0F766E', CANVAS,    4.5),
    ('success-fg / success-bg',    '#15803D', '#F0FDF4', 4.5),
    ('warning-fg / warning-bg',    '#B45309', '#FFFBEB', 4.5),
    ('danger-fg / danger-bg',      '#B91C1C', '#FEF2F2', 4.5),
    ('info-fg / info-bg',          '#1D4ED8', '#EFF6FF', 4.5),
    ('on-brand / brand-bg',        '#FFFFFF', '#C2410C', 4.5),
    ('on-brand / brand-hover',     '#FFFFFF', '#9A3412', 4.5),
    ('on-accent / accent-bg',      '#FFFFFF', '#0F766E', 4.5),
    ('danger-fg-on-solid / solid', '#FFFFFF', '#B91C1C', 4.5),
    ('border-interactive/canvas',  '#9D8770', CANVAS,    3.0),
    ('border-interactive/surface', '#9D8770', SURFACE,   3.0),
    ('focus-ring / canvas',        '#C2410C', CANVAS,    3.0),
    ('focus-ring / surface',       '#C2410C', SURFACE,   3.0),
]

def main():
    fails = []
    print(f"{'cặp':32} {'ratio':>7} {'cần':>6}  kết quả")
    print('-' * 62)
    for name, fg, bg, need in CHECKS:
        r = ratio(fg, bg)
        ok = r >= need
        print(f'{name:32} {r:>7} {need:>6}  {"PASS" if ok else "FAIL"}')
        if not ok:
            fails.append((name, r, need))
    if fails:
        print(f'\n{len(fails)}/{len(CHECKS)} cặp FAIL:')
        for n, r, need in fails:
            print(f'  {n}: {r} < {need}')
        print('\nSửa hex trong tokens.css. KHÔNG hạ ngưỡng trong file này.')
        sys.exit(1)
    print(f'\nTất cả {len(CHECKS)} cặp PASS WCAG 2.1 AA.')

if __name__ == '__main__':
    main()
