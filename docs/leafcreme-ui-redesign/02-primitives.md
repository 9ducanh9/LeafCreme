# Spec 02 — Primitive component layer

> Phase 2. Rewrite toàn bộ `src/components/ui/*` trên Radix + CVA. Không sửa page nào.
> Nguyên tắc: **giữ nguyên tên export** để page cũ vẫn build được → migration không big-bang.

---

## 1. Hiện trạng

`src/components/ui/` có 13 file. Đánh giá từng cái:

| File | Trạng thái | Vấn đề chính |
|---|---|---|
| `Button.tsx` | Viết lại | Hex hardcode ×8, gradient, không có `size`, không `loading`, không `asChild`, không focus ring |
| `Input.tsx` | Viết lại | Label **không** gắn `htmlFor`/`id`, `focus:outline-none`, error dùng pink 1.64:1, không `aria-invalid`/`aria-describedby` |
| `Card.tsx` | Viết lại | Hex hardcode, gradient, `border-2`, không có slot header/body/footer, `onClick` trên div |
| `Badge.tsx` | Viết lại | 4 variant đều là gradient hardcode; không có variant semantic (success/warning/danger) |
| `Modal.tsx` | **Xoá** → Radix Dialog | Không focus trap, không Escape, không `role="dialog"`/`aria-modal`, không restore focus, backdrop click bằng `onClick` trên wrapper (bug: click vào scrollbar cũng đóng) |
| `Toast.tsx` + `ToastContainer.tsx` | **Xoá** → Radix Toast | Không `role="status"`, không swipe, không pause-on-hover |
| `ConfirmDialog.tsx` | Viết lại trên Radix AlertDialog | Dùng `Modal` cũ nên thừa hưởng hết lỗi trên. Đang được dùng ở 9 files → phải giữ API |
| `LoadingSpinner.tsx` | Viết lại | Không `role="status"`, không `aria-label`, không tôn trọng `prefers-reduced-motion` |
| `Skeleton.tsx` | Viết lại | **Dead code** — chỉ export trong barrel, 0 nơi dùng |
| `ErrorMessage.tsx` | Viết lại | Không `role="alert"` |
| `PriceDisplay.tsx` | Giữ, chỉnh nhẹ | Thiếu `font-variant-numeric: tabular-nums` → số tiền nhảy cột trong list |
| `DateInput.tsx` | **Xoá** | Thay bằng `DatePicker` trên `react-day-picker` (spec 05 §4) |

### Ba lỗi a11y nghiêm trọng cần nói rõ

#### `Modal.tsx` — không có focus management

```tsx
// Modal.tsx — không có dòng nào làm việc này:
// - focus trap  (Tab thoát ra ngoài modal được)
// - Escape để đóng
// - role="dialog" aria-modal="true"
// - aria-labelledby trỏ tới title
// - restore focus về trigger khi đóng
// - inert cho content phía sau
```

Với người dùng screen reader, modal này **không tồn tại như một modal** — nó chỉ là một div xuất hiện, và focus vẫn ở nút trigger phía sau. Radix Dialog xử lý cả 6 điểm.

Thêm một bug thật: backdrop click được implement bằng `onClick` trên wrapper `fixed inset-0` (dòng 44). Wrapper này bao cả modal content, nên phải dùng `stopPropagation` ở content (dòng 63). Hệ quả: mousedown trong modal rồi mouseup ra ngoài (thao tác select text bình thường) sẽ đóng modal. Radix dùng `onPointerDownOutside` nên không có lỗi này.

#### `Input.tsx` — label mồ côi

```tsx
{label && (
  <label className="block text-sm font-medium ...">   {/* KHÔNG có htmlFor */}
    {label}
  </label>
)}
<input ref={ref} ... {...props} />                     {/* id chỉ có nếu caller truyền */}
```

Click vào label không focus vào input. Screen reader không đọc label khi vào field. Đây là WCAG 1.3.1 fail, và giải thích con số 52 `<label>` / 33 `htmlFor` ở spec 00.

#### `Button.tsx` — không có `asChild`

Không có `asChild` nên không bọc được `<Link>` mà giữ style button. Đây là nguyên nhân trực tiếp của D5 (65 `navigate()` vs 2 `<Link>`): muốn nút trông giống button mà điều hướng được, cách dễ nhất là `<Button onClick={navigate}>`. Có `asChild` thì `<Button asChild><Link to="/x">…</Link></Button>` vừa đúng semantic vừa đúng style.

Sửa `Button` là điều kiện tiên quyết để sửa D5. Đây là lý do primitive phải làm trước page.

---

## 2. Kiến trúc primitive layer

