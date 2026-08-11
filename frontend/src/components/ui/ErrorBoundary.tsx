import { Component, type ErrorInfo, type ReactNode } from 'react'
import Button from './Button'
import { cn } from '../../lib/cn'

interface Props { children: ReactNode; fallback?: ReactNode; className?: string }
interface State { hasError: boolean }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }
  static getDerivedStateFromError(): State { return { hasError: true } }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error('Leaf Crème UI error', error, info) }
  render() {
    if (!this.state.hasError) return this.props.children
    return this.props.fallback || <div className={cn('mx-auto flex max-w-xl flex-col items-center px-6 py-20 text-center', this.props.className)} role="alert"><h1 className="text-h2">Có lỗi nhỏ xảy ra</h1><p className="mt-3 text-fg-muted">Trang này không tải được như mong muốn. Bạn có thể thử lại hoặc quay về trang chủ.</p><div className="mt-6 flex flex-wrap justify-center gap-3"><Button variant="primary" onClick={() => window.location.reload()}>Thử lại</Button><Button href="/" variant="outline">Về trang chủ</Button></div></div>
  }
}
