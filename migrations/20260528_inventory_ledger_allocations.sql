ALTER TABLE lichsukholinhkien
ADD COLUMN IF NOT EXISTS donhang_id INTEGER NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_lichsukholinhkien_donhang'
    ) THEN
        ALTER TABLE lichsukholinhkien
        ADD CONSTRAINT fk_lichsukholinhkien_donhang
        FOREIGN KEY (donhang_id) REFERENCES donhang(donhang_id) ON DELETE SET NULL;
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS phanbolo_chitietdonhang (
    phanbo_id SERIAL PRIMARY KEY,
    chitiet_id INTEGER NOT NULL REFERENCES chitietdonhang(chitiet_id) ON DELETE CASCADE,
    loai_lohang VARCHAR(20) NOT NULL,
    lohang_sanpham_id INTEGER NULL REFERENCES lohangsanpham(lohang_id) ON DELETE SET NULL,
    lohang_linhkien_id INTEGER NULL REFERENCES lohanglinhkien(lohang_id) ON DELETE SET NULL,
    lohang_hopqua_id INTEGER NULL REFERENCES lohanghopqua(lohang_id) ON DELETE SET NULL,
    so_luong INTEGER NOT NULL,
    ngay_tao TIMESTAMP WITHOUT TIME ZONE DEFAULT now(),
    CONSTRAINT ck_phanbolo_loai_lohang CHECK (loai_lohang IN ('sanpham', 'linhkien', 'hopqua')),
    CONSTRAINT ck_phanbolo_so_luong_positive CHECK (so_luong > 0)
);

CREATE INDEX IF NOT EXISTS idx_phanbolo_chitiet_id ON phanbolo_chitietdonhang(chitiet_id);
CREATE INDEX IF NOT EXISTS idx_phanbolo_lohang_sanpham ON phanbolo_chitietdonhang(lohang_sanpham_id);
CREATE INDEX IF NOT EXISTS idx_phanbolo_lohang_linhkien ON phanbolo_chitietdonhang(lohang_linhkien_id);
CREATE INDEX IF NOT EXISTS idx_phanbolo_lohang_hopqua ON phanbolo_chitietdonhang(lohang_hopqua_id);