```
src/components/ui/
├── index.ts                 barrel — giữ nguyên tên export cũ + thêm mới
├── button.tsx               CVA, asChild, loading, 5 variant × 4 size
├── input.tsx                + Label, FormField, HelperText, ErrorText
├── textarea.tsx             mới
├── select.tsx               Radix Select
├── checkbox.tsx             Radix Checkbox — mới
├── radio-group.tsx          Radix RadioGroup — mới (payment method ở Checkout)
├── switch.tsx               Radix Switch — mới
├── card.tsx                 compound: Card / CardHeader / CardBody / CardFooter / CardMedia
├── badge.tsx                CVA, 8 variant semantic
├── dialog.tsx               Radix Dialog — thay Modal
├── drawer.tsx               Radix Dialog + slide animation — cho CartDrawer, MobileNav
├── alert-dialog.tsx         Radix AlertDialog — thay ConfirmDialog
├── dropdown-menu.tsx        Radix DropdownMenu — thay user menu tự viết ở Header
├── popover.tsx              Radix Popover — thay ProductDropdown tự viết
├── tabs.tsx                 Radix Tabs
├── accordion.tsx            Radix Accordion
├── tooltip.tsx              Radix Tooltip
├── toast.tsx                Radix Toast — thay Toast/ToastContainer
├── skeleton.tsx             viết lại
├── spinner.tsx              viết lại (rename từ LoadingSpinner)
├── alert.tsx                inline message — thay ErrorMessage, mở rộng 4 variant
├── empty-state.tsx          chuyển từ components/layout, viết lại
├── price.tsx                từ PriceDisplay + tabular-nums
├── quantity-stepper.tsx     mới — dùng ở Cart, ProductDetail, CartDrawer
├── visually-hidden.tsx      re-export Radix
└── separator.tsx            mới
```

**Quy ước đặt tên file:** đổi sang `kebab-case` để khớp chuẩn cộng đồng Radix/shadcn và tránh lỗi case-sensitivity khi deploy Linux (dev trên Windows, deploy Linux — `Button.tsx` vs `button.tsx` là bug thật hay gặp).

Vì đổi tên file, `index.ts` phải re-export cả tên cũ:

```ts
// src/components/ui/index.ts
// --- Tên mới (dùng cho code mới) ---
export { Button, buttonVariants, type ButtonProps } from './button'
export { Input, Textarea, Label, FormField, HelperText, ErrorText } from './input'
export { Card, CardHeader, CardTitle, CardDescription, CardMedia, CardBody, CardFooter } from './card'
export { Badge, badgeVariants } from './badge'
export { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle,
         DialogDescription, DialogFooter, DialogClose } from './dialog'
export { Drawer, DrawerTrigger, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter } from './drawer'
export { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogTitle,
         AlertDialogDescription, AlertDialogAction, AlertDialogCancel } from './alert-dialog'
export { Select, SelectItem } from './select'
export { Checkbox } from './checkbox'
export { RadioGroup, RadioGroupItem, RadioCard } from './radio-group'
export { Switch } from './switch'
export { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
         DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel } from './dropdown-menu'
export { Popover, PopoverTrigger, PopoverContent } from './popover'
export { Tabs, TabsList, TabsTrigger, TabsContent } from './tabs'
export { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from './accordion'
export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from './tooltip'
export { Toaster, useToast } from './toast'
export { Skeleton, SkeletonText, SkeletonCard } from './skeleton'
export { Spinner } from './spinner'
export { Alert, AlertTitle, AlertDescription } from './alert'
export { EmptyState } from './empty-state'
export { Price } from './price'
export { QuantityStepper } from './quantity-stepper'
export { Separator } from './separator'
export { VisuallyHidden } from './visually-hidden'

// --- Alias tương thích ngược: giữ để page cũ còn build được.
//     XOÁ sau khi phase 6 xong. grep -c "từ alias" = thước đo tiến độ. ---
/** @deprecated dùng Spinner */      export { Spinner as LoadingSpinner } from './spinner'
/** @deprecated dùng Alert */        export { Alert as ErrorMessage } from './alert'
/** @deprecated dùng Price */        export { Price as PriceDisplay } from './price'
/** @deprecated dùng Dialog */       export { LegacyModal as Modal } from './legacy-modal'
/** @deprecated dùng AlertDialog */  export { LegacyConfirmDialog as ConfirmDialog } from './legacy-modal'
```

`legacy-modal.tsx` là adapter mỏng: nhận API cũ (`isOpen`, `onClose`, `title`, `footer`, `size`) và render Radix Dialog bên dưới. Nhờ vậy 9 files đang dùng `ConfirmDialog` không phải sửa ngay trong phase 2, mà vẫn được hưởng focus trap + Escape ngay lập tức.

Đây là điểm quan trọng của chiến lược: **a11y fix có hiệu lực ở phase 2, không phải chờ tới phase 6.**

---

## 3. `button.tsx`

