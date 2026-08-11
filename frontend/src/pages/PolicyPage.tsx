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
          Chúng mình muốn mọi thứ rõ ràng từ đầu, để bạn yên tâm khi đặt bánh. 
          Đây là cách chúng mình làm việc.
        </p>
      </div>

      {/* Policy Sections */}
      <div className="max-w-3xl mx-auto space-y-8">
        
        {/* Order & Confirmation */}
        <Card>
          <h2 className="font-heading text-xl font-medium text-text-primary mb-4">
            Đặt hàng & xác nhận
          </h2>
          <div className="space-y-3 text-text-secondary leading-relaxed">
            <p>
              Sau khi bạn đặt bánh, chúng mình sẽ gọi điện hoặc nhắn tin để xác nhận lại 
              thông tin—ngày nhận, giờ giao, và những chi tiết nhỏ khác.
            </p>
            <p>
              Nếu có gì chưa rõ hoặc cần thay đổi, đó là lúc chúng ta nói chuyện. 
              Bạn không phải lo là mình nhầm gì đâu.
            </p>
            <p className="text-sm text-text-secondary">
              Thường thì chúng tôi sẽ liên hệ ngay sau khi bạn đặt bánh, trừ khi bạn đặt vào đêm khuya.
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
              Nếu có gì đó đổi kế hoạch, cứ báo chúng mình sớm nhất có thể. 
              Chúng mình hiểu mà, cuộc sống không phải lúc nào cũng đi đúng kế hoạch.
            </p>
            <p>
              Với bánh thường, nếu bạn báo trước ít nhất 2 giờ, chúng mình có thể hủy hoặc đổi không mất phí.
            </p>
            <p>
              Với bánh custom hoặc hộp quà đặc biệt, vì chúng mình đã chuẩn bị nguyên liệu riêng, 
              nên việc hủy có thể khó hơn một chút. 
            </p>
            <p className="text-sm text-text-secondary">
              Nếu chỉ đổi giờ giao hay địa chỉ, thì không sao cả—miễn bạn báo trước giờ giao bánh ít nhất 2 tiếng là được.
            </p>
          </div>
        </Card>

        {/* Delivery */}
        <Card>
          <h2 className="font-heading text-xl font-medium text-text-primary mb-4">
            Giao hàng
          </h2>
          <div className="space-y-3 text-text-secondary leading-relaxed">
            <p>
              Chúng mình giao trong nội thành Sài Gòn. 
              Nếu bạn ở xa hơn, hãy hỏi, có khi vẫn giao được, chỉ là cần thêm chút thời gian.
            </p>
            <p>
              Bánh được đóng gói cẩn thận, chúng mình cố gắng để nó đến tay bạn còn nguyên vẹn và đẹp. 
              Nếu có gì không ổn khi nhận hàng, chụp ảnh và báo ngay cho chúng mình nhé.
            </p>
            <p>
              Phí giao hàng tùy khoảng cách. Chúng mình sẽ báo rõ trước khi bạn xác nhận đơn.
            </p>
            <p className="text-sm text-text-secondary">
              Nếu không có ai nhận ở nhà, tài xế sẽ gọi điện. Nên nhớ để máy gần nhé.
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
                Chúng mình làm bánh từng chiếc, không làm sẵn hàng loạt. 
                Nên đôi khi màu sắc hay hình dáng có thể hơi khác một chút so với ảnh — nhưng vị vẫn như nhau.
            </p>
            <p>
              Bánh tươi nên để tủ lạnh và dùng trong 2–3 ngày. 
              Một số loại bánh kem sẽ có hướng dẫn bảo quản riêng, chúng mình sẽ ghi kèm.
            </p>
            <p>
              Nếu bánh có vấn đề gì (vị lạ, hỏng, không đúng như đã đặt), 
              hãy chụp ảnh và liên hệ ngay. Chúng mình sẽ làm lại hoặc hoàn tiền cho bạn.
            </p>
            <p className="text-sm text-text-secondary">
              Chúng mình không dùng chất bảo quản, nên bánh không để lâu được nhưng đảm bảo luôn tươi mới.
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
              Khi bạn đặt bánh, chúng mình luôn lưu tên, số điện thoại, địa chỉ giao hàng của bạn—
              để giao bánh và liên hệ khi cần.
            </p>
            <p>
              Chúng mình không bán thông tin của bạn cho ai. 
              Chúng mình cũng không gửi quảng cáo lung tung. 
              Nếu có tin nhắn gì, đó là về đơn hàng hoặc menu mới (và bạn có thể từ chối nhận).
            </p>
            <p>
              Nếu bạn muốn xóa tài khoản hoặc xóa thông tin, cứ nói. Chúng tôi sẽ xóa.
            </p>
            <p className="text-sm text-text-secondary">
              Chúng mình giữ thông tin đơn hàng để phục vụ bạn tốt hơn lần sau—
              ví dụ nhớ địa chỉ, hay bánh bạn thích.
            </p>
          </div>
        </Card>

        {/* Closing Note */}
        <div className="text-center pt-8 pb-4">
          <p className="text-text-secondary text-sm leading-relaxed">
            Nếu có gì chưa rõ hoặc bạn gặp trường hợp đặc biệt, 
            <br />
            cứ liên hệ trực tiếp. Chúng mình sẽ nói chuyện cụ thể hơn.
          </p>
          <p className="text-text-secondary text-xs mt-4">
            Cập nhật lần cuối: 25/12/2025
          </p>
        </div>

      </div>
    </Container></div>
  )
}

