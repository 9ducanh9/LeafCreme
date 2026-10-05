import { useEffect, useState } from 'react'
import { ArrowUpRight, CakeSlice } from 'lucide-react'
import { Link } from 'react-router-dom'
import { apiClient } from '../../services/api'
import { getImageUrl } from '../../utils/getImageUrl'
import type { LeafieProduct } from '../../types/leafie'

const money = (value: number) => `${new Intl.NumberFormat('vi-VN').format(value)} đ`

export default function LeafieProductCard({ product }: { product: LeafieProduct }) {
  const [image, setImage] = useState('')
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const selected = product.variants.find(variant => variant.id === selectedId)
  const available = selected?.available ?? product.available
  const href = product.kind === 'gift_box' ? `/gift-boxes/${product.id}` : `/products/${product.id}`

  useEffect(() => {
    let active = true
    setImage('')
    // Only fetch presentation data; chat prices and stock remain unchanged.
    void apiClient.get<{ hinh_anh_url?: string | null }>(href)
      .then(detail => { if (active && detail.hinh_anh_url) setImage(getImageUrl(detail.hinh_anh_url)) })
      .catch(() => { /* Keep the card usable without an image. */ })
    return () => { active = false }
  }, [href])

  return <article className="overflow-hidden rounded-[8px] border border-[#dfe6df] bg-[#fff]">
    <div className="flex gap-3 p-3">
      <div className="grid h-[76px] w-[72px] shrink-0 place-items-center overflow-hidden rounded bg-[#f3f6f1] text-[#85917f]">
        {image ? <img src={image} alt={product.name} className="size-full object-cover" loading="lazy" onError={() => setImage('')} /> : <CakeSlice className="size-6" aria-hidden="true" />}
      </div>
      <div className="min-w-0 flex-1">
        <Link to={href} className="text-xs font-semibold leading-5 text-[#28362c] hover:underline">{product.name}</Link>
        <p className={`mt-1 text-[11px] ${available === true ? 'text-[#337449]' : available === false ? 'text-[#985146]' : 'text-[#697469]'}`}>
          {available === true ? 'Còn hàng' : available === false ? 'Hết hàng' : 'Cần xác nhận tình trạng hàng'}
        </p>
        <p className="mt-2 text-[13px] font-semibold text-brand-fg">
          {!selected && product.variants.length > 1 ? 'Từ ' : ''}{money(selected?.price ?? product.price)}
          {selected?.size && <span className="ml-1 text-[10px] font-normal text-[#758071]">/ {selected.size}</span>}
        </p>
      </div>
    </div>
    {product.variants.length > 0 && <div className="flex flex-wrap gap-1.5 px-3 pb-3" role="group" aria-label={`Kích thước ${product.name}`}>
      {product.variants.map(variant => <button key={variant.id} type="button" aria-pressed={selectedId === variant.id}
        title={`${money(variant.price)} · ${variant.available ? 'Còn hàng' : 'Hết hàng'}`}
        onClick={() => setSelectedId(variant.id)}
        className={`rounded border px-2.5 py-1 text-[11px] focus-visible:ring-2 focus-visible:ring-focus ${selectedId === variant.id ? 'border-brand bg-brand-subtle text-brand-fg' : 'border-[#dfe6df] bg-[#fff] text-[#687366] hover:border-brand'}`}>
        {variant.size || 'Tiêu chuẩn'}
      </button>)}
    </div>}
    <Link to={href} className="flex items-center justify-between gap-2 border-t border-[#edf0ed] px-3 py-2.5 text-[11px] text-[#48564b] hover:bg-[#f6f9f5]">
      Xem chi tiết bánh <ArrowUpRight className="size-3.5" aria-hidden="true" />
    </Link>
  </article>
}
