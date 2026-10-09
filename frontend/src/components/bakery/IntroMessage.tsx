import { ArrowUpRight, Candy } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Container, Section } from '../layout'
import { IMAGE_PATHS } from '../../constants/images'

export default function IntroMessage() {
  return (
    <Section tone="subtle">
      <Container>
        <div className="bakery-story" aria-labelledby="bakery-story-title">
          <div className="bakery-story-copy">
            <p className="bakery-story-label"><Candy size={18} aria-hidden="true" />Câu chuyện Leaf Creme</p>
            <h2 id="bakery-story-title">Một góc nhỏ,<br />thật nhiều ngọt ngào.</h2>
            <p>Một chiếc bánh để chia sẻ, một dịp nhỏ để gặp nhau. Leaf Creme ở đây để thêm chút ngọt ngào vào những khoảnh khắc của bạn.</p>
            <Link to="/search">Khám phá bánh của tiệm<ArrowUpRight size={18} aria-hidden="true" /></Link>
          </div>
          <figure className="bakery-story-photo">
            <img src={IMAGE_PATHS.categories.banhKem} alt="Bánh kem vanilla trái cây trong danh mục Leaf Creme" loading="lazy" width="640" height="640" />
            <figcaption>Một chút ngọt ngào, dành để sẻ chia.</figcaption>
          </figure>
        </div>
      </Container>
    </Section>
  )
}
