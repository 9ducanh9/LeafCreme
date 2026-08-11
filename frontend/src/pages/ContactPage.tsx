// Contact page - warm and inviting
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Container from '../components/layout/container'

export default function ContactPage() {
  return (
    <div className="bg-bg-canvas py-12 md:py-16"><Container>
      <div className="max-w-2xl mx-auto text-center mb-12">
        <h1 className="font-heading text-3xl md:text-4xl font-medium text-text-primary mb-4 leading-tight">
          Cứ nhắn gì đi
        </h1>
        <p className="text-text-secondary text-base md:text-lg leading-relaxed">
          Muốn đặt bánh, muốn hỏi gì đó, hay chỉ muốn nói chuyện—
          chúng tôi nghe.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 max-w-5xl mx-auto">
        <Card className="h-fit">
          <h2 className="font-heading text-xl font-medium text-text-primary mb-6">
            Thông tin liên hệ
          </h2>
          <div className="space-y-6 text-text-secondary">
            <div>
              <p className="text-sm text-text-secondary mb-1">Địa chỉ</p>
              <p className="leading-relaxed">
                123 Đường ABC, Quận 1, TP.HCM
              </p>
              <p className="text-sm mt-1 text-text-secondary">
                (Mở cửa từ 8:00 đến 20:00, kể cả cuối tuần)
              </p>
            </div>
            <div>
              <p className="text-sm text-text-secondary mb-1">Điện thoại</p>
              <p>028 1234 5678</p>
              <p className="text-sm mt-1 text-text-secondary">
                Nhắn tin hoặc gọi, chúng tôi đều nhận
              </p>
            </div>
            <div>
              <p className="text-sm text-text-secondary mb-1">Email</p>
              <p>hello@leafcreme.vn</p>
              <p className="text-sm mt-1 text-text-secondary">
                Thường trả lời trong vòng 24 giờ
              </p>
            </div>
            <div className="pt-4 border-t border-border">
              <p className="text-sm text-text-secondary mb-2">Mạng xã hội</p>
              <p className="leading-relaxed">
                Nếu bạn dùng Instagram hoặc Facebook,
                tìm chúng tôi ở đó cũng được nhé.
              </p>
            </div>
          </div>
        </Card>

        <Card>
          <h2 className="font-heading text-xl font-medium text-text-primary mb-6">
            Gửi tin nhắn trực tiếp
          </h2>
          <div className="space-y-6">
            <div className="rounded-lg border border-border bg-bg-alt/30 p-4 text-sm text-text-secondary leading-relaxed">
              Form liên hệ trên website chưa được kết nối backend. Để tránh gửi thất lạc,
              vui lòng dùng điện thoại hoặc email đang hoạt động bên dưới.
            </div>
            <div className="space-y-3">
              <Button href="tel:02812345678" variant="primary" className="w-full">
                Gọi: 028 1234 5678
              </Button>
              <Button href="mailto:hello@leafcreme.vn" variant="secondary" className="w-full">
                Email: hello@leafcreme.vn
              </Button>
            </div>
            <p className="text-xs text-text-secondary text-center">
              Kênh liên hệ trực tiếp đang hoạt động và được phản hồi thủ công.
            </p>
          </div>
        </Card>
      </div>
    </Container></div>
  )
}
