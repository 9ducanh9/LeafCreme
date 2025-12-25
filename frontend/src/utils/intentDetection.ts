// Intent detection for Leafie chatbot
// Uses LLM-based classifier for semantic understanding

export type IntentLabel =
  | 'BEST_SELLER'
  | 'SIZE_RECOMMENDATION'
  | 'PRODUCT_RECOMMENDATION'
  | 'GIFT_BOX'
  | 'PREORDER'
  | 'VOUCHER'
  | 'GENERAL_INFO'
  | 'OTHER'

export interface IntentResult {
  intent: IntentLabel
  confidence: number // 0-1
  entities?: {
    peopleCount?: number
    occasion?: string
    productName?: string
    category?: string
  }
}

/**
 * Detect user intent using LLM-based classifier
 * Returns strict JSON format for reliable parsing
 */
export async function detectIntent(
  userMessage: string,
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = []
): Promise<IntentResult> {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY
  const model = import.meta.env.VITE_OPENAI_MODEL || 'gpt-3.5-turbo'

  // If no API key, use fallback keyword-based detection
  if (!apiKey) {
    return detectIntentFallback(userMessage, conversationHistory)
  }

  try {
    // Build context from conversation history
    const historyContext = conversationHistory
      .slice(-5) // Last 5 messages for context
      .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
      .join('\n')

    const prompt = `Bạn là một intent classifier cho chatbot bánh ngọt. Phân tích câu hỏi của user và trả về JSON chính xác.

INTENTS:
- BEST_SELLER: Hỏi về sản phẩm bán chạy, best seller, món được yêu thích
- SIZE_RECOMMENDATION: Hỏi về kích thước bánh cho số người
- PRODUCT_RECOMMENDATION: Yêu cầu gợi ý sản phẩm (không phải best seller)
- GIFT_BOX: Hỏi về hộp quà
- PREORDER: Hỏi về đặt trước
- VOUCHER: Hỏi về mã giảm giá, voucher
- GENERAL_INFO: Câu hỏi chung về tiệm bánh, dịch vụ
- OTHER: Khác

${historyContext ? `Lịch sử hội thoại:\n${historyContext}\n` : ''}
Câu hỏi hiện tại: "${userMessage}"

Trả về CHỈ JSON, không có text khác:
{
  "intent": "BEST_SELLER",
  "confidence": 0.95,
  "entities": {
    "peopleCount": 6,
    "occasion": "sinh nhật",
    "productName": null,
    "category": null
  }
}

Lưu ý:
- Nếu user hỏi "best seller", "bán chạy", "mọi người hay ăn" → BEST_SELLER
- Nếu user hỏi "kích thước cho X người" → SIZE_RECOMMENDATION
- Nếu user chỉ nói "trung thu", "sinh nhật" → PRODUCT_RECOMMENDATION (cần gợi ý)
- entities chỉ điền khi có thông tin rõ ràng`

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'system',
            content: 'You are a JSON-only intent classifier. Always return valid JSON, no other text.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3, // Lower temperature for more consistent classification
        max_tokens: 200,
        response_format: { type: 'json_object' }, // Force JSON response
      }),
    })

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`)
    }

    const data = await response.json()
    const jsonText = data.choices[0]?.message?.content || '{}'
    const result = JSON.parse(jsonText) as IntentResult

    // Validate and normalize result
    return {
      intent: result.intent || 'OTHER',
      confidence: Math.max(0, Math.min(1, result.confidence || 0.5)),
      entities: result.entities || {},
    }
  } catch (error) {
    console.error('Intent detection error, using fallback:', error)
    return detectIntentFallback(userMessage, conversationHistory)
  }
}

/**
 * Fallback keyword-based intent detection
 * Used when API is unavailable
 */
function detectIntentFallback(
  userMessage: string,
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = []
): IntentResult {
  const messageLower = userMessage.toLowerCase()
  const allMessages = [
    ...conversationHistory.map((m) => m.content.toLowerCase()),
    messageLower,
  ].join(' ')

  // BEST_SELLER patterns
  if (
    /best\s*seller|bán\s*chạy|yêu\s*thích|nổi\s*bật|mọi\s*người.*ăn|hay\s*ăn|phổ\s*biến/i.test(
      allMessages
    )
  ) {
    return {
      intent: 'BEST_SELLER',
      confidence: 0.9,
    }
  }

  // SIZE_RECOMMENDATION patterns
  if (
    /kích\s*thước|size|cho\s*\d+\s*người|\d+\s*người|bao\s*nhiêu\s*người/i.test(allMessages)
  ) {
    const peopleMatch = allMessages.match(/(\d+)\s*người/)
    return {
      intent: 'SIZE_RECOMMENDATION',
      confidence: 0.85,
      entities: {
        peopleCount: peopleMatch ? parseInt(peopleMatch[1]) : undefined,
      },
    }
  }

  // GIFT_BOX patterns
  if (/hộp\s*quà|gift\s*box|quà\s*tặng/i.test(allMessages)) {
    return {
      intent: 'GIFT_BOX',
      confidence: 0.9,
    }
  }

  // VOUCHER patterns
  if (/mã\s*giảm|voucher|giảm\s*giá|mã\s*khuyến\s*mãi/i.test(allMessages)) {
    return {
      intent: 'VOUCHER',
      confidence: 0.9,
    }
  }

  // PRODUCT_RECOMMENDATION (occasion-based)
  if (/trung\s*thu|sinh\s*nhật|kỷ\s*niệm|gợi\s*ý|tư\s*vấn/i.test(allMessages)) {
    const occasionMatch = allMessages.match(/(trung\s*thu|sinh\s*nhật|kỷ\s*niệm)/i)
    return {
      intent: 'PRODUCT_RECOMMENDATION',
      confidence: 0.8,
      entities: {
        occasion: occasionMatch ? occasionMatch[1] : undefined,
      },
    }
  }

  // Default
  return {
    intent: 'OTHER',
    confidence: 0.5,
  }
}

