import type { LeafieMessage, LeafieProduct } from '../types/leafie'
import { API_BASE_URL } from '../config/runtimeConfig'

export interface AskLeafieResponse {
  message: string
  suggestions: string[]
  products: LeafieProduct[]
}

export async function askLeafie(
  message: string,
  conversationHistory: Pick<LeafieMessage, 'role' | 'content'>[],
): Promise<AskLeafieResponse> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 40000)
  try {
    const res = await fetch(`${API_BASE_URL}/leafie/ask`, {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, conversationHistory }),
    })
    if (!res.ok) {
      if (res.status === 429) throw new Error('Leafie đang bận. Bạn chờ một phút rồi thử lại nhé.')
      if (res.status === 503) throw new Error('Leafie chưa sẵn sàng. Bạn thử lại sau hoặc liên hệ cửa hàng nhé.')
      throw new Error('Chưa nhận được câu trả lời. Bạn thử gửi lại nhé.')
    }
    const data = await res.json()
    if (typeof data.output !== 'string' || !data.output.trim()) throw new Error('Leafie chưa trả lời được. Bạn thử lại nhé.')
    return { message: data.output, suggestions: data.suggestions ?? [], products: data.products ?? [] }
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') throw new Error('Leafie trả lời hơi lâu. Bạn thử gửi lại nhé.')
    throw err
  } finally {
    clearTimeout(timeout)
  }
}