```tsx
import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/cn'

const buttonVariants = cva(
  [
    'inline-flex items-center justify-center gap-2 whitespace-nowrap',
    'font-medium rounded-md',
    'transition-colors duration-fast ease-out',
    // Focus ring: KHÔNG dùng focus:outline-none. Dùng ring để có offset đẹp
    // trên nền tối, đồng thời vẫn giữ outline fallback từ :focus-visible toàn cục.
    'outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2',
    'focus-visible:ring-offset-bg-canvas',
    'disabled:pointer-events-none disabled:opacity-50',
    // Icon con luôn co giãn đúng, không cần set size ở mỗi chỗ dùng
    "[&_svg]:size-4 [&_svg]:shrink-0",
  ],
  {
    variants: {
      variant: {
        primary:   'bg-brand text-fg-on-brand hover:bg-brand-hover active:bg-brand-active shadow-xs',
        secondary: 'bg-bg-surface text-fg border border-border-interactive hover:bg-bg-surface-hover shadow-xs',
        accent:    'bg-accent text-fg-on-accent hover:bg-accent-hover shadow-xs',
        ghost:     'text-fg-muted hover:bg-bg-subtle hover:text-fg',
        link:      'text-brand-fg underline-offset-4 hover:underline p-0 h-auto',
        danger:    'bg-danger-solid text-danger-fg-on-solid hover:bg-danger shadow-xs',
      },
      size: {
        sm:   'h-9  px-3 text-sm',
        md:   'h-11 px-4 text-sm',      // 44px — đạt WCAG 2.5.8 target size tối thiểu
        lg:   'h-12 px-6 text-base',
        icon: 'size-11',                // 44×44, KHÔNG phải 36×36
      },
      fullWidth: { true: 'w-full' },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  /** Render con thay vì <button>. Dùng để bọc <Link> mà giữ style button. */
  asChild?: boolean
  /** Hiện spinner + disable. Nội dung giữ nguyên để không nhảy layout. */
  loading?: boolean
  /** Text screen reader đọc khi loading. Mặc định "Đang xử lý". */
  loadingText?: string
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, fullWidth, asChild = false,
     loading = false, loadingText = 'Đang xử lý', disabled, children, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size, fullWidth }), className)}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        {...props}
      >
        {loading && (
          <>
            <Loader2 className="animate-spin motion-reduce:animate-none" aria-hidden />
            <span className="sr-only">{loadingText}</span>
          </>
        )}
        {children}
      </Comp>
    )
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }
```

### Quyết định thiết kế cần giải thích

**Bỏ gradient.** `Button` cũ dùng `bg-gradient-to-r from-[#C59B72] to-[#D4A574]` cho primary. Bỏ vì: (1) gradient trên nút nhỏ không ai nhìn thấy, chỉ tốn CSS; (2) rất khó giữ contrast nhất quán vì contrast thay đổi theo vị trí; (3) 4 variant × 2 màu gradient × 3 state = 24 hex phải bảo trì tay. Màu phẳng: 1 token/state.

**`size: md` cao 44px, không phải 36px.** WCAG 2.5.8 (AAA ở 2.1, AA ở 2.2) yêu cầu target ≥ 24×24 CSS px, guideline mobile thực tế là 44×44. Button cũ `px-6 py-3` với text 16px ≈ 48px — tình cờ đúng. Đừng làm nhỏ lại khi redesign.

**`loading` giữ nguyên `children`.** Nhiều implementation thay children bằng spinner → nút co lại → layout nhảy → người dùng mất chỗ. Ở đây spinner thêm vào bên cạnh, `aria-busy` cho AT biết, `sr-only` text mô tả.

**Không có `variant: outline`.** `secondary` đã là bordered. Có cả `outline` và `secondary` chỉ tạo tranh luận vô nghĩa lúc dùng. Migration: `variant="outline"` cũ → `variant="secondary"`.

### Bảng map variant cũ → mới

| Cũ | Mới | Chỗ cần sửa |
|---|---|---|
| `variant="primary"` | `variant="primary"` | không đổi |
| `variant="secondary"` (vàng) | `variant="accent"` | grep `variant="secondary"` — kiểm tra từng chỗ, vàng cũ dùng cho CTA phụ |
| `variant="outline"` | `variant="secondary"` | sed được |
| `variant="ghost"` | `variant="ghost"` | không đổi |

---

## 4. `input.tsx` — kèm FormField giải quyết label mồ côi

