// Privacy Policy — formal version required for Meta/Facebook App Review,
// Google/Cognito OAuth consent screens, and Vietnamese personal-data-protection
// disclosure (Nghị định 13/2023/NĐ-CP). Kept as a standalone route (not folded
// into /policies) because Meta requires a single, stable, dedicated URL.
import Card from '../components/ui/Card'
import Container from '../components/layout/container'

const LAST_UPDATED = '12/08/2026'

export default function PrivacyPolicyPage() {
  return (
    <div className="bg-bg-canvas py-12 md:py-16"><Container>
      <div className="max-w-3xl mx-auto mb-12">
        <h1 className="font-heading text-3xl md:text-4xl font-medium text-text-primary mb-4 leading-tight">
          Chính sách quyền riêng tư
        </h1>
        <p className="text-text-secondary text-base md:text-lg leading-relaxed">
          Chính sách này giải thích Leaf Creme thu thập, sử dụng, chia sẻ và bảo vệ thông tin cá nhân của bạn
          như thế nào khi bạn dùng website, đặt hàng, hoặc đăng nhập bằng tài khoản mạng xã hội.
        </p>
      </div>

      <div className="max-w-3xl mx-auto space-y-8">

        <Card>
          <h2 className="font-heading text-xl font-medium text-text-primary mb-4">1. Thông tin chúng tôi thu thập</h2>
          <div className="space-y-3 text-text-secondary leading-relaxed">
            <p><strong className="text-text-primary">Thông tin bạn cung cấp trực tiếp:</strong> họ tên, số điện thoại, email, địa chỉ giao hàng, mật khẩu (được mã hoá), lịch sử đơn hàng.</p>
            <p><strong className="text-text-primary">Khi đăng nhập bằng Facebook/Google:</strong> chúng tôi chỉ nhận tên hiển thị, email và ảnh đại diện công khai mà bạn đồng ý chia sẻ — không nhận mật khẩu, không nhận danh sách bạn bè, không đăng bài thay bạn.</p>
            <p><strong className="text-text-primary">Thông tin tự động:</strong> địa chỉ IP, loại trình duyệt, thời gian truy cập — dùng cho bảo mật và khắc phục lỗi, không dùng để theo dõi quảng cáo chéo nền tảng.</p>
          </div>
        </Card>

        <Card>
          <h2 className="font-heading text-xl font-medium text-text-primary mb-4">2. Mục đích sử dụng</h2>
          <div className="space-y-3 text-text-secondary leading-relaxed">
            <p>Xử lý và giao đơn hàng; xác thực tài khoản và đăng nhập; liên hệ khi có vấn đề về đơn hàng; cải thiện chất lượng sản phẩm và trải nghiệm website; gửi thông báo về đơn hàng hoặc chương trình mới (bạn có thể từ chối bất kỳ lúc nào).</p>
            <p>Chúng tôi không bán, cho thuê, hay trao đổi thông tin cá nhân của bạn cho bên thứ ba vì mục đích quảng cáo.</p>
          </div>
        </Card>

        <Card>
          <h2 className="font-heading text-xl font-medium text-text-primary mb-4">3. Chia sẻ với bên thứ ba</h2>
          <div className="space-y-3 text-text-secondary leading-relaxed">
            <p>Chúng tôi chỉ chia sẻ thông tin cần thiết với các đối tác sau, để vận hành dịch vụ:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong className="text-text-primary">Đối tác thanh toán</strong> (SePay/VietQR): tạo mã chuyển khoản và xác nhận giao dịch đơn hàng.</li>
              <li><strong className="text-text-primary">Nhà cung cấp xác thực</strong> (Amazon Cognito, và Facebook/Google nếu bạn chọn đăng nhập bằng mạng xã hội): xác minh danh tính tài khoản.</li>
              <li><strong className="text-text-primary">Đơn vị giao hàng</strong>: họ tên, số điện thoại, địa chỉ để giao bánh đến bạn.</li>
            </ul>
            <p>Các đối tác này chỉ được dùng thông tin cho đúng mục đích trên, theo chính sách bảo mật riêng của họ.</p>
          </div>
        </Card>

        <Card>
          <h2 className="font-heading text-xl font-medium text-text-primary mb-4">4. Cookie</h2>
          <div className="space-y-3 text-text-secondary leading-relaxed">
            <p>Website dùng cookie/localStorage ở mức tối thiểu để giữ trạng thái đăng nhập và giỏ hàng của bạn. Không dùng cookie theo dõi quảng cáo bên thứ ba.</p>
          </div>
        </Card>

        <Card>
          <h2 className="font-heading text-xl font-medium text-text-primary mb-4">5. Bảo mật</h2>
          <div className="space-y-3 text-text-secondary leading-relaxed">
            <p>Mật khẩu được mã hoá, kết nối website dùng HTTPS, quyền truy cập dữ liệu nội bộ giới hạn theo vai trò (nhân viên/quản trị viên). Không có hệ thống nào an toàn tuyệt đối, nhưng chúng tôi áp dụng các biện pháp hợp lý để bảo vệ dữ liệu của bạn.</p>
          </div>
        </Card>

        <Card>
          <h2 className="font-heading text-xl font-medium text-text-primary mb-4">6. Quyền của bạn</h2>
          <div className="space-y-3 text-text-secondary leading-relaxed">
            <p>Bạn có quyền: xem lại thông tin cá nhân đang lưu, yêu cầu chỉnh sửa thông tin sai, hoặc yêu cầu xoá tài khoản và dữ liệu cá nhân.</p>
            <p>Xem hướng dẫn xoá dữ liệu chi tiết tại trang{' '}
              <a href="/data-deletion" className="text-accent-brown underline underline-offset-4 hover:no-underline">Yêu cầu xoá dữ liệu</a>.
            </p>
          </div>
        </Card>

        <Card>
          <h2 className="font-heading text-xl font-medium text-text-primary mb-4">7. Trẻ em</h2>
          <div className="space-y-3 text-text-secondary leading-relaxed">
            <p>Dịch vụ không hướng đến trẻ em dưới 16 tuổi. Chúng tôi không cố ý thu thập thông tin cá nhân từ trẻ em dưới 16 tuổi mà không có sự đồng ý của phụ huynh.</p>
          </div>
        </Card>

        <Card>
          <h2 className="font-heading text-xl font-medium text-text-primary mb-4">8. Thay đổi chính sách</h2>
          <div className="space-y-3 text-text-secondary leading-relaxed">
            <p>Chính sách này có thể được cập nhật theo thời gian. Ngày cập nhật gần nhất được ghi ở cuối trang.</p>
          </div>
        </Card>

        <Card>
          <h2 className="font-heading text-xl font-medium text-text-primary mb-4">9. Liên hệ</h2>
          <div className="space-y-3 text-text-secondary leading-relaxed">
            <p>Mọi câu hỏi về quyền riêng tư, vui lòng liên hệ:</p>
            <p>Email: <a href="mailto:hello@leafcreme.vn" className="text-accent-brown underline underline-offset-4 hover:no-underline">hello@leafcreme.vn</a> · Điện thoại: 028 1234 5678</p>
          </div>
        </Card>

        <div className="text-center pt-4 pb-4">
          <p className="text-text-secondary text-xs">Cập nhật lần cuối: {LAST_UPDATED}</p>
        </div>

      </div>
    </Container></div>
  )
}
