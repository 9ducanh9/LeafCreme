# LeafCreme — UI/UX redesign references

> **Trạng thái:** Các spec bên dưới là bản đề xuất/audit cũ, không phải mô tả hiện trạng hay danh sách việc còn lại. Chúng được viết trước các cập nhật giao diện gần đây. Đối chiếu code hiện tại trước khi lấy bất kỳ bug, số liệu, file:line hay quyết định thư viện nào làm đầu việc.

## Những phần đã thấy trong code hiện tại

- Storefront có mobile navigation trong `components/bakery/Header.tsx`.
- Design tokens và focus-visible styles đã được đưa vào `styles/tokens.css` và `index.css`.
- Có `ErrorBoundary` trong UI và `App`.
- Admin có theme MUI trong `theme/adminTheme.ts` và DataTable dùng chung trong `components/admin/ui/data-table.tsx`.
- Checkout hiện dùng SePay/VietQR; không còn là luồng MoMo trong sản phẩm.

Đây chỉ là xác nhận có implementation, không thay thế kiểm tra hành vi trên trình duyệt, mobile thật hay screen reader.

## Tài liệu tham khảo

| Spec | Chủ đề |
|---|---|
| [00 — Audit and strategy](./00-audit-and-strategy.md) | Bối cảnh và các đề xuất thiết kế ban đầu |
| [01 — Design tokens](./01-design-tokens.md) | Token thương hiệu |
| [02 — Primitives](./02-primitives.md) | Thành phần UI cơ sở |
| [03 — Layout and navigation](./03-layout-navigation.md) | Header, footer và layout |
| [04 — Catalog discovery](./04-catalog-discovery.md) | Duyệt và tìm sản phẩm |
| [05 — Cart and checkout](./05-cart-checkout.md) | Giỏ hàng, checkout và thanh toán |
| [06 — Account and orders](./06-account-orders.md) | Tài khoản và đơn hàng |
| [07 — States and accessibility](./07-states-and-a11y.md) | Trạng thái UI và accessibility |
| [08 — Execution roadmap](./08-execution-roadmap.md) | Kế hoạch cũ; xem trạng thái cập nhật trong tài liệu này |
| [09–13 — Admin](./09-admin-audit-and-strategy.md) | Đề xuất cho bảng, form, theme và trang admin |
| [Verification](./VERIFICATION.md) | Những đối chiếu mới nhất với code |

## Quy tắc dùng

1. Không dùng các con số audit cũ, bug list cũ hoặc tham chiếu `file:line` làm sự thật hiện tại.
2. Giữ lại những đề xuất còn phù hợp; bỏ việc đã được giải quyết hoặc dựa trên công nghệ/luồng không còn dùng.
3. Trước khi bắt đầu một thay đổi UI, ghi nhận lại tình trạng hiện tại và tiêu chí chấp nhận mới trong issue/PR.

Kế hoạch backend/production được theo dõi riêng tại [LeafCreme_Restructure_Plan.md](../../LeafCreme_Restructure_Plan.md).