```tsx
import * as React from 'react'
import { cn } from '@/lib/cn'

/* ------------------------------------------------------------------
   FormField: sinh id một lần, phát cho Label / Input / Helper / Error
   qua context. Đây là fix gốc cho D6 (19 label mồ côi) — không thể
   quên htmlFor nữa vì nó không còn do người viết truyền tay.
   ------------------------------------------------------------------ */
interface FieldCtx {
  id: string
  descriptionId: string
  errorId: string
  hasError: boolean
  required: boolean
}
const FieldContext = React.createContext<FieldCtx | null>(null)

function useField() {
  const ctx = React.useContext(FieldContext)
  if (!ctx) throw new Error('Input/Label/ErrorText phải nằm trong <FormField>')
  return ctx
}

export function FormField({
  children, error, required = false, className,
}: {
  children: React.ReactNode
  error?: string | boolean
  required?: boolean
  className?: string
}) {
  const uid = React.useId()
  const value: FieldCtx = {
    id: `${uid}-field`,
    descriptionId: `${uid}-desc`,
    errorId: `${uid}-err`,
    hasError: Boolean(error),
    required,
  }
  return (
    <FieldContext.Provider value={value}>
      <div className={cn('flex w-full flex-col gap-2', className)}>
        {children}
        {typeof error === 'string' && error && <ErrorText>{error}</ErrorText>}
      </div>
    </FieldContext.Provider>
  )
}

export function Label({ children, className, ...props }: React.ComponentProps<'label'>) {
  const { id, required } = useField()
  return (
    <label htmlFor={id} className={cn('text-sm font-medium text-fg', className)} {...props}>
      {children}
      {required && (
        <>
          <span aria-hidden className="ml-1 text-danger">*</span>
          <span className="sr-only"> (bắt buộc)</span>
        </>
      )}
    </label>
  )
}

const controlBase = [
  'w-full rounded-md bg-bg-surface px-4 text-base text-fg',
  'border border-border-interactive',           // 3.32:1 — đạt WCAG 1.4.11
  'placeholder:text-fg-subtle',                 // 5.06:1 — placeholder phải đọc được
  'transition-[border-color,box-shadow] duration-fast ease-out',
  'outline-none focus-visible:border-brand focus-visible:ring-2',
  'focus-visible:ring-focus focus-visible:ring-offset-0',
  'disabled:cursor-not-allowed disabled:bg-bg-inset disabled:text-fg-disabled',
  'aria-[invalid=true]:border-danger aria-[invalid=true]:ring-danger',
]

export const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<'input'>>(
  ({ className, ...props }, ref) => {
    const { id, descriptionId, errorId, hasError, required } = useField()
    return (
      <input
        ref={ref}
        id={id}
        required={required}
        aria-invalid={hasError || undefined}
        aria-describedby={cn(hasError && errorId, descriptionId) || undefined}
        className={cn(controlBase, 'h-11', className)}
        {...props}
      />
    )
  }
)
Input.displayName = 'Input'

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<'textarea'>>(
  ({ className, rows = 4, ...props }, ref) => {
    const { id, descriptionId, errorId, hasError, required } = useField()
    return (
      <textarea
        ref={ref}
        id={id}
        rows={rows}
        required={required}
        aria-invalid={hasError || undefined}
        aria-describedby={cn(hasError && errorId, descriptionId) || undefined}
        className={cn(controlBase, 'py-3 resize-y min-h-24', className)}
        {...props}
      />
    )
  }
)
Textarea.displayName = 'Textarea'

export function HelperText({ children, className }: React.ComponentProps<'p'>) {
  const { descriptionId } = useField()
  return <p id={descriptionId} className={cn('text-sm text-fg-subtle', className)}>{children}</p>
}

export function ErrorText({ children, className }: React.ComponentProps<'p'>) {
  const { errorId } = useField()
  return (
    // role="alert" + aria-live: AT đọc ngay khi lỗi xuất hiện, không cần re-focus
    <p id={errorId} role="alert" aria-live="polite"
       className={cn('flex items-start gap-1.5 text-sm font-medium text-danger', className)}>
      {children}
    </p>
  )
}
```

### Cách dùng

```tsx
<FormField error={errors.email} required>
  <Label>Email</Label>
  <Input type="email" autoComplete="email" placeholder="ban@example.com" />
  <HelperText>Dùng để nhận xác nhận đơn hàng.</HelperText>
</FormField>
```

Không có cách nào để quên `htmlFor` — nó do context sinh. Không có cách nào để `aria-describedby` trỏ sai id. Đây là kiểu API mà lỗi a11y trở thành **không biểu diễn được**, thay vì "nhớ thì làm".

**Lỗi báo bằng 2 kênh, không chỉ màu.** WCAG 1.4.1 (Use of Color): không được truyền thông tin **chỉ** bằng màu. Nên error state = border đỏ **+** ring đỏ **+** text mô tả **+** `aria-invalid`. Border đỏ một mình là fail.

---

## 5. `dialog.tsx` + `drawer.tsx`

