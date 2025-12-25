-- Migration: Add phu_hop_dip field to sanpham table
-- Date: 2025-01-XX
-- Description: Thêm field phu_hop_dip (ARRAY of strings) để lưu danh sách dịp phù hợp cho sản phẩm

-- Add column phu_hop_dip as TEXT[] (PostgreSQL array)
ALTER TABLE sanpham 
ADD COLUMN phu_hop_dip TEXT[] NULL;

-- Add comment to explain the field
COMMENT ON COLUMN sanpham.phu_hop_dip IS 'Danh sách dịp phù hợp (đồng bộ với GiftBoxOccasion): birthday, thanks, love, holiday, self_care';

-- Example values (đồng bộ với hộp quà):
-- ['birthday'] - Phù hợp cho sinh nhật
-- ['thanks'] - Phù hợp làm quà cảm ơn
-- ['love'] - Phù hợp cho tình yêu
-- ['holiday'] - Phù hợp cho lễ hội
-- ['self_care'] - Phù hợp tự ăn/chăm sóc bản thân
-- ['birthday', 'love'] - Phù hợp cho nhiều dịp
-- NULL - Chưa xác định hoặc phù hợp mọi dịp

-- Optional: Create index for better query performance (if you plan to filter by occasion)
-- CREATE INDEX idx_sanpham_phu_hop_dip ON sanpham USING GIN (phu_hop_dip);

