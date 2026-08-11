/**
 * Glob tối giản, không phụ thuộc Node 22 (fs.globSync) và không cần dependency.
 * Hỗ trợ: ** , * , {a,b} , đường dẫn dùng / trên mọi OS.
 */

import { readdirSync, statSync, existsSync } from 'node:fs'

const IGNORE = new Set(['node_modules', '.git', 'dist', 'build', '.next', 'coverage', '.venv', '__pycache__'])

/** Đệ quy liệt kê mọi file dưới root (bỏ qua IGNORE). */
export function walk(root, out = []) {
  if (!existsSync(root)) return out
  for (const entry of readdirSync(root)) {
    if (IGNORE.has(entry)) continue
    const p = `${root}/${entry}`
    let st
    try { st = statSync(p) } catch { continue }
    if (st.isDirectory()) walk(p, out)
    else out.push(p.replace(/\\/g, '/'))
  }
  return out
}

/** Chuyển glob pattern thành RegExp. */
export function globToRe(pattern) {
  // tách {a,b} thành alternation trước khi escape
  let p = pattern.replace(/\\/g, '/')
  let out = ''
  let i = 0
  while (i < p.length) {
    const c = p[i]
    if (c === '{') {
      const end = p.indexOf('}', i)
      if (end === -1) { out += '\\{'; i++; continue }
      const alts = p.slice(i + 1, end).split(',').map((a) => a.replace(/[.+^$()|[\]\\]/g, '\\$&'))
      out += `(?:${alts.join('|')})`
      i = end + 1
      continue
    }
    if (c === '*') {
      if (p[i + 1] === '*') {
        // ** => bất kỳ, kể cả /
        if (p[i + 2] === '/') { out += '(?:.*/)?'; i += 3 } else { out += '.*'; i += 2 }
        continue
      }
      out += '[^/]*'; i++; continue
    }
    if (c === '?') { out += '[^/]'; i++; continue }
    if ('.+^$()|[]\\'.includes(c)) { out += '\\' + c; i++; continue }
    out += c; i++
  }
  return new RegExp(`^${out}$`)
}

/**
 * glob(pattern) → danh sách file khớp.
 * Root suy ra từ phần cố định đầu pattern để không phải walk cả repo.
 */
export function glob(pattern) {
  const p = pattern.replace(/\\/g, '/')
  const firstMagic = p.search(/[*?{]/)
  const root = firstMagic === -1
    ? p
    : p.slice(0, p.lastIndexOf('/', firstMagic)) || '.'
  const re = globToRe(p)
  if (firstMagic === -1) return existsSync(p) ? [p] : []
  return walk(root).filter((f) => re.test(f))
}

/** Nhận 1 hoặc nhiều pattern, trả danh sách file duy nhất. */
export function globAll(patterns) {
  const list = Array.isArray(patterns) ? patterns : [patterns]
  return [...new Set(list.flatMap(glob))]
}
