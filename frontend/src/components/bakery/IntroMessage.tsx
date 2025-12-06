// Intro message card about Leaf Creme - image left, text right
import Card from '../ui/Card'

export default function IntroMessage() {
  return (
    <section className="py-16">
      <div className="max-w-[1440px] mx-auto px-6">
        <Card className="p-0 overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
            {/* Image - Left Side */}
            <div className="relative h-64 md:h-auto min-h-[300px] md:min-h-[400px] overflow-hidden">
              <img
                src="https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=800&q=80"
                alt="Leaf Creme bakery"
                className="w-full h-full object-cover"
              />
            </div>

            {/* Text Content - Right Side */}
            <div className="p-8 md:p-12 lg:p-16 flex flex-col justify-center max-w-2xl mx-auto md:mx-0">
              <h2 className="font-heading text-2xl md:text-3xl font-medium text-text-primary mb-6 leading-tight">
                Leaf Creme · A light pause in your day
              </h2>
              <div className="space-y-4 text-text-secondary leading-relaxed">
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
            </div>
          </div>
        </Card>
      </div>
    </section>
  )
}

