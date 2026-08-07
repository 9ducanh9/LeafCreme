// Footer component
import { Facebook, Instagram, MessageCircle, Twitter } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="bg-gradient-to-b from-[#FFFEF9] to-[#FFF5E6] border-t-2 border-[#D4A574] py-12 relative overflow-hidden">
      {/* Consistent container width - matches Header */}
      <div className="max-w-[1440px] mx-auto px-4 md:px-6 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12 mb-8">
          {/* Brand Section */}
          <div>
            <h3 className="font-heading text-xl font-medium text-text-primary mb-4 leading-tight">
              Leaf Creme
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
                  href="/contact" 
                  className="text-text-secondary hover:text-text-primary transition-default"
                >
                  Liên hệ
                </a>
              </li>
              <li>
                <a 
                  href="/policies" 
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
              
              {/* Social Media Icons */}
              <div className="flex items-center gap-3 mt-4 pt-1">
                <a
                  href="https://facebook.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-text-secondary hover:text-[#C59B72] transition-all duration-150"
                  aria-label="Facebook"
                >
                  <Facebook size={19} strokeWidth={1.5} />
                </a>
                <a
                  href="https://instagram.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-text-secondary hover:text-[#C59B72] transition-all duration-150"
                  aria-label="Instagram"
                >
                  <Instagram size={19} strokeWidth={1.5} />
                </a>
                <a
                  href="https://zalo.me"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-text-secondary hover:text-[#C59B72] transition-all duration-150"
                  aria-label="Zalo"
                >
                  <MessageCircle size={19} strokeWidth={1.5} />
                </a>
                <a
                  href="https://x.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-text-secondary hover:text-[#C59B72] transition-all duration-150"
                  aria-label="X (Twitter)"
                >
                  <Twitter size={19} strokeWidth={1.5} />
                </a>
              </div>
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

