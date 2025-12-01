// Intro message card about Leaf Creme
import Card from '../ui/Card'

export default function IntroMessage() {
  return (
    <section className="py-16">
      <div className="max-w-[1440px] mx-auto px-6">
        <Card className="max-w-3xl mx-auto text-center">
          <h2 className="font-heading text-3xl font-semibold text-text-primary mb-6">
            Leaf Creme · A light pause in your day
          </h2>
          <div className="space-y-4 text-text-secondary">
            <p>
              Tên "Leaf Creme" được lấy cảm hứng từ những chiếc lá xanh tươi mát và lớp kem mịn màng. 
              Chúng tôi tin rằng mỗi chiếc bánh không chỉ là món tráng miệng, mà còn là một khoảnh khắc 
              nhẹ nhàng trong ngày bận rộn của bạn.
            </p>
            <p>
              Từ bếp Leaf Creme, chúng tôi mang đến những hương vị ngọt ngào nhưng thanh tao, 
              không quá ngọt, không quá béo. Mỗi chiếc bánh được làm bằng tình yêu và sự tận tâm, 
              để bạn có thể tận hưởng những khoảnh khắc bình yên, dù là trong ngày sinh nhật, 
              dịp kỷ niệm, hay chỉ đơn giản là một buổi chiều thư giãn.
            </p>
          </div>
        </Card>
      </div>
    </section>
  )
}

