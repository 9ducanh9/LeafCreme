import { Facebook, Instagram, MessageCircle, Twitter } from 'lucide-react'
import { Link } from 'react-router-dom'
import Container from '../layout/container'

const links = [
  { to: '/search', label: 'Menu bánh' },
  { to: '/gift-boxes', label: 'Hộp quà' },
  { to: '/contact', label: 'Liên hệ' },
  { to: '/policies', label: 'Chính sách' },
]

export default function Footer() {
  return <footer className="border-t border-border-subtle bg-bg-subtle">
    <Container className="py-12 sm:py-16">
      <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr]">
        <div><Link to="/" className="font-heading text-2xl font-semibold text-fg-strong">Leaf Crème</Link><p className="mt-3 max-w-sm text-sm leading-relaxed text-fg-muted">Những chiếc bánh nhỏ cho những khoảnh khắc đáng nhớ — làm thủ công từ căn bếp Sài Gòn.</p></div>
        <div><h2 className="text-sm font-semibold uppercase tracking-caps text-fg-strong">Khám phá</h2><nav aria-label="Liên kết cuối trang" className="mt-4 flex flex-col items-start gap-3 text-sm">{links.map((link) => <Link key={link.to} to={link.to} className="text-fg-muted transition-colors hover:text-brand-fg">{link.label}</Link>)}</nav></div>
        <div><h2 className="text-sm font-semibold uppercase tracking-caps text-fg-strong">Ghé thăm</h2><div className="mt-4 space-y-2 text-sm text-fg-muted"><p>123 Đường ABC, Quận 1, TP.HCM</p><p>Thứ 2 — Chủ nhật, 8:00 — 20:00</p><div className="flex gap-2 pt-2"><a href="https://facebook.com" target="_blank" rel="noreferrer" aria-label="Facebook" className="rounded-full p-2 hover:bg-bg-surface hover:text-brand-fg"><Facebook className="size-4" /></a><a href="https://instagram.com" target="_blank" rel="noreferrer" aria-label="Instagram" className="rounded-full p-2 hover:bg-bg-surface hover:text-brand-fg"><Instagram className="size-4" /></a><a href="https://zalo.me" target="_blank" rel="noreferrer" aria-label="Zalo" className="rounded-full p-2 hover:bg-bg-surface hover:text-brand-fg"><MessageCircle className="size-4" /></a><a href="https://x.com" target="_blank" rel="noreferrer" aria-label="X" className="rounded-full p-2 hover:bg-bg-surface hover:text-brand-fg"><Twitter className="size-4" /></a></div></div></div>
      </div>
      <div className="mt-10 border-t border-border-subtle pt-6 text-sm text-fg-subtle"><p>© {new Date().getFullYear()} Leaf Crème. Làm bằng sự tử tế.</p></div>
    </Container>
  </footer>
}
