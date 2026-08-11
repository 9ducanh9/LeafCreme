#!/usr/bin/env node
/**
 * Claude Code PreToolUse hook — chặn agent làm yếu gate.
 *
 * Cài trong .claude/settings.json (xem file đó).
 * Nhận JSON trên stdin, exit 2 = block + trả stderr cho agent đọc.
 *
 * Vì sao cần: agent gặp check khó pass rất hay chọn đường sửa check thay vì sửa code.
 * Prompt nói "đừng làm thế" là không đủ — phải chặn ở tầng tool.
 */

import { readFileSync } from 'node:fs'

let payload
try {
  payload = JSON.parse(readFileSync(0, 'utf8'))
} catch {
  process.exit(0) // không parse được thì không chặn, tránh false positive làm tắc việc
}

const tool = payload.tool_name ?? ''
const input = payload.tool_input ?? {}

const deny = (msg) => {
  process.stderr.write(`\n[GUARD] BỊ CHẶN\n${msg}\n\nXem CLAUDE.md §1.1. Nếu bạn tin check này sai: DỪNG và báo, đừng tự sửa.\n`)
  process.exit(2)
}

/* ------------------------------------------------------------------ */
/* 1. Chặn ghi vào file gate / guard / contrast                        */
/* ------------------------------------------------------------------ */

const PROTECTED_PATHS = [
  /(^|[\\/])scripts[\\/]gate[\\/]/,
  /(^|[\\/])scripts[\\/]guard-protected\.mjs$/,
  /(^|[\\/])docs[\\/]contrast-check\.py$/,
  /(^|[\\/])docs[\\/]MANUAL-CHECKS\.md$/,
  /(^|[\\/])\.claude[\\/]settings\.json$/,
  /(^|[\\/])\.claude[\\/]commands[\\/]/,
  /(^|[\\/])docs[\\/]ui-redesign[\\/]/,   // spec là read-only với agent
  /(^|[\\/])CLAUDE\.md$/,
]

if (['Edit', 'Write', 'MultiEdit', 'NotebookEdit'].includes(tool)) {
  const p = input.file_path ?? input.path ?? ''
  if (PROTECTED_PATHS.some((re) => re.test(p))) {
    deny(`File này read-only với agent: ${p}`)
  }
}

/* ------------------------------------------------------------------ */
/* 2. Chặn lệnh bash nguy hiểm                                         */
/* ------------------------------------------------------------------ */

if (tool === 'Bash') {
  const cmd = String(input.command ?? '')

  const BANNED = [
    [/--no-verify/,                     'Không được bỏ qua git hook.'],
    [/git\s+push\s+.*(--force|-f)\b/,   'Không force push.'],
    [/git\s+commit\s+.*--amend/,        'Không amend commit đã có.'],
    [/git\s+reset\s+--hard/,            'Không reset --hard. Dùng git revert nếu cần.'],
    [/git\s+checkout\s+(main|master)\b/, 'Không checkout main. Làm trên branch redesign/phase-N.'],
    [/rebase/,                          'Không rebase. Giữ history tuyến tính bằng commit nhỏ.'],
    [/rm\s+(-[a-zA-Z]*\s+)*(scripts|docs)[\\/]/, 'Không xoá file trong scripts/ hoặc docs/.'],
    [/(^|[;&|]\s*)(>|>>)\s*.*scripts[\\/]gate/, 'Không ghi đè file gate bằng redirect.'],
    [/sed\s+.*-i.*scripts[\\/]gate/,    'Không sed vào file gate.'],
    [/npm\s+(un)?install\s+.*--force/,  'Không install --force.'],
    [/\bpip\s+install\b.*--break-system-packages.*(-U|--upgrade)\s+pytest/, 'Không upgrade pytest ngoài lockfile.'],
  ]

  for (const [re, msg] of BANNED) {
    if (re.test(cmd)) deny(`${msg}\nLệnh: ${cmd}`)
  }
}

/* ------------------------------------------------------------------ */
/* 3. Chặn thêm escape hatch vào source                                */
/* ------------------------------------------------------------------ */

