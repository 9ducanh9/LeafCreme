import { ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Container, Section } from '../layout'

export default function IntroMessage() {
  return (
    <Section tone="subtle">
      <Container>
        <div className="bakery-story" aria-labelledby="bakery-story-title">
          <div className="bakery-story-copy">
            <p className="bakery-story-label">
              <span className="halloween-eyebrow-line" aria-hidden="true" />
              <span>Câu chuyện Leaf Creme</span>
            </p>
            <h2 id="bakery-story-title">Một góc nhỏ,<br />thật nhiều ngọt ngào.</h2>
            <p>Một chiếc bánh để chia sẻ, một dịp nhỏ để gặp nhau. Từ căn bếp nhỏ lúc chiều muộn, tụi mình vẫn tỉ mẩn rây từng lớp bột cacao, phết từng mẻ kem tươi để gửi trọn chút ấm áp vào khoảnh khắc của bạn.</p>
            <Link to="/search">Khám phá bánh của tiệm<ArrowUpRight size={18} aria-hidden="true" /></Link>
          </div>
          <figure className="bakery-story-photo">
            <img src="/seasonal/leaf-creme-story-kitchen.jpg" alt="Người thợ bánh tại căn bếp Leaf Creme đang rây bột cacao lên chiếc bánh chocolate thủ công" loading="lazy" width="640" height="640" />
            <figcaption>Một chút ngọt ngào làm bằng tay, dành để sẻ chia.</figcaption>
          </figure>
        </div>
      </Container>
    </Section>
  )
}