```tsx
// dialog.tsx
import * as React from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { cn } from '@/lib/cn'

export const Dialog = DialogPrimitive.Root
export const DialogTrigger = DialogPrimitive.Trigger
export const DialogClose = DialogPrimitive.Close

function Overlay({ className, ...props }: DialogPrimitive.DialogOverlayProps) {
  return (
    <DialogPrimitive.Overlay
      className={cn(
        'fixed inset-0 z-overlay bg-bg-overlay',
        'data-[state=open]:animate-fade-in',
        className
      )}
      {...props}
    />
  )
}

export const DialogContent = React.forwardRef<
  HTMLDivElement,
  DialogPrimitive.DialogContentProps & { size?: 'sm' | 'md' | 'lg' | 'xl'; hideClose?: boolean }
>(({ className, children, size = 'md', hideClose, ...props }, ref) => (
  <DialogPrimitive.Portal>
    <Overlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        'fixed left-1/2 top-1/2 z-modal -translate-x-1/2 -translate-y-1/2',
        'flex max-h-[min(90dvh,44rem)] w-[calc(100vw-2rem)] flex-col',
        'rounded-xl border border-border bg-bg-surface shadow-xl',
        'data-[state=open]:animate-scale-in',
        { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' }[size],
        className
      )}
      {...props}
    >
      {children}
      {!hideClose && (
        <DialogPrimitive.Close
          className={cn(
            'absolute right-4 top-4 grid size-9 place-items-center rounded-md',
            'text-fg-subtle transition-colors hover:bg-bg-subtle hover:text-fg',
            'outline-none focus-visible:ring-2 focus-visible:ring-focus'
          )}
        >
          <X className="size-5" aria-hidden />
          <span className="sr-only">Đóng</span>
        </DialogPrimitive.Close>
      )}
    </DialogPrimitive.Content>
  </DialogPrimitive.Portal>
))
DialogContent.displayName = 'DialogContent'

export function DialogHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('flex flex-col gap-1.5 border-b border-border-subtle p-6 pr-14', className)} {...props} />
}
/** BẮT BUỘC có trong mọi Dialog. Radix warn ở dev nếu thiếu — đừng bỏ qua warning đó. */
export const DialogTitle = React.forwardRef<HTMLHeadingElement, DialogPrimitive.DialogTitleProps>(
  ({ className, ...props }, ref) => (
    <DialogPrimitive.Title ref={ref} className={cn('font-heading text-xl font-semibold text-fg-strong', className)} {...props} />
  )
)
DialogTitle.displayName = 'DialogTitle'

export const DialogDescription = React.forwardRef<HTMLParagraphElement, DialogPrimitive.DialogDescriptionProps>(
  ({ className, ...props }, ref) => (
    <DialogPrimitive.Description ref={ref} className={cn('text-sm text-fg-muted', className)} {...props} />
  )
)
DialogDescription.displayName = 'DialogDescription'

export function DialogBody({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('flex-1 overflow-y-auto overscroll-contain p-6', className)} {...props} />
}
export function DialogFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('flex flex-col-reverse gap-3 border-t border-border-subtle p-6 sm:flex-row sm:justify-end', className)} {...props} />
}
```

**`flex-col-reverse` trên mobile ở Footer là cố ý.** Trên desktop thứ tự DOM là `[Huỷ] [Xác nhận]` (xác nhận bên phải, đúng quy ước phương Tây). Trên mobile stack dọc, action chính phải ở **trên** để ngón tay chạm dễ và mắt thấy trước → `flex-col-reverse` cho đúng thị giác mà **không** đổi thứ tự DOM (nên thứ tự Tab vẫn logic).

```tsx
// drawer.tsx — dùng cho CartDrawer + MobileNav (spec 03)
export const DrawerContent = React.forwardRef<
  HTMLDivElement,
  DialogPrimitive.DialogContentProps & { side?: 'left' | 'right' | 'bottom' }
>(({ className, children, side = 'right', ...props }, ref) => (
  <DialogPrimitive.Portal>
    <Overlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        'fixed z-modal flex flex-col bg-bg-surface shadow-xl',
        {
          right:  'inset-y-0 right-0 h-full w-full max-w-md border-l data-[state=open]:animate-slide-in-right',
          left:   'inset-y-0 left-0  h-full w-[85vw] max-w-sm border-r data-[state=open]:animate-slide-in-left',
          bottom: 'inset-x-0 bottom-0 max-h-[85dvh] rounded-t-xl border-t data-[state=open]:animate-slide-up',
        }[side],
        'border-border',
        className
      )}
      {...props}
    >
      {children}
    </DialogPrimitive.Content>
  </DialogPrimitive.Portal>
))
```

**Dùng `dvh` không dùng `vh`.** Trên mobile Safari/Chrome, `100vh` tính cả vùng bị thanh địa chỉ che → drawer bị cắt đáy, nút "Thanh toán" ở cuối CartDrawer không bấm được. `dvh` (dynamic viewport height) fix đúng bug này. Đây là lỗi rất hay gặp và rất khó phát hiện trên desktop DevTools.

`overscroll-contain` trên `DialogBody`: chặn scroll chaining — scroll hết body của modal thì không kéo theo trang phía sau.

---

## 6. `card.tsx` — compound, và giải quyết card-clickable

