import type { LabelHTMLAttributes } from 'react'
import { cn } from '../../lib/cn'

export default function Label({ className, children, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn('mb-2 block text-sm font-medium text-fg', className)} {...props}>{children}</label>
}
