// Footer component - Clean, premium footer using design tokens
export default function Footer() {
  return (
    <footer className="bg-surface-warm border-t border-border-warm py-12">
      {/* Consistent container width - matches Header */}
      <div className="max-w-[1440px] mx-auto px-4 md:px-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12 mb-8">
          {/* Brand Section */}
          <div>
            <h3 className="font-heading text-xl font-medium text-text-primary mb-4 leading-tight">
              Leaf Crème
            </h3>
            <p className="text-text-secondary text-sm leading-relaxed">
              Từ Sài Gòn, với vị ngọt nhẹ nhàng mỗi ngày.
            </p>
          </div>

          {/* Links Section */}
          <div>
            <h4 className="font-semibold text-text-primary mb-4">Liên kết</h4>
            <ul className="space-y-3 text-sm">
              <li>
                <a 
                  href="#menu" 
                  className="text-text-secondary hover:text-text-primary transition-default"
                >
                  Menu
                </a>
              </li>
              <li>
                <a 
                  href="#contact" 
                  className="text-text-secondary hover:text-text-primary transition-default"
                >
                  Liên hệ
                </a>
              </li>
              <li>
                <a 
                  href="#policy" 
                  className="text-text-secondary hover:text-text-primary transition-default"
                >
                  Chính sách
                </a>
              </li>
            </ul>
          </div>

          {/* Contact Section */}
          <div>
            <h4 className="font-semibold text-text-primary mb-4">Thông tin</h4>
            <div className="space-y-3 text-sm text-text-secondary">
              <p>123 Đường ABC, Quận 1, TP.HCM</p>
              <p>Giờ mở cửa: 8:00 - 20:00</p>
              <p className="mt-4">Instagram / Facebook</p>
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="border-t border-border pt-8 text-center text-sm text-text-secondary">
          <p>© 2024 Leaf Crème. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}

