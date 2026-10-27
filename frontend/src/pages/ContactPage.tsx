// Contact page - warm and inviting
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Container from '../components/layout/container'

export default function ContactPage() {
  return (
    <div className="bg-bg-canvas py-12 md:py-16"><Container>
      <div className="max-w-2xl mx-auto text-center mb-12">
        <h1 className="font-heading text-3xl md:text-4xl font-medium text-text-primary mb-4 leading-tight">
          Trò chuyện cùng tiệm
        </h1>
        <p className="text-text-secondary text-base md:text-lg leading-relaxed">
          Bạn muốn đặt bánh, hỏi thăm thông tin hay chỉ đơn giản là chia sẻ một chút ngọt ngào — chúng mình luôn ở đây lắng nghe.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 max-w-5xl mx-auto">
        <Card className="h-fit">
          <h2 className="font-heading text-xl font-medium text-text-primary mb-6">
            Ghé thăm & Kết nối
          </h2>
          <div className="space-y-6 text-text-secondary">
            <div>
              <p className="text-sm text-text-secondary mb-1">Địa chỉ căn bếp</p>
              <p className="leading-relaxed">
                123 Đường ABC, Quận 1, TP.HCM
              </p>
              <p className="text-sm mt-1 text-text-secondary">
                (Mở cửa từ 8:00 đến 20:00, tất cả các ngày trong tuần)
              </p>
            </div>
            <div>
              <p className="text-sm text-text-secondary mb-1">Điện thoại</p>
              <p>028 1234 5678</p>
              <p className="text-sm mt-1 text-text-secondary">
                Gọi hoặc nhắn tin cho tiệm bất cứ khi nào bạn cần nhé
              </p>
            </div>
            <div>
              <p className="text-sm text-text-secondary mb-1">Email</p>
              <p>hello@leafcreme.vn</p>
              <p className="text-sm mt-1 text-text-secondary">
                Chúng mình thường phản hồi trong vòng 24 giờ
              </p>
            </div>
            <div className="pt-4 border-t border-border">
              <p className="text-sm text-text-secondary mb-2">Mạng xã hội</p>
              <p className="leading-relaxed">
                Nếu bạn quen dùng Instagram hay Facebook, ghé thăm trang của chúng mình để ngắm thêm nhiều mẫu bánh mới nhé.
              </p>
            </div>
          </div>
        </Card>

        <Card>
          <h2 className="font-heading text-xl font-medium text-text-primary mb-6">
            Gửi lời nhắn cho tiệm
          </h2>
          <div className="space-y-6">
            <div className="rounded-lg border border-border bg-bg-alt/30 p-4 text-sm text-text-secondary leading-relaxed">
              Tính năng gửi tin nhắn trực tiếp qua website đang được hoàn thiện thêm. Để chúng mình có thể hỗ trợ bạn chu đáo và nhanh nhất, bạn đừng ngần ngại gọi điện hoặc gửi thư cho tiệm nhé.
            </div>
            <div className="space-y-3">
              <Button href="tel:02812345678" variant="primary" className="w-full">
                Gọi cho tiệm: 028 1234 5678
              </Button>
              <Button href="mailto:hello@leafcreme.vn" variant="secondary" className="w-full">
                Gửi thư: hello@leafcreme.vn
              </Button>
            </div>
            <p className="text-xs text-text-secondary text-center">
              Chúng mình luôn đọc và hồi đáp từng lời nhắn bằng cả tấm lòng.
            </p>
          </div>
        </Card>
      </div>
    </Container></div>
  )
}
