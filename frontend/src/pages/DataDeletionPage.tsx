// Data Deletion Instructions — required by Meta App Review whenever an app
// offers Facebook Login (Settings → App Review → "Data Deletion Instructions
// URL"). The backend does not have a self-service "delete my account" endpoint
// today (only an admin-triggered soft delete — see app/services/users), so
// this documents the manual/contact-based process rather than promising a
// button that doesn't exist. If self-service deletion ever gets built, this
// page should be updated to point at it instead.
import Card from '../components/ui/Card'
import Container from '../components/layout/container'

export default function DataDeletionPage() {
  return (
    <div className="bg-bg-canvas py-12 md:py-16"><Container>
      <div className="max-w-3xl mx-auto mb-12">
        <h1 className="font-heading text-3xl md:text-4xl font-medium text-text-primary mb-4 leading-tight">
          Yêu cầu xoá dữ liệu
        </h1>
        <p className="text-text-secondary text-base md:text-lg leading-relaxed">
          Bạn có quyền yêu cầu xoá tài khoản và toàn bộ dữ liệu cá nhân của mình khỏi hệ thống Leaf Crème,
          bất kể bạn đăng ký trực tiếp hay đăng nhập qua Facebook/Google.
        </p>
      </div>

      <div className="max-w-3xl mx-auto space-y-8">

        <Card>
          <h2 className="font-heading text-xl font-medium text-text-primary mb-4">Cách yêu cầu xoá dữ liệu</h2>
          <div className="space-y-3 text-text-secondary leading-relaxed">
            <p>Hiện tại việc xoá dữ liệu được xử lý thủ công bởi đội ngũ Leaf Crème để đảm bảo đúng tài khoản. Gửi yêu cầu bằng một trong hai cách:</p>
            <ol className="list-decimal pl-5 space-y-2">
              <li>
                <strong className="text-text-primary">Email:</strong> gửi tới{' '}
                <a href="mailto:hello@leafcreme.vn?subject=Y%C3%AAu%20c%E1%BA%A7u%20x%C3%B3a%20d%E1%BB%AF%20li%E1%BB%87u" className="text-accent-brown underline underline-offset-4 hover:no-underline">hello@leafcreme.vn</a>,
                tiêu đề "Yêu cầu xoá dữ liệu", nội dung gồm: email hoặc số điện thoại đã đăng ký tài khoản.
              </li>
              <li>
                <strong className="text-text-primary">Điện thoại:</strong> gọi 028 1234 5678 và cung cấp thông tin tài khoản để xác minh danh tính.
              </li>
            </ol>
          </div>
        </Card>

        <Card>
          <h2 className="font-heading text-xl font-medium text-text-primary mb-4">Điều gì xảy ra sau đó</h2>
          <div className="space-y-3 text-text-secondary leading-relaxed">
            <p>Chúng tôi xác minh yêu cầu (đảm bảo đúng bạn là chủ tài khoản), sau đó xoá hoặc vô hiệu hoá tài khoản trong vòng <strong className="text-text-primary">30 ngày</strong> kể từ khi xác minh xong.</p>
            <p>Dữ liệu bị xoá bao gồm: thông tin tài khoản (họ tên, email, số điện thoại, địa chỉ), mật khẩu, và mọi thông tin liên kết từ Facebook/Google (tên, email, ảnh đại diện đã lưu khi đăng nhập).</p>
            <p className="text-sm text-text-secondary">
              Riêng dữ liệu hoá đơn/giao dịch đã phát sinh có thể được lưu thêm một thời gian theo quy định pháp luật về kế toán và thuế, nhưng sẽ không còn gắn với thông tin định danh cá nhân của bạn cho mục đích nào khác ngoài nghĩa vụ pháp lý này.
            </p>
          </div>
        </Card>

        <Card>
          <h2 className="font-heading text-xl font-medium text-text-primary mb-4">Câu hỏi khác</h2>
          <div className="space-y-3 text-text-secondary leading-relaxed">
            <p>
              Xem thêm chi tiết tại{' '}
              <a href="/privacy-policy" className="text-accent-brown underline underline-offset-4 hover:no-underline">Chính sách quyền riêng tư</a>,
              hoặc liên hệ trực tiếp qua trang{' '}
              <a href="/contact" className="text-accent-brown underline underline-offset-4 hover:no-underline">Liên hệ</a>.
            </p>
          </div>
        </Card>

        <div className="text-center pt-4 pb-4">
          <p className="text-text-secondary text-xs">Cập nhật lần cuối: 12/08/2026</p>
        </div>

      </div>
    </Container></div>
  )
}
