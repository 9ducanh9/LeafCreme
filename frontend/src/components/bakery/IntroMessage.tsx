import Card, { CardBody, CardMedia } from '../ui/Card'
import { Container, Section } from '../layout'
import { IMAGE_PATHS, FALLBACK_IMAGE } from '../../constants/images'

export default function IntroMessage() {
  return (
    <Section tone="subtle">
      <Container>
        <Card className="overflow-hidden p-0">
          <div className="grid md:grid-cols-2">
            <CardMedia className="min-h-72 md:min-h-full">
              <img
                src={IMAGE_PATHS.about.bakery}
                alt="Không gian bếp Leaf Crème"
                className="h-full w-full object-cover"
                loading="lazy"
                onError={(event) => {
                  event.currentTarget.onerror = null
                  event.currentTarget.src = FALLBACK_IMAGE.product
                }}
              />
            </CardMedia>
            <CardBody className="justify-center gap-5 p-8 md:p-12">
              <p className="text-xs font-semibold uppercase tracking-caps text-brand-fg">Câu chuyện Leaf Crème</p>
              <h2 className="text-h2">Khoảng lặng giữa ngày</h2>
              <div className="space-y-4 leading-relaxed text-fg-muted">
                <p>Có những buổi chiều, bạn chỉ muốn ngồi lại một chút. Không làm gì cả. Chỉ là thở.</p>
                <p>Chúng tôi làm bánh để ngày của bạn chậm lại một chút, để một khoảnh khắc bình thường trở nên êm hơn.</p>
                <p>Leaf Crème là lúc bạn gác điện thoại xuống, ngồi đối diện với ai đó hoặc chỉ với chính mình, và thấy như thế cũng đủ rồi.</p>
              </div>
            </CardBody>
          </div>
        </Card>
      </Container>
    </Section>
  )
}
