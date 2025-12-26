// Contact page - warm and inviting
import { useState, FormEvent } from 'react'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: '',
  })

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    // Handle form submission here
    console.log('Form submitted:', formData)
  }

  return (
    <div className="max-w-[1440px] mx-auto px-4 md:px-6 py-12 md:py-16">
      {/* Header */}
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
        {/* Contact Info Card */}
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

        {/* Contact Form Card */}
        <Card>
          <h2 className="font-heading text-xl font-medium text-text-primary mb-6">
            Hoặc để lại lời nhắn
          </h2>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="name" className="block text-sm text-text-secondary mb-2">
                Tên bạn
              </label>
              <input
                type="text"
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-brown/30 focus:border-accent-brown transition-default"
                placeholder="Gọi bạn là..."
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm text-text-secondary mb-2">
                Email của bạn
              </label>
              <input
                type="email"
                id="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-brown/30 focus:border-accent-brown transition-default"
                placeholder="Để chúng tôi có thể trả lời bạn"
              />
            </div>

            <div>
              <label htmlFor="message" className="block text-sm text-text-secondary mb-2">
                Bạn muốn nói gì?
              </label>
              <textarea
                id="message"
                rows={5}
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-brown/30 focus:border-accent-brown transition-default resize-none"
                placeholder="Đặt bánh, hỏi về menu, hay chỉ chào hỏi..."
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              className="w-full"
            >
              Gửi lời nhắn
            </Button>
            <p className="text-xs text-text-muted text-center">
              Chúng tôi sẽ đọc và trả lời sớm nhất có thể
            </p>
          </form>
        </Card>
      </div>
    </div>
  )
}

