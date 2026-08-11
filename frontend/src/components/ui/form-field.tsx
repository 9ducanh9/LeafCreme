import type { ReactNode } from 'react'
import Label from './label'

export default function FormField({ id, label, hint, error, children }: { id?: string; label?: string; hint?: string; error?: string; children: ReactNode }) {
  return <div className="w-full">{label && <Label htmlFor={id}>{label}</Label>}{children}{hint && <p className="mt-1.5 text-sm text-fg-subtle">{hint}</p>}{error && <p role="alert" className="mt-1.5 text-sm font-medium text-danger">{error}</p>}</div>
}
