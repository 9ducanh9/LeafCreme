// Footer component with links, address, and contact info
export default function Footer() {
  return (
    <footer className="bg-surface border-t border-border py-12">
      <div className="max-w-[1440px] mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          {/* Brand Section */}
          <div>
            <h3 className="font-heading text-2xl font-semibold text-text-primary mb-4">
              Leaf Creme
            </h3>
            <p className="text-text-secondary text-sm">
              Từ Sài Gòn, với vị ngọt nhẹ nhàng mỗi ngày.
            </p>
          </div>

          {/* Links Section */}
          <div>
            <h4 className="font-semibold text-text-primary mb-3">Liên kết</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="#menu" className="text-text-secondary hover:text-text-primary transition-default">
                  Menu
                </a>
              </li>
              <li>
                <a href="#contact" className="text-text-secondary hover:text-text-primary transition-default">
                  Liên hệ
                </a>
              </li>
              <li>
                <a href="#policy" className="text-text-secondary hover:text-text-primary transition-default">
                  Chính sách
                </a>
              </li>
            </ul>
          </div>

          {/* Contact Section */}
          <div>
            <h4 className="font-semibold text-text-primary mb-3">Thông tin</h4>
            <div className="space-y-2 text-sm text-text-secondary">
              <p>123 Đường ABC, Quận 1, TP.HCM</p>
              <p>Giờ mở cửa: 8:00 - 20:00</p>
              <p className="mt-4">Instagram / Facebook</p>
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="border-t border-border pt-8 text-center text-sm text-text-secondary">
          <p>© 2024 Leaf Creme. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}

