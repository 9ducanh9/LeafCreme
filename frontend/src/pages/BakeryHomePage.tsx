// Bakery Homepage - combines all sections
import { Link } from 'react-router-dom'
import HeroBanner from '../components/bakery/HeroBanner'
import BestSellers from '../components/bakery/BestSellers'
import ProductCategories from '../components/bakery/ProductCategories'
import IntroMessage from '../components/bakery/IntroMessage'
import Container from '../components/layout/container'

export default function BakeryHomePage() {
  return (
    <>
      <HeroBanner />
      <section className="border-b border-border-subtle bg-bg-canvas py-10 sm:py-12" aria-labelledby="leaf-creme-purpose">
        <Container>
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.65fr)] lg:items-end">
            <div>
              <p className="text-xs font-semibold uppercase tracking-caps text-brand-fg">Tiệm bánh trực tuyến tại Sài Gòn</p>
              <h1 id="leaf-creme-purpose" className="mt-2 text-h2">Leaf Creme giúp bạn chọn bánh và gửi quà cho những dịp đáng nhớ.</h1>
              <p className="mt-3 max-w-3xl leading-relaxed text-fg-muted">Khách hàng có thể xem menu, chọn hộp quà, đặt bánh và theo dõi đơn hàng trên website.</p>
            </div>
            <p className="text-sm leading-relaxed text-fg-muted">Khi bạn chủ động đăng nhập bằng Google, Leaf Creme dùng tên hiển thị, email và ảnh đại diện công khai để xác thực và tạo tài khoản. Xem <Link to="/privacy-policy" className="font-medium text-brand-fg underline underline-offset-4 hover:no-underline">Chính sách quyền riêng tư</Link>.</p>
          </div>
        </Container>
      </section>
      <BestSellers />
      <ProductCategories />
      <IntroMessage />
    </>
  )
}
