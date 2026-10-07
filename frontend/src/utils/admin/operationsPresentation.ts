import type { AgentAction, ProactiveInsight } from '../../services/admin/agentService'

const VERIFY_PREFIX = /LC_VERIFY_\d{8}_\d{6}_\d+[\s_-]*/gi

const SUBJECT_TRANSLATIONS: Array<[RegExp, string]> = [
  [/\blow stock\b/gi, 'Sắp hết hàng'],
  [/\bexpiring soon\b/gi, 'Sắp hết hạn'],
  [/\bpast due\b/gi, 'Đã quá hạn'],
  [/\bexpired\b/gi, 'Đã hết hạn'],
  [/\bgift box\b/gi, 'Hộp quà'],
  [/\bribbon\b/gi, 'Ruy băng'],
]

export function cleanOperationalText(value: string): string {
  let cleaned = value.replace(VERIFY_PREFIX, '')
    .replace(/(^|\s)#{1,6}\s*/g, '$1')
    .replace(/\*\*|__|`/g, '')
    .replace(/\b(san_pham_can_nhap|sap_het_han|qua_han|chua_xu_ly|dang_xu_ly|binh_thuong|low_stock|out_of_stock|partial_out_of_stock)\b/g, (key) => ({
      san_pham_can_nhap: 'sản phẩm cần bổ sung', sap_het_han: 'sắp hết hạn', qua_han: 'quá hạn',
      chua_xu_ly: 'chưa xử lý', dang_xu_ly: 'đang xử lý', binh_thuong: 'bình thường',
      low_stock: 'tồn chạm ngưỡng cảnh báo', out_of_stock: 'hết hàng', partial_out_of_stock: 'hết một số kích thước',
    }[key] ?? key))
    .replace(/\s{2,}/g, ' ').trim()
  for (const [pattern, replacement] of SUBJECT_TRANSLATIONS) cleaned = cleaned.replace(pattern, replacement)
  return cleaned
}

export function presentProactiveRecommendation(insight: Pick<ProactiveInsight, 'scenario' | 'evidence'>): string {
  const evidence = insight.evidence
  if (insight.scenario === 'product_stock') {
    const unavailable = Number(evidence.unavailable_product_count ?? 0)
    const missingSizes = Number(evidence.partial_out_of_stock_count ?? 0)
    return unavailable > 0 || missingSizes > 0
      ? 'Kiểm tra các sản phẩm hoặc kích thước hết hàng và lập kế hoạch bổ sung. Không tự động nhập thêm hàng.'
      : 'Tồn kho đã chạm ngưỡng cảnh báo, không có nghĩa là đã hết hàng. Kiểm tra nhu cầu bán và các lô cận hạn trước khi nhập thêm.'
  }
  if (insight.scenario === 'expiring_batch') {
    return evidence.alert_type === 'qua_han'
      ? 'Kiểm tra và xử lý lô đã quá hạn; không tiếp tục bán hàng từ lô này.'
      : 'Kiểm tra lô gần hạn và ưu tiên bán theo hạn dùng. Chỉ xuất hủy khi thực tế đã hết hạn hoặc hàng không còn đạt chất lượng.'
  }
  return 'Kiểm tra thông tin cảnh báo trước khi quyết định xử lý.'
}

function formatDate(value: unknown): string | null {
  if (!value) return null
  const date = new Date(String(value))
  if (Number.isNaN(date.getTime())) return null
  return date.toLocaleDateString('vi-VN')
}

export function formatProactiveEvidence(insight: Pick<ProactiveInsight, 'evidence'>): string[] {
  const evidence = insight.evidence
  const result: string[] = []
  const productCount = Number(evidence.product_count ?? 0)
  const affectedSizeCount = Number(evidence.affected_size_count ?? 0)
  const unavailableCount = Number(evidence.unavailable_product_count ?? 0)
  if (productCount > 0) result.push(`${productCount} sản phẩm cần bổ sung`)
  if (affectedSizeCount > 0) result.push(`${affectedSizeCount} kích thước bị ảnh hưởng`)
  if (unavailableCount > 0) result.push(`${unavailableCount} sản phẩm hết toàn bộ size`)
  if (evidence.categories && typeof evidence.categories === 'object') {
    const categories = Object.entries(evidence.categories as Record<string, unknown>)
      .map(([name, count]) => `${name}: ${String(count)}`)
    if (categories.length > 0) result.push(categories.join(', '))
  }
  const batch = evidence.batch_code ? cleanOperationalText(String(evidence.batch_code)) : null
  const expiry = formatDate(evidence.expires_at)
  if (evidence.units_on_hand !== undefined && evidence.units_on_hand !== null) {
    result.push(`Còn ${String(evidence.units_on_hand)} sản phẩm trong kho`)
  }
  if (batch) result.push(`Mã lô ${batch}`)
  if (expiry) result.push(`Hạn dùng ${expiry}`)
  return result
}

export interface ActionPresentation {
  title: string
  description: string
  destination: string
}

export function presentAction(action: Pick<AgentAction, 'loai_hanh_dong' | 'tham_so' | 'ly_do'>): ActionPresentation {
  const reason = action.ly_do ? cleanOperationalText(action.ly_do) : null
  const params = action.tham_so

  switch (action.loai_hanh_dong) {
    case 'resolve_alert':
      return {
        title: 'Xác nhận cảnh báo đã được xử lý',
        description: reason || 'Chỉ xác nhận sau khi hàng đã được bổ sung hoặc lô liên quan đã được xử lý thực tế.',
        destination: '/admin/alerts',
      }
    case 'dismiss_alert':
      return {
        title: 'Bỏ qua một cảnh báo không còn phù hợp',
        description: reason || 'Cần admin xác nhận trước khi ẩn cảnh báo khỏi hàng đợi.',
        destination: '/admin/alerts',
      }
    case 'set_batch_status':
      return {
        title: 'Cập nhật trạng thái một lô hàng',
        description: reason || 'Thay đổi này có thể ảnh hưởng đến khả năng bán hàng nên cần admin duyệt.',
        destination: '/admin/inventory',
      }
    case 'cancel_order':
      return {
        title: params.order_id ? `Hủy đơn hàng #${String(params.order_id)}` : 'Hủy đơn hàng',
        description: reason || 'Hủy đơn có thể hoàn tồn kho và ảnh hưởng thanh toán nên không được tự động thực hiện.',
        destination: '/admin/orders',
      }
    case 'draft_replenishment_note':
      return {
        title: params.so_luong_de_nghi
          ? `Ghi đề xuất nhập thêm ${String(params.so_luong_de_nghi)} sản phẩm`
          : 'Ghi đề xuất nhập thêm hàng',
        description: reason || 'Đề xuất này chỉ ghi chú để nhân viên xem lại, không tự tạo đơn mua hàng.',
        destination: '/admin/alerts',
      }
    case 'generate_alerts':
      return {
        title: 'Quét và cập nhật cảnh báo vận hành',
        description: 'Hệ thống đã kiểm tra tồn kho và hạn dùng bằng quy tắc cố định.',
        destination: '/admin/alerts',
      }
    case 'create_proactive_notification':
      return {
        title: 'Phát hiện và ghi nhận một vấn đề cần chú ý',
        description: 'Hệ thống đã kiểm tra lại điều kiện và tạo nhắc nhở, không thay đổi hàng hóa hay đơn hàng.',
        destination: '/admin/alerts',
      }
    default:
      return {
        title: 'Đề xuất vận hành cần xem lại',
        description: reason || 'Hệ thống cần admin xem xét trước khi thực hiện thay đổi này.',
        destination: '/admin/dashboard',
      }
  }
}
