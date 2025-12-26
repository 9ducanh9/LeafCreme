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
            <div className="p-8 md:p-12 lg:p-16 flex flex-col justify-center max-w-2xl mx-auto md:mx-0 relative">
              {/* Christmas decoration */}
              <div className="absolute top-4 right-4 text-[#D4A574] text-2xl animate-sparkle">✨</div>
              <h2 className="font-heading text-2xl md:text-3xl font-medium text-text-primary mb-6 leading-tight">
                Khoảng lặng giữa ngày <span className="text-[#D4A574]">🎄</span>
              </h2>
              <div className="space-y-4 text-text-secondary leading-relaxed">
                <p>
                  Có những buổi chiều, bạn chỉ muốn ngồi lại một chút. 
                  Không làm gì cả. Chỉ là thở.
                </p>
                <p>
                  Chúng tôi nghĩ về điều đó khi làm bánh. 
                  Không phải để thêm ngọt vào ngày của bạn—mà để nó chậm lại một chút.
                </p>
                <p>
                  Leaf Creme là khoảnh khắc bạn gác điện thoại xuống. 
                  Là lúc bạn ngồi đối diện với ai đó, hoặc chỉ với chính mình. 
                  Và cảm thấy ổn như thế cũng đủ rồi.
                </p>
                <p>
                  Chúng tôi không hứa gì to tát. 
                  Chỉ mong bạn dừng lại, dù chỉ năm phút—và cảm nhận được rằng hôm nay vẫn còn những khoảnh khắc êm ấm.
                </p>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </section>
  )
}

