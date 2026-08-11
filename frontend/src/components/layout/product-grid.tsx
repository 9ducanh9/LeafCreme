import { Children, type HTMLAttributes, type ReactNode } from 'react'
import { cn } from '../../lib/cn'

export default function ProductGrid({ className, columns = 'four', children, ...props }: HTMLAttributes<HTMLUListElement> & { columns?: 'three' | 'four'; children: ReactNode }) {
  const columnClasses = columns === 'three' ? 'lg:grid-cols-3' : 'lg:grid-cols-3 xl:grid-cols-4'
  return <ul className={cn('grid grid-cols-2 gap-5', columnClasses, className)} {...props}>{Children.map(children, (child, index) => <li key={child && typeof child === 'object' && 'key' in child && child.key != null ? String(child.key) : index} className="min-w-0">{child}</li>)}</ul>
}
