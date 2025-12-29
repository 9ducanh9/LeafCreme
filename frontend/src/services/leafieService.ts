// frontend/src/services/leafieService.ts

import type { LeafieContext } from '../types/leafie'

const BACKEND_PROXY_URL =
  import.meta.env.VITE_LEAFIE_BACKEND_URL ||
  'http://localhost:8000/leafie/ask'

export interface AskLeafieParams {
  message: string
  context: LeafieContext
  conversationHistory: {
    role: 'user' | 'assistant'
    content: string
  }[]
}

export interface AskLeafieResponse {
  message: string
  suggestions?: string[]
}

/**
 * 🚨 SINGLE RESPONSIBILITY:
 * - Frontend KHÔNG suy nghĩ
 * - Chỉ forward dữ liệu cho backend → n8n
 * 
 * ⚠️ QUAN TRỌNG: sessionId được gửi riêng để n8n memory sử dụng
 * Session Key ưu tiên trong n8n: conversationId || session_id || user_id || 'leafie-default'
 */
export async function askLeafie(
  message: string,
  context: LeafieContext,
  conversationHistory: AskLeafieParams['conversationHistory']
): Promise<AskLeafieResponse> {
  try {
    const res = await fetch(BACKEND_PROXY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        context,
        conversationHistory,
        // 🔑 Session ID cho n8n memory - PHẢI giữ nguyên trong suốt cuộc chat
        sessionId: context.sessionId,
      }),
    })

    if (!res.ok) {
      const text = await res.text()
      throw new Error(`Backend error ${res.status}: ${text}`)
    }

    const data = await res.json()

    // 🔒 Tin tưởng tuyệt đối backend / n8n
    return {
      message: data.output ?? 'Leafie chưa trả lời được lúc này.',
      suggestions: data.suggestions ?? [],
    }
  } catch (error) {
    console.error('❌ Leafie backend proxy error:', error)

    // 🚑 FALLBACK TỐI GIẢN — KHÔNG TƯ DUY
    return {
      message:
        'Xin lỗi bạn nha, Leafie đang gặp trục trặc kỹ thuật. Bạn thử lại sau một chút giúp mình nhé 💛',
      suggestions: [],
    }
  }
}
