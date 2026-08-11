import { useEffect } from 'react'
import { useBlocker } from 'react-router-dom'

export function useUnsavedChanges(isDirty: boolean, message = 'Bạn có thay đổi chưa lưu. Rời trang?') {
  const blocker = useBlocker(isDirty)

  useEffect(() => {
    if (blocker.state === 'blocked' && window.confirm(message)) blocker.proceed()
    else if (blocker.state === 'blocked') blocker.reset()
  }, [blocker, message])

  useEffect(() => {
    const beforeunload = (event: BeforeUnloadEvent) => {
      if (!isDirty) return
      event.preventDefault()
      event.returnValue = message
    }
    window.addEventListener('beforeunload', beforeunload)
    return () => window.removeEventListener('beforeunload', beforeunload)
  }, [isDirty, message])

  return blocker
}
