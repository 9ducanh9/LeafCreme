import { useCallback, useEffect, useRef } from 'react'

// Gõ vào ô tìm kiếm hiện tại bắn 1 request cho MỖI ký tự — "bánh mì" = 7
// request. Debounce delay bằng cách trì hoãn callback (patch URL + fetch),
// không phải giá trị hiển thị trên input — ô vẫn gõ mượt ngay lập tức.
export function useDebouncedCallback<Args extends unknown[]>(callback: (...args: Args) => void, delayMs = 400) {
  const callbackRef = useRef(callback)
  callbackRef.current = callback
  const timerRef = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => () => clearTimeout(timerRef.current), [])

  return useCallback((...args: Args) => {
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => callbackRef.current(...args), delayMs)
  }, [delayMs])
}
