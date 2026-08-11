import { cn } from '../../lib/cn'

export default function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div aria-hidden="true" className={cn('animate-pulse rounded-md bg-bg-inset', className)} {...props} />
}