if (['Edit', 'Write', 'MultiEdit'].includes(tool)) {
  const p = input.file_path ?? ''
  const isSource = /\.(ts|tsx|js|jsx|mjs|cjs)$/.test(p)
  const added = [input.new_string, input.content, ...(input.edits ?? []).map((e) => e.new_string)]
    .filter(Boolean).join('\n')

  if (isSource && added) {
    const ESCAPES = [
      [/eslint-disable(-next-line)?\s+.*no-restricted-imports/, 'Không disable no-restricted-imports.'],
      [/@ts-ignore/,        'Không dùng @ts-ignore. Sửa type cho đúng.'],
      [/@ts-nocheck/,       'Không dùng @ts-nocheck.'],
      [/@ts-expect-error(?!\s*--\s*\S)/, 'Nếu buộc dùng @ts-expect-error thì phải kèm lý do: `@ts-expect-error -- <lý do>`.'],
    ]
    for (const [re, msg] of ESCAPES) {
      if (re.test(added)) deny(msg)
    }

    // Hex hardcode ở storefront .tsx
    const isStorefrontTsx = /\.tsx$/.test(p) && !/[\\/]admin[\\/]/.test(p)
    if (isStorefrontTsx && /#[0-9a-fA-F]{6}\b/.test(added)) {
      deny(
        `Hex hardcode trong file storefront: ${p}\n` +
        `Tìm thấy: ${added.match(/#[0-9a-fA-F]{6}\b/g).slice(0, 5).join(', ')}\n` +
        `Dùng token semantic (bg-*, fg-*, border-*, brand-*, accent-*, success/warning/danger/info).\n` +
        `Thiếu token cho vai trò cần dùng? DỪNG và báo — đừng bịa hex.`
      )
    }

    // focus:outline-none mới
    if (/focus:outline-none/.test(added) && !/[\\/]admin[\\/]/.test(p)) {
      deny(`Không thêm focus:outline-none (${p}). Dùng focus-visible:ring-2 focus-visible:ring-focus.`)
    }

    // <a href="/..."> nội bộ
    if (/<a\b[^>]*href=["']\/(?!\/)/.test(added)) {
      deny(`Link nội bộ phải dùng <Link to="...">, không <a href="/...">  (${p})`)
    }

    // Màu Tailwind mặc định
    const DEFAULT_PALETTE = /\b(?:bg|text|border|ring|from|to|via|divide|outline|decoration|shadow|accent|caret|fill|stroke)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(?:50|[1-9]00|950)\b/
    if (DEFAULT_PALETTE.test(added) && !/[\\/]admin[\\/]/.test(p)) {
      deny(
        `Màu Tailwind mặc định trong storefront: ${added.match(DEFAULT_PALETTE)[0]}  (${p})\n` +
        `theme.colors đã bị ghi đè — dùng token semantic. legacy-* CHỈ dành cho admin.`
      )
    }
  }

  // Chặn nới lỏng ESLint
  if (/eslint\.config\.|\.eslintrc/.test(p) && added) {
    if (/'no-restricted-imports'\s*:\s*['"](off|warn)['"]/.test(added)) {
      deny('Không hạ no-restricted-imports xuống off/warn.')
    }
  }

  // Chặn sửa script gate:*/check:* trong package.json
  if (/package\.json$/.test(p) && added) {
    if (/["'](gate:|check:)[a-z0-9]*["']\s*:/.test(added)) {
      deny('Không sửa script gate:* / check:* trong package.json.')
    }
  }

  // Chặn đổi colors sang extend trong tailwind config
  if (/tailwind\.config\./.test(p) && added) {
    if (/extend\s*:\s*\{[^}]*\bcolors\s*:/s.test(added)) {
      deny(
        'Không đưa `colors` vào `extend`. Spec 01 §6 yêu cầu GHI ĐÈ theme.colors ' +
        'để palette mặc định của Tailwind fail build. Đó là guardrail, không phải bug.'
      )
    }
  }
}

process.exit(0)
