// Policy page - warm and clear policies
import Card from '../components/ui/Card'
import Container from '../components/layout/container'

export default function PolicyPage() {
  return (
    <div className="bg-bg-canvas py-12 md:py-16"><Container>
      {/* Header */}
      <div className="max-w-3xl mx-auto mb-12">
        <h1 className="font-heading text-3xl md:text-4xl font-medium text-text-primary mb-4 leading-tight">
          Những điều cần biết
        </h1>
        <p className="text-text-secondary text-base md:text-lg leading-relaxed">
          Chúng mình luôn mong mọi điều thật rõ ràng và an tâm ngay từ đầu, để mỗi lần chọn bánh cùng Leaf Creme đều là một niềm vui trọn vẹn.
        </p>
      </div>

      {/* Policy Sections */}
      <div className="max-w-3xl mx-auto space-y-8">
        
        {/* Order & Confirmation */}
        <Card>
          <h2 className="font-heading text-xl font-medium text-text-primary mb-4">
            Đặt bánh & xác nhận
          </h2>
          <div className="space-y-3 text-text-secondary leading-relaxed">
            <p>
              Sau khi bạn đặt bánh, chúng mình sẽ nhắn tin hoặc gọi điện để xác nhận lại thông tin — từ ngày nhận, giờ giao, cho đến những lời nhắn nhỏ xinh bạn muốn gửi gắm.
            </p>
            <p>
              Nếu có bất kỳ điều gì cần dặn dò thêm hay thay đổi khẩu vị, bạn cứ thoải mái nói với tiệm nhé. Chúng mình sẽ chuẩn bị thật chu đáo.
            </p>
            <p className="text-sm text-text-secondary">
              Tiệm sẽ chủ động liên hệ với bạn ngay sau khi nhận đơn, trừ khi bạn đặt bánh vào đêm khuya (chúng mình sẽ nhắn lại vào sáng hôm sau nhé).
            </p>
          </div>
        </Card>

        {/* Change / Cancellation */}
        <Card>
          <h2 className="font-heading text-xl font-medium text-text-primary mb-4">
            Thay đổi hoặc hủy đơn
          </h2>
          <div className="space-y-3 text-text-secondary leading-relaxed">
            <p>
              Nếu lịch trình của bạn có chút thay đổi, hãy nhắn cho chúng mình sớm nhất có thể nhé. Cuộc sống luôn có những bất ngờ, và tiệm luôn sẵn lòng đồng hành cùng bạn.
            </p>
            <p>
              Với bánh thường, chỉ cần bạn báo trước giờ giao ít nhất 2 tiếng, chúng mình có thể đổi hoặc hủy đơn hoàn toàn miễn phí.
            </p>
            <p>
              Với bánh thiết kế riêng (custom) hoặc hộp quà đặc biệt, do tiệm đã chuẩn bị nguyên liệu riêng cho bạn, việc hủy đơn có thể cần linh hoạt một chút tùy theo giai đoạn làm bánh.
            </p>
            <p className="text-sm text-text-secondary">
              Nếu chỉ cần đổi giờ giao hoặc địa chỉ nhận bánh, bạn chỉ cần báo tiệm trước giờ giao 2 tiếng là được nha.
            </p>
          </div>
        </Card>

        {/* Delivery */}
        <Card>
          <h2 className="font-heading text-xl font-medium text-text-primary mb-4">
            Giao bánh tận nơi
          </h2>
          <div className="space-y-3 text-text-secondary leading-relaxed">
            <p>
              Chúng mình nhận giao trong khu vực nội thành Sài Gòn. Nếu bạn ở xa hơn một chút, cứ nhắn tiệm kiểm tra nhé — chúng mình sẽ cố gắng sắp xếp để bánh đến được với bạn.
            </p>
            <p>
              Mỗi chiếc bánh đều được nâng niu và đóng gói cẩn thận để giữ trọn vẹn vẻ đẹp khi đến tay bạn. Nếu có bất kỳ điều gì sơ suất trên đường đi, bạn chụp ảnh gửi ngay cho chúng mình để tiệm hỗ trợ bạn liền nhé.
            </p>
            <p>
              Phí giao hàng được tính theo khoảng cách thực tế và sẽ được thông báo rõ ràng trước khi bạn xác nhận đơn.
            </p>
            <p className="text-sm text-text-secondary">
              Khi giao bánh đến nơi, bác tài xế sẽ gọi điện trước, nên bạn để ý điện thoại một chút giúp tiệm nha.
            </p>
          </div>
        </Card>

        {/* Product Quality */}
        <Card>
          <h2 className="font-heading text-xl font-medium text-text-primary mb-4">
            Về chất lượng bánh
          </h2>
          <div className="space-y-3 text-text-secondary leading-relaxed">
            <p>
              Tiệm làm từng chiếc bánh thủ công theo mẻ nhỏ trong ngày, không làm sẵn hàng loạt. Vì vậy, đôi lúc màu sắc hay chi tiết trang trí có thể có chút khác biệt nhỏ so với ảnh chụp — nhưng hương vị và sự thơm ngon thì luôn được đảm bảo tuyệt đối.
            </p>
            <p>
              Bánh tươi ngon nhất khi được bảo quản lạnh và dùng trong 2–3 ngày. Một số mẫu bánh kem đặc biệt sẽ có thẻ hướng dẫn bảo quản riêng đi kèm hộp bánh.
            </p>
            <p>
              Nếu bánh có bất kỳ vấn đề gì khiến bạn chưa ưng ý (vị lạ, biến dạng, không đúng yêu cầu), hãy chụp ảnh và liên hệ ngay với tiệm nhé. Chúng mình sẽ làm lại chiếc mới hoặc hoàn tiền ngay cho bạn.
            </p>
            <p className="text-sm text-text-secondary">
              Leaf Creme hoàn toàn không sử dụng chất bảo quản, để mỗi miếng bánh bạn thưởng thức đều là nguyên liệu tươi lành và thuần khiết nhất.
            </p>
          </div>
        </Card>

        {/* Privacy */}
        <Card>
          <h2 className="font-heading text-xl font-medium text-text-primary mb-4">
            Thông tin cá nhân
          </h2>
          <div className="space-y-3 text-text-secondary leading-relaxed">
            <p>
              Khi bạn đặt bánh, chúng mình chỉ lưu lại họ tên, số điện thoại và địa chỉ giao hàng để tiện liên hệ và giao bánh đến đúng người nhận.
            </p>
            <p>
              Chúng mình tuyệt đối không chia sẻ thông tin của bạn cho bên thứ ba vì mục đích quảng cáo, và cũng không gửi tin nhắn làm phiền. Tiệm chỉ liên hệ khi có việc liên quan đến đơn hàng hoặc khi có menu mới mà bạn đồng ý nhận.
            </p>
            <p>
              Bất cứ khi nào bạn muốn xem lại, chỉnh sửa hoặc xóa thông tin tài khoản, cứ nhắn với tiệm nhé, chúng mình sẽ hỗ trợ xóa ngay lập tức.
            </p>
            <p className="text-sm text-text-secondary">
              Chúng mình lưu giữ lịch sử đơn hàng đơn giản là để phục vụ bạn chu đáo hơn ở những lần ghé tiệm sau — như nhớ khẩu vị yêu thích hay địa chỉ quen thuộc của bạn.
            </p>
          </div>
        </Card>

        {/* Closing Note */}
        <div className="text-center pt-8 pb-4">
          <p className="text-text-secondary text-sm leading-relaxed">
            Nếu có bất kỳ điều gì chưa rõ hoặc bạn có yêu cầu riêng cho dịp đặc biệt,
            <br />
            cứ nhắn trực tiếp cho chúng mình nhé. Tiệm luôn ở đây để lắng nghe bạn.
          </p>
          <p className="text-text-secondary text-xs mt-4">
            Cập nhật lần cuối: 25/12/2025
          </p>
        </div>

      </div>
    </Container></div>
  )
}
