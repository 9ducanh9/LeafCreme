#!/usr/bin/env python3
"""WCAG 2.1 contrast check for the Soft Craft token palette (storefront
tokens.css and the admin MUI theme, which is a hand-copied mirror of the
same values — see frontend/src/theme/adminTheme.ts).

Run: python docs/contrast-check.py
Exits non-zero if any pair fails its WCAG threshold.
"""
import sys

def hex_to_rgb(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))

def relative_luminance(rgb):
    def channel(c):
        c = c / 255
        return c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4
    r, g, b = (channel(c) for c in rgb)
    return 0.2126 * r + 0.7152 * g + 0.0722 * b

def contrast_ratio(hex_a, hex_b):
    la = relative_luminance(hex_to_rgb(hex_a))
    lb = relative_luminance(hex_to_rgb(hex_b))
    lighter, darker = max(la, lb), min(la, lb)
    return (lighter + 0.05) / (darker + 0.05)

# Values below are copy-pasted from frontend/src/styles/tokens.css and must
# be kept in sync by hand (see the sync-guardrail note in adminTheme.ts) — this
# script is the "not by trust" verification, not a build-time source of truth.
TOKENS = {
    'sand-50': '#FFFBF5', 'sand-100': '#FBF4EA', 'sand-200': '#F2E8DA', 'sand-300': '#E3D5C2',
    'sand-500': '#9D8770', 'sand-600': '#7A6A56', 'sand-700': '#5A4C3C', 'sand-800': '#3A2E24', 'sand-900': '#241B14',
    'terra-600': '#C2410C', 'terra-700': '#9A3412',
    'mint-600': '#0F766E',
    'green-50': '#F0FDF4', 'green-600': '#15803D',
    'amber-50': '#FFFBEB', 'amber-600': '#B45309',
    'red-50': '#FEF2F2', 'red-600': '#B91C1C',
    'blue-50': '#EFF6FF', 'blue-600': '#1D4ED8',
    'white': '#FFFFFF',
}

# (label, fg, bg, minimum ratio) — minimums per WCAG 2.1: 4.5 for normal
# text, 3.0 for large text / UI component boundaries (non-text contrast).
PAIRS = [
    ('text.primary (sand-800) / canvas (sand-50)',      'sand-800', 'sand-50', 4.5),
    ('text.primary (sand-800) / paper (white)',         'sand-800', 'white',   4.5),
    ('text.secondary (sand-700) / canvas (sand-50)',    'sand-700', 'sand-50', 4.5),
    ('text.secondary (sand-700) / paper (white)',       'sand-700', 'white',   4.5),
    ('table header text (sand-700) / sand-100',         'sand-700', 'sand-100', 4.5),
    ('primary contained text (white) / terra-600',      'white',    'terra-600', 4.5),
    ('brand-fg (terra-700) / canvas (sand-50)',         'terra-700', 'sand-50', 4.5),
    ('secondary contained text (white) / mint-600',     'white',    'mint-600', 4.5),
    ('success.main (green-600) / success.light (green-50)', 'green-600', 'green-50', 4.5),
    ('warning.main (amber-600) / warning.light (amber-50)', 'amber-600', 'amber-50', 4.5),
    ('error.main (red-600) / error.light (red-50)',     'red-600',  'red-50',  4.5),
    ('info.main (blue-600) / info.light (blue-50)',     'blue-600', 'blue-50', 4.5),
    ('border-interactive (sand-500) / canvas (sand-50)', 'sand-500', 'sand-50', 3.0),
    ('focus-ring (terra-600) / canvas (sand-50)',       'terra-600', 'sand-50', 3.0),
    ('divider (sand-200) / paper (white) - non-text',   'sand-200', 'white',   1.0),  # informational only
]

def main():
    fails = []
    print(f"{'Pair':55} {'Ratio':>8} {'Min':>6}  Result")
    print('-' * 80)
    for label, fg, bg, minimum in PAIRS:
        ratio = contrast_ratio(TOKENS[fg], TOKENS[bg])
        ok = ratio >= minimum
        print(f"{label:55} {ratio:8.2f} {minimum:6.1f}  {'PASS' if ok else 'FAIL'}")
        if not ok and minimum > 1.0:
            fails.append((label, ratio, minimum))

    print('-' * 80)
    if fails:
        print(f"\n{len(fails)} pair(s) FAILED:")
        for label, ratio, minimum in fails:
            print(f"  {label}: {ratio:.2f} < {minimum}")
        sys.exit(1)
    print(f"\nAll {len([p for p in PAIRS if p[3] > 1.0])} checked pairs PASS.")

if __name__ == '__main__':
    main()
