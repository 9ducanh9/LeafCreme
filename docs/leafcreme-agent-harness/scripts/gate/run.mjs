#!/usr/bin/env node
/**
 * Gate runner.  Usage: node scripts/gate/run.mjs <phase>
 *
 * Exit 0 = phase PASS. Exit 1 = có check FAIL.
 *
 * Đây là objective function của agent. Agent KHÔNG được sửa file này.
 */

import { execSync } from 'node:child_process'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { glob } from './fsutil.mjs'
import { PHASES, PHASE_ORDER } from './checks.mjs'

const phase = process.argv[2]
if (phase === undefined || !(phase in PHASES)) {
  console.error(`Usage: node scripts/gate/run.mjs <phase>\nPhase có sẵn: ${Object.keys(PHASES).join(', ')}`)
  console.error(`Thứ tự thực thi: ${PHASE_ORDER.join(' → ')}`)
  process.exit(2)
}

const { title, spec, checks } = PHASES[phase]
const G = '\x1b[32m', R = '\x1b[31m', Y = '\x1b[33m', D = '\x1b[2m', X = '\x1b[0m'

/* ---------------------------------------------------------------- */
/* helpers                                                          */
/* ---------------------------------------------------------------- */

const sh = (cmd) => {
  try {
    execSync(cmd, { stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf8', timeout: 600_000 })
    return { ok: true }
  } catch (e) {
    const out = `${e.stdout ?? ''}${e.stderr ?? ''}`.trim()
    return { ok: false, detail: out.split('\n').slice(-12).join('\n') }
  }
}

const files = (pattern, exclude = []) => {
  let list
  try { list = glob(pattern) } catch { list = [] }
  return list.filter((f) => !exclude.some((ex) => {
    const re = new RegExp(ex.replace(/\*\*/g, '.*').replace(/(?<!\.)\*/g, '[^/]*'))
    return re.test(f.replace(/\\/g, '/'))
  }))
}

const countMatches = (pattern0, pattern, exclude) => {
  const re = re2(pattern, 'g')
  let n = 0
  const hits = []
  for (const f of files(pattern0, exclude)) {
    const lines = readFileSync(f, 'utf8').split('\n')
    lines.forEach((l, i) => {
      const m = l.match(re)
      if (m) { n += m.length; if (hits.length < 8) hits.push(`${f}:${i + 1}: ${l.trim().slice(0, 90)}`) }
    })
  }
  return { n, hits }
}

/** Cho phép pattern mở đầu bằng (?i) — JS RegExp không hỗ trợ inline flag. */
const re2 = (pattern, extra = '') => {
  const ci = pattern.startsWith('(?i)')
  return new RegExp(ci ? pattern.slice(4) : pattern, extra + (ci ? 'i' : ''))
}

const OPS = { '==': (a, b) => a === b, '>=': (a, b) => a >= b, '<=': (a, b) => a <= b, '<': (a, b) => a < b, '>': (a, b) => a > b }

/* ---------------------------------------------------------------- */
/* runners per kind                                                 */
/* ---------------------------------------------------------------- */

function run(c) {
  switch (c.kind) {
    case 'cmd':      return sh(c.cmd)
    case 'cmdFails': { const r = sh(c.cmd); return r.ok ? { ok: false, detail: 'Lệnh đáng lẽ phải fail nhưng lại pass.' } : { ok: true } }

    case 'exists':   return existsSync(c.path) ? { ok: true } : { ok: false, detail: `Không tìm thấy: ${c.path}` }
    case 'absent':   return !existsSync(c.path) ? { ok: true } : { ok: false, detail: `Vẫn còn tồn tại: ${c.path}` }

    case 'contains': {
      if (!existsSync(c.path)) return { ok: false, detail: `File không tồn tại: ${c.path}` }
      const s = readFileSync(c.path, 'utf8')
      return re2(c.pattern, 's').test(s)
        ? { ok: true }
        : { ok: false, detail: `${c.path} không chứa /${c.pattern}/` }
    }
    case 'lacks': {
      if (!existsSync(c.path)) return { ok: true } // file bị xoá thì đương nhiên không chứa
      const s = readFileSync(c.path, 'utf8')
      const m = s.match(re2(c.pattern, 'g'))
      return !m ? { ok: true } : { ok: false, detail: `${c.path} vẫn chứa: ${[...new Set(m)].slice(0, 5).join(', ')}` }
    }

    case 'count': {
      const { n, hits } = countMatches(c.glob, c.pattern, c.exclude)
      const ok = OPS[c.op](n, c.value)
      return ok ? { ok: true, detail: `${n}` }
        : { ok: false, detail: `Đếm được ${n}, cần ${c.op} ${c.value}\n${hits.map((h) => '    ' + h).join('\n')}` }
    }

    case 'maxLoc': {
      if (!existsSync(c.path)) return { ok: false, detail: `File không tồn tại: ${c.path}` }
      const n = readFileSync(c.path, 'utf8').split('\n').length
      return n <= c.value ? { ok: true, detail: `${n} dòng` }
        : { ok: false, detail: `${n} dòng, tối đa ${c.value}. Tách theo spec.` }
    }

    case 'kebab': {
      if (!existsSync(c.path)) return { ok: false, detail: `Dir không tồn tại: ${c.path}` }
      const bad = readdirSync(c.path)
        .filter((f) => statSync(`${c.path}/${f}`).isFile())
        .filter((f) => !/^[a-z0-9]+(-[a-z0-9]+)*\.(tsx|ts)$/.test(f))
      return bad.length === 0 ? { ok: true }
        : { ok: false, detail: `Chưa kebab-case: ${bad.join(', ')}\nNhớ rename 2 BƯỚC (CLAUDE.md §3.2).` }
    }

    default: return { ok: false, detail: `kind không hợp lệ: ${c.kind}` }
  }
}

/* ---------------------------------------------------------------- */
/* main                                                             */
/* ---------------------------------------------------------------- */

console.log(`\n${'═'.repeat(72)}`)
console.log(`  GATE — Phase ${phase}: ${title}`)
console.log(`  Spec: ${spec}`)
console.log(`${'═'.repeat(72)}\n`)

const fails = []
let pass = 0

for (const c of checks) {
  process.stdout.write(`  ${c.name.padEnd(48, '.')} `)
  const r = run(c)
  if (r.ok) {
    pass++
    console.log(`${G}PASS${X}${r.detail ? ` ${D}(${r.detail})${X}` : ''}`)
  } else {
    console.log(`${R}FAIL${X}`)
    fails.push({ c, r })
  }
}

console.log(`\n${'─'.repeat(72)}`)
console.log(`  ${pass}/${checks.length} PASS`)

if (fails.length) {
  console.log(`\n${R}  ${fails.length} check FAIL:${X}\n`)
  for (const { c, r } of fails) {
    console.log(`  ${R}✗${X} ${c.name}`)
    if (r.detail) console.log(`${D}${r.detail.split('\n').map((l) => '      ' + l).join('\n')}${X}`)
    if (c.why) console.log(`    ${Y}Vì sao cần:${X} ${c.why}`)
    console.log()
  }
  console.log(`${'─'.repeat(72)}`)
  console.log(`${Y}  SỬA CODE, KHÔNG SỬA GATE.${X}`)
  console.log(`  Nếu bạn tin một check ở trên là sai: DỪNG, báo cho người, chờ xác nhận.`)
  console.log(`  Xem CLAUDE.md §1.1.\n`)
  process.exit(1)
}

console.log(`\n${G}  Phase ${phase} PASS.${X}`)
console.log(`\n  ${Y}CHƯA XONG.${X} Còn manual check mà máy không kiểm được:`)
console.log(`  → docs/MANUAL-CHECKS.md §${phase}`)
console.log(`\n  Viết báo cáo theo mẫu CLAUDE.md §5 rồi DỪNG.`)
console.log(`  ${R}Không tự chuyển sang phase tiếp theo.${X}\n`)
process.exit(0)
