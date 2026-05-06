// Contact page - warm and inviting
import Card from '../components/ui/Card'

export default function ContactPage() {
  return (
    <div className="max-w-[1440px] mx-auto px-4 md:px-6 py-12 md:py-16">
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
              <p className="text-sm text-text-muted mb-1">Địa chỉ</p>
              <p className="leading-relaxed">
                123 Đường ABC, Quận 1, TP.HCM
              </p>
              <p className="text-sm mt-1 text-text-muted">
                (Mở cửa từ 8:00 đến 20:00, kể cả cuối tuần)
              </p>
            </div>
            <div>
              <p className="text-sm text-text-muted mb-1">Điện thoại</p>
              <p>028 1234 5678</p>
              <p className="text-sm mt-1 text-text-muted">
                Nhắn tin hoặc gọi, chúng tôi đều nhận
              </p>
            </div>
            <div>
              <p className="text-sm text-text-muted mb-1">Email</p>
              <p>hello@leafcreme.vn</p>
              <p className="text-sm mt-1 text-text-muted">
                Thường trả lời trong vòng 24 giờ
              </p>
            </div>
            <div className="pt-4 border-t border-border">
              <p className="text-sm text-text-muted mb-2">Mạng xã hội</p>
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
            <div className="rounded-lg border border-border bg-background-secondary/30 p-4 text-sm text-text-secondary leading-relaxed">
              Form liên hệ trên website chưa được kết nối backend. Để tránh gửi thất lạc,
              vui lòng dùng điện thoại hoặc email đang hoạt động bên dưới.
            </div>
            <div className="space-y-3">
              <a
                href="tel:02812345678"
                className="w-full px-6 py-3 rounded-button font-medium transition-soft inline-flex items-center justify-center whitespace-nowrap bg-gradient-to-r from-[#C59B72] to-[#D4A574] text-white hover:from-[#B88A5F] hover:to-[#C59B72] border border-[#D4A574] shadow-md hover:shadow-lg"
              >
                Gọi: 028 1234 5678
              </a>
              <a
                href="mailto:hello@leafcreme.vn"
                className="w-full px-6 py-3 rounded-button font-medium transition-soft inline-flex items-center justify-center whitespace-nowrap bg-gradient-to-r from-[#F5C96A] to-[#F7D794] text-[#473C2F] hover:opacity-90 border border-[#F5C96A] shadow-sm"
              >
                Email: hello@leafcreme.vn
              </a>
            </div>
            <p className="text-xs text-text-muted text-center">
              Kênh liên hệ trực tiếp đang hoạt động và được phản hồi thủ công.
            </p>
          </div>
        </Card>
      </div>
    </div>
  )
}
