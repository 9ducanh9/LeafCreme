import type { LeafieContext } from '../types/leafie'
import { LEAFIE_BACKEND_URL } from '../config/runtimeConfig'

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

export async function askLeafie(
  message: string,
  context: LeafieContext,
  conversationHistory: AskLeafieParams['conversationHistory']
): Promise<AskLeafieResponse> {
  try {
    const res = await fetch(LEAFIE_BACKEND_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        context,
        conversationHistory,
        sessionId: context.sessionId,
      }),
    })

    if (!res.ok) {
      const text = await res.text()
      throw new Error(`Backend error ${res.status}: ${text}`)
    }

    const data = await res.json()
    return {
      message: data.output ?? 'Leafie chưa trả lời được lúc này.',
      suggestions: data.suggestions ?? [],
    }
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('Leafie backend proxy error:', error)
    }

    return {
      message: 'Xin lỗi bạn, Leafie đang gặp trục trặc kỹ thuật. Bạn thử lại sau một chút nhé.',
      suggestions: [],
    }
  }
}
