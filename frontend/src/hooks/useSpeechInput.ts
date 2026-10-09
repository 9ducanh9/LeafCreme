import { useCallback, useEffect, useRef, useState } from 'react'

interface RecognitionResult {
  isFinal: boolean
  [index: number]: { transcript: string }
}

interface Recognition {
  lang: string
  continuous: boolean
  interimResults: boolean
  onstart: (() => void) | null
  onresult: ((event: { results: ArrayLike<RecognitionResult> }) => void) | null
  onerror: ((event: { error: string }) => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
  abort: () => void
}

type RecognitionConstructor = new () => Recognition
type VoiceWindow = Window & {
  SpeechRecognition?: RecognitionConstructor
  webkitSpeechRecognition?: RecognitionConstructor
}

function getRecognitionConstructor() {
  if (typeof window === 'undefined' || !window.isSecureContext) return undefined
  const voiceWindow = window as VoiceWindow
  return voiceWindow.SpeechRecognition || voiceWindow.webkitSpeechRecognition
}

function errorMessage(error: string) {
  switch (error) {
    case 'not-allowed':
    case 'service-not-allowed':
      return 'Chưa được phép dùng micro. Bạn bật quyền micro trong cài đặt trình duyệt rồi thử lại nhé.'
    case 'audio-capture':
      return 'Không tìm thấy micro. Bạn kiểm tra micro hoặc nhập bằng bàn phím nhé.'
    case 'no-speech':
      return 'Chưa nghe rõ lời nói. Bạn nhấn micro và thử nói lại nhé.'
    case 'network':
      return 'Không thể nhận giọng nói lúc này. Bạn kiểm tra kết nối mạng rồi thử lại nhé.'
    case 'language-not-supported':
      return 'Trình duyệt chưa hỗ trợ nhận giọng nói tiếng Việt. Bạn nhập bằng bàn phím nhé.'
    default:
      return 'Không thể nhận giọng nói. Bạn thử lại hoặc nhập bằng bàn phím nhé.'
  }
}

export function useSpeechInput(active: boolean, onTranscript: (text: string) => void) {
  const [supported] = useState(() => Boolean(getRecognitionConstructor()))
  const [status, setStatus] = useState<'idle' | 'starting' | 'listening' | 'stopping'>('idle')
  const [error, setError] = useState<string | null>(null)
  const recognitionRef = useRef<Recognition | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Detach callbacks before aborting so a closed panel cannot receive late results.
  const release = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = null
    const recognition = recognitionRef.current
    recognitionRef.current = null
    if (!recognition) return
    recognition.onstart = null
    recognition.onresult = null
    recognition.onerror = null
    recognition.onend = null
    try { recognition.abort() } catch { /* The browser may have already ended the session. */ }
  }, [])

  const cancel = useCallback(() => {
    release()
    setStatus('idle')
  }, [release])

  const stop = useCallback(() => {
    const recognition = recognitionRef.current
    if (!recognition) return
    recognition.onstart = null
    setStatus('stopping')
    if (timerRef.current) clearTimeout(timerRef.current)
    // Allow a final transcript, but do not leave the UI stuck if onend never arrives.
    timerRef.current = setTimeout(cancel, 3000)
    try { recognition.stop() } catch { cancel() }
  }, [cancel])

  const start = () => {
    const Constructor = getRecognitionConstructor()
    if (!active || !Constructor || recognitionRef.current) return
    setError(null)
    let recognition: Recognition
    try {
      recognition = new Constructor()
      recognitionRef.current = recognition
      recognition.lang = 'vi-VN'
      recognition.continuous = false
      recognition.interimResults = true
      recognition.onstart = () => {
        setStatus('listening')
        if (timerRef.current) clearTimeout(timerRef.current)
        timerRef.current = setTimeout(stop, 60000)
      }
      recognition.onresult = (event) => {
        const transcript = Array.from(event.results, (result) => result[0]?.transcript || '').join(' ').trim()
        if (transcript) onTranscript(transcript)
      }
      recognition.onerror = (event) => {
        if (event.error !== 'aborted') setError(errorMessage(event.error))
        cancel()
      }
      recognition.onend = cancel
      setStatus('starting')
      timerRef.current = setTimeout(() => {
        setError('Micro chưa khởi động được. Bạn thử lại hoặc nhập bằng bàn phím nhé.')
        cancel()
      }, 15000)
      // Call directly from the user's tap so mobile permission prompts can open.
      recognition.start()
    } catch {
      setError('Không thể mở micro. Bạn kiểm tra quyền micro rồi thử lại nhé.')
      cancel()
    }
  }

  useEffect(() => {
    if (!active) cancel()
  }, [active, cancel])

  useEffect(() => release, [release])

  useEffect(() => {
    const handleVisibility = () => { if (document.hidden) cancel() }
    document.addEventListener('visibilitychange', handleVisibility)
    window.addEventListener('pagehide', cancel)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility)
      window.removeEventListener('pagehide', cancel)
    }
  }, [cancel])

  return { supported, status, error, start, stop, cancel, recording: status !== 'idle' }
}