```tsx
import * as React from 'react'
import { cn } from '@/lib/cn'

export function Card({ className, interactive, ...props }: React.ComponentProps<'div'> & { interactive?: boolean }) {
  return (
    <div
      className={cn(
        'relative flex flex-col overflow-hidden rounded-lg border border-border bg-bg-surface',
        interactive && [
          'transition-[box-shadow,transform] duration-normal ease-out',
          'hover:shadow-md hover:-translate-y-0.5',
          'motion-reduce:hover:translate-y-0',
          // ring khi link con bên trong được focus — xem §6.1
          'focus-within:ring-2 focus-within:ring-focus focus-within:ring-offset-2',
        ],
        className
      )}
      {...props}
    />
  )
}

export function CardMedia({ className, ratio = 'product', ...props }: React.ComponentProps<'div'> & { ratio?: 'product' | 'hero' | 'square' }) {
  return (
    <div className={cn(
      'relative w-full overflow-hidden bg-bg-inset',
      { product: 'aspect-product', hero: 'aspect-hero', square: 'aspect-square' }[ratio],
      className
    )} {...props} />
  )
}

export const CardHeader = (p: React.ComponentProps<'div'>) => <div {...p} className={cn('flex flex-col gap-1.5 p-5', p.className)} />
export const CardTitle  = (p: React.ComponentProps<'h3'>)  => <h3  {...p} className={cn('font-heading text-lg font-semibold text-fg-strong', p.className)} />
export const CardDescription = (p: React.ComponentProps<'p'>) => <p {...p} className={cn('text-sm text-fg-muted', p.className)} />
export const CardBody   = (p: React.ComponentProps<'div'>) => <div {...p} className={cn('flex flex-1 flex-col gap-3 px-5 pb-5', p.className)} />
export const CardFooter = (p: React.ComponentProps<'div'>) => <div {...p} className={cn('flex items-center gap-3 border-t border-border-subtle p-5', p.className)} />
```

### 6.1 Fix D13 — card clickable đúng cách

`ProductCard.tsx:20` hiện tại:

```tsx
// SAI
<Card className="cursor-pointer" onClick={() => navigate(`/products/${id}`)}>
  ...
  <Button onClick={(e) => { e.stopPropagation(); navigate(...) }}>Xem chi tiết</Button>
</Card>
```

Ba lỗi cùng lúc: `<div>` không focus được bằng bàn phím (WCAG 2.1.1), không phải link nên không mở tab mới được, và `<button>` lồng trong vùng clickable buộc phải `stopPropagation` — mong manh.

**Pattern đúng — "stretched link":** vùng click là một `<a>` thật, phủ lên card bằng pseudo-element.

```tsx
<Card interactive>
  <CardMedia>
    <img src={...} alt={product.ten} className="size-full object-cover" loading="lazy" />
  </CardMedia>
  <CardBody>
    <CardTitle>
      {/* Link duy nhất phủ toàn card. z-raised để nằm trên media.
          Focus vào link này → Card có focus-within ring (xem trên). */}
      <a
        href={`/products/${product.sanpham_id}`}
        className="outline-none after:absolute after:inset-0 after:z-raised after:content-['']"
      >
        {product.ten}
      </a>
    </CardTitle>
    <CardDescription className="line-clamp-2">{product.mo_ta}</CardDescription>
  </CardBody>
  <CardFooter className="justify-between">
    <Price value={product.gia_co_ban} />
    {/* Nút phụ phải nổi TRÊN pseudo-element → relative z-sticky. Không cần stopPropagation. */}
    <Button size="sm" variant="secondary" className="relative z-sticky" onClick={addToCart}>
      Thêm vào giỏ
    </Button>
  </CardFooter>
</Card>
```

Kết quả: 1 link duy nhất trong tab order (không phải 2 như bản `<div onClick>` + `<Button>`), ctrl+click mở tab mới được, screen reader đọc đúng tên sản phẩm làm link text, và nút "Thêm vào giỏ" hoạt động độc lập không cần `stopPropagation`.

Với react-router, thay `<a href>` bằng `<Link to>` — chi tiết ở spec 04.

---

## 7. `badge.tsx`

```tsx
const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium whitespace-nowrap [&_svg]:size-3',
  {
    variants: {
      variant: {
        neutral: 'bg-bg-inset text-fg-muted',
        brand:   'bg-brand-subtle text-brand-fg ring-1 ring-inset ring-brand-border-subtle',
        accent:  'bg-accent-subtle text-accent-fg',
        success: 'bg-success-bg text-success',
        warning: 'bg-warning-bg text-warning',
        danger:  'bg-danger-bg text-danger',
        info:    'bg-info-bg text-info',
        solid:   'bg-brand text-fg-on-brand',
      },
      size: { sm: 'text-2xs px-1.5', md: 'text-xs px-2 py-0.5' },
    },
    defaultVariants: { variant: 'neutral', size: 'md' },
  }
)
```

Map cũ → mới: `default`/`yellow` → `warning` hoặc `brand` (tuỳ ngữ nghĩa từng chỗ, **phải xem từng chỗ**, không sed máy móc); `pink` → `danger` nếu đang báo lỗi, `accent` nếu chỉ trang trí; `brown` → `solid`.

Badge dùng cho tín hiệu tồn kho/độ tươi ở spec 04 §3 — đó là lý do cần đủ 4 variant semantic.

---

## 8. `toast.tsx` — thay ToastContext tự viết

Radix Toast cho sẵn: `role="status"` + `aria-live="polite"`, swipe-to-dismiss, pause khi hover/focus, hotkey F8 để nhảy tới toast region, và quan trọng nhất là **không đánh cắp focus** (toast đánh cắp focus là lỗi a11y nghiêm trọng vì làm mất chỗ người dùng đang gõ).

Giữ nguyên API của `useToast()` hiện tại để `contexts/ToastContext.tsx` chỉ cần đổi ruột:

