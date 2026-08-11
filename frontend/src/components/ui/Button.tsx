import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { cn } from '../../lib/cn'

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
export type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonOwnProps {
  children: ReactNode
  variant?: ButtonVariant
  size?: ButtonSize
  className?: string
}

type ButtonAsButton = ButtonOwnProps & ButtonHTMLAttributes<HTMLButtonElement> & { href?: undefined }
type ButtonAsAnchor = ButtonOwnProps & AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }
export type ButtonProps = ButtonAsButton | ButtonAsAnchor

const baseStyles = 'inline-flex min-h-11 items-center justify-center gap-2 whitespace-nowrap rounded-md border font-medium transition-[background-color,border-color,color,box-shadow,transform] duration-normal ease-out disabled:cursor-not-allowed disabled:opacity-50 hover:-translate-y-px motion-reduce:hover:translate-y-0'

const variantStyles: Record<ButtonVariant, string> = {
  primary: 'border-brand bg-brand text-fg-on-brand shadow-sm hover:border-brand-hover hover:bg-brand-hover focus-visible:ring-2 focus-visible:ring-focus',
  secondary: 'border-accent bg-accent text-fg-on-accent shadow-sm hover:border-accent-hover hover:bg-accent-hover focus-visible:ring-2 focus-visible:ring-focus',
  outline: 'border-interactive bg-bg-surface text-fg hover:bg-bg-subtle focus-visible:ring-2 focus-visible:ring-focus',
  ghost: 'border-transparent bg-transparent text-fg-muted hover:bg-bg-subtle hover:text-fg focus-visible:ring-2 focus-visible:ring-focus',
  danger: 'border-danger-solid bg-danger-solid text-danger-fg-on-solid hover:bg-danger focus-visible:ring-2 focus-visible:ring-danger',
}

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-3 text-sm',
  md: 'px-4 text-sm',
  lg: 'px-6 text-base',
}

export default function Button(props: ButtonProps) {
  const { children, variant = 'primary', size = 'md', className, ...rest } = props
  const classes = cn(baseStyles, variantStyles[variant], sizeStyles[size], className)

  if ('href' in props && typeof props.href === 'string') {
    const anchorProps = rest as AnchorHTMLAttributes<HTMLAnchorElement>
    delete anchorProps.href
    if (props.href.startsWith('/')) return <Link to={props.href} className={classes} {...anchorProps}>{children}</Link>
    return <a href={props.href} className={classes} {...anchorProps}>{children}</a>
  }

  return <button className={classes} {...(rest as ButtonHTMLAttributes<HTMLButtonElement>)}>{children}</button>
}
