// Inventory service for admin panel
// Uses real backend APIs only (no local/mock fallback).
import { apiClient } from '../api'

export interface ProductInventoryItem {
  lohang_id: number
  ma_lo: string
  bienthe_id: number
  sanpham_id?: number
  ten_sanpham?: string
  huong_vi: string
  kich_thuoc?: string
  so_luong_hien_tai: number
  so_luong_da_ban: number
  ngay_het_han: string
}

export interface ComponentInventoryItem {
  lohang_id: number
  ma_lo: string
  linh_kien_id: number
  ten_linh_kien: string
  so_luong_hien_tai: number
  so_luong_da_su_dung: number
  ngay_het_han: string
}

export interface GiftBoxInventoryItem {
  lohang_id: number
  ma_lo: string
  hop_qua_id: number
  ten_hop_qua: string
  so_luong_hien_tai: number
  so_luong_da_ban: number
  ngay_het_han: string
}

export async function getProductInventory(bienthe_id?: number): Promise<ProductInventoryItem[]> {
  return apiClient.get<ProductInventoryItem[]>('/batches/inventory/products', {
    bienthe_id: bienthe_id || null,
  })
}

export async function getComponentInventory(linh_kien_id?: number): Promise<ComponentInventoryItem[]> {
  return apiClient.get<ComponentInventoryItem[]>('/batches/inventory/components', {
    linh_kien_id: linh_kien_id || null,
  })
}

export async function getGiftBoxInventory(hop_qua_id?: number): Promise<GiftBoxInventoryItem[]> {
  return apiClient.get<GiftBoxInventoryItem[]>('/batches/inventory/gift-boxes', {
    hop_qua_id: hop_qua_id || null,
  })
}