```tsx
// Giữ được chữ ký này thì các call site không phải sửa
const { toast } = useToast()
toast({ title: 'Đã thêm vào giỏ', variant: 'success' })
toast({ title: 'Lỗi', description: 'Không đủ hàng trong kho', variant: 'danger' })
```

**Quy tắc dùng toast (viết vào spec để không lạm dụng):**

- Toast dùng cho việc **đã xong** và không cần hành động: "Đã thêm vào giỏ", "Đã lưu".
- Toast **không** dùng cho lỗi validation form — lỗi form phải hiện cạnh field (`ErrorText`), vì toast biến mất trước khi người dùng sửa xong.
- Toast **không** dùng cho lỗi cần retry — dùng `Alert` inline có nút retry.
- Tối đa 3 toast cùng lúc, `duration` 5000ms, lỗi thì `duration: Infinity` + nút đóng.

---

## 9. `quantity-stepper.tsx` — component mới, đáng có

Dùng ở `CartPage`, `CartDrawer`, `ProductDetailPage`, `GiftBoxDetailPage`. Hiện tại mỗi chỗ tự viết `- [n] +` bằng button + input rời.

```tsx
export function QuantityStepper({
  value, onChange, min = 1, max, label = 'Số lượng', disabled,
}: {
  value: number
  onChange: (v: number) => void
  min?: number
  max?: number          // ← truyền tồn kho khả dụng vào đây. Xem spec 04 §3.
  label?: string
  disabled?: boolean
}) {
  const atMax = max !== undefined && value >= max
  return (
    <div className="inline-flex items-center rounded-md border border-border-interactive">
      <button type="button" onClick={() => onChange(Math.max(min, value - 1))}
        disabled={disabled || value <= min}
        className="grid size-11 place-items-center rounded-l-md text-fg-muted hover:bg-bg-subtle disabled:text-fg-disabled outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-inset">
        <Minus className="size-4" aria-hidden />
        <span className="sr-only">Giảm {label.toLowerCase()}</span>
      </button>

      <input
        type="text" inputMode="numeric" pattern="[0-9]*"
        role="spinbutton"
        aria-label={label}
        aria-valuenow={value} aria-valuemin={min} aria-valuemax={max}
        value={value}
        onChange={(e) => {
          const n = parseInt(e.target.value.replace(/\D/g, ''), 10)
          if (!Number.isNaN(n)) onChange(Math.min(max ?? Infinity, Math.max(min, n)))
        }}
        className="h-11 w-12 border-x border-border-interactive bg-transparent text-center text-base font-medium tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-inset"
      />

      <button type="button" onClick={() => onChange(value + 1)}
        disabled={disabled || atMax}
        aria-describedby={atMax ? 'qty-max-hint' : undefined}
        className="grid size-11 place-items-center rounded-r-md text-fg-muted hover:bg-bg-subtle disabled:text-fg-disabled outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-inset">
        <Plus className="size-4" aria-hidden />
        <span className="sr-only">Tăng {label.toLowerCase()}</span>
      </button>

      {atMax && (
        <span id="qty-max-hint" className="sr-only">
          Đã đạt số lượng tối đa còn trong kho: {max}
        </span>
      )}
    </div>
  )
}
```

**`inputMode="numeric"` + `type="text"`, không phải `type="number"`.** `type="number"` có 3 vấn đề: spinner mặc định của browser xấu và không style được nhất quán, scroll wheel vô tình đổi giá trị, và trên Safari nhập được `e`/`+`/`-`. `type="text"` + `inputMode` cho bàn phím số trên mobile mà không có tác dụng phụ.

**`max` nhận tồn kho khả dụng.** Đây là điểm nối giữa primitive layer và fix D14 — không cho tăng vượt số batch còn dùng được, và giải thích bằng `sr-only` text khi bị chặn. Chi tiết ở spec 04.

---

## 10. Files phải sửa

### Xoá
| File | Lý do |
|---|---|
| `src/components/ui/Modal.tsx` | Thay bằng `dialog.tsx` + adapter `legacy-modal.tsx` |
| `src/components/ui/Toast.tsx` | Thay bằng `toast.tsx` |
| `src/components/ui/ToastContainer.tsx` | Radix `Toaster` |
| `src/components/ui/DateInput.tsx` | Thay bằng `date-picker.tsx` (spec 05) |
| `src/components/layout/LayoutShell.tsx` | Dead code (spec 00) |
| `src/components/layout/SectionContainer.tsx` | Thay bằng `Container`/`Section` (spec 03) |
| `src/components/layout/SectionHeader.tsx` | Thay bằng `SectionHeader` mới (spec 03) |

### Tạo mới
`button.tsx`, `input.tsx`, `textarea.tsx`, `select.tsx`, `checkbox.tsx`, `radio-group.tsx`, `switch.tsx`, `card.tsx`, `badge.tsx`, `dialog.tsx`, `drawer.tsx`, `alert-dialog.tsx`, `dropdown-menu.tsx`, `popover.tsx`, `tabs.tsx`, `accordion.tsx`, `tooltip.tsx`, `toast.tsx`, `skeleton.tsx`, `spinner.tsx`, `alert.tsx`, `empty-state.tsx`, `price.tsx`, `quantity-stepper.tsx`, `separator.tsx`, `visually-hidden.tsx`, `legacy-modal.tsx` — tất cả trong `src/components/ui/`.

