// Price display component with elegant typography
interface PriceDisplayProps {
  price: number
  className?: string
  strikethrough?: boolean
}

export default function PriceDisplay({ price, className = '', strikethrough = false }: PriceDisplayProps) {
  // Format number with thousands separator
  const formattedNumber = new Intl.NumberFormat('vi-VN').format(price)
  
  const baseClasses = strikethrough 
    ? 'line-through text-text-secondary' 
    : 'text-text-primary'

  return (
    <span className={`${baseClasses} ${className}`}>
      <span className="font-body tracking-wide">{formattedNumber}</span>
      <span className="font-body text-[0.7em] font-normal opacity-70 ml-0.5"> ₫</span>
    </span>
  )
}