### Sửa
| File | Việc |
|---|---|
| `src/components/ui/index.ts` | Barrel mới + alias deprecated (§2) |
| `src/contexts/ToastContext.tsx` | Đổi ruột sang Radix Toast, giữ chữ ký `useToast()` |
| `src/App.tsx` | Bọc `<TooltipProvider>` và `<Toaster />`; xoá `<ToastContainer />` |
| Xoá file cũ `Button.tsx`, `Input.tsx`, `Card.tsx`, `Badge.tsx`, `Skeleton.tsx`, `LoadingSpinner.tsx`, `ErrorMessage.tsx`, `ConfirmDialog.tsx`, `PriceDisplay.tsx` | Thay bằng bản kebab-case |

**Cẩn thận với case-insensitive filesystem:** Windows/macOS coi `Button.tsx` và `button.tsx` là **cùng một file**. Đổi tên trực tiếp sẽ bị git bỏ qua. Phải làm 2 bước:

```bash
git mv src/components/ui/Button.tsx src/components/ui/button-tmp.tsx
git mv src/components/ui/button-tmp.tsx src/components/ui/button.tsx
```

Bỏ qua bước này → build pass ở local, fail trên CI Linux. Lỗi kinh điển.

---

## 11. Acceptance criteria

### Build & type
- [ ] `npm run build` pass, không lỗi TypeScript
- [ ] `npm run check:contrast` pass
- [ ] `grep -rEn '#[0-9a-fA-F]{6}' src/components/ui` → **0 kết quả**
- [ ] `grep -rn 'focus:outline-none' src/components/ui` → **0 kết quả**
- [ ] `git log --follow src/components/ui/button.tsx` cho thấy rename 2 bước (không mất history)

### A11y — kiểm bằng bàn phím, không chỉ bằng mắt
- [ ] Mở Dialog → focus tự vào phần tử focus được đầu tiên bên trong
- [ ] Trong Dialog, Tab đi hết vòng rồi quay lại element đầu (**không** thoát ra sau modal)
- [ ] Escape đóng Dialog; focus **quay về đúng nút trigger**
- [ ] Shift+Tab từ element đầu của Dialog → về element cuối, không ra ngoài
- [ ] Drawer trên iOS Safari thật (hoặc simulator): nút cuối drawer **bấm được**, không bị thanh địa chỉ che
- [ ] `<FormField>` + `<Label>` → click label focus vào input
- [ ] NVDA/VoiceOver vào input có error → đọc label, rồi đọc nội dung lỗi
- [ ] Toast xuất hiện → focus **không** bị đánh cắp khỏi field đang gõ
- [ ] `QuantityStepper`: nhập tay số lớn hơn `max` → tự kẹp về `max`
- [ ] Tab qua `ProductCard` mới: **đúng 2 stop** (link sản phẩm, nút thêm giỏ) — không phải 3+
- [ ] Ctrl+click vào ProductCard → mở tab mới thật

### Visual regression
- [ ] Screenshot storefront trước/sau phase 2 và diff — kỳ vọng: chỉ đổi ở Button/Input/Card/Badge, không page nào vỡ layout
- [ ] Bật `prefers-reduced-motion` → Dialog/Drawer xuất hiện không animation, không bị kẹt state

### Bundle
- [ ] `npx vite-bundle-visualizer` — so với baseline ở spec 00; kỳ vọng chưa giảm (MUI vẫn còn cho admin), nhưng **không tăng** quá 20KB gzip

---

## TL;DR

- `Modal.tsx` tự viết thiếu cả 6 thứ của một dialog đúng (focus trap, Escape, `role`, `aria-modal`, restore focus, inert) + có bug thật: select text kéo ra ngoài là modal đóng. Radix Dialog xử lý hết.
- `FormField` dùng `useId()` + context để **sinh** `htmlFor`/`aria-describedby` → lỗi a11y trở thành không biểu diễn được, thay vì "nhớ thì làm". Đây là fix gốc cho 19 label mồ côi.
- `Button` có `asChild` là **điều kiện tiên quyết** để sửa D5 (65 `navigate()` vs 2 `<Link>`) — không có nó thì không ai bọc `<Link>` mà giữ style button được.
- Card clickable dùng **stretched-link** (`after:absolute after:inset-0`), không dùng `<div onClick>`: 1 tab stop, ctrl+click được, không cần `stopPropagation`.
- Giữ alias `@deprecated` trong barrel → a11y fix có hiệu lực ngay phase 2, không phải chờ tới phase 6.
- Dùng `dvh` không dùng `vh` cho drawer — `100vh` trên mobile Safari làm nút cuối drawer không bấm được.
- Rename file phải đi qua tên trung gian, không thì git bỏ qua và CI Linux vỡ.
