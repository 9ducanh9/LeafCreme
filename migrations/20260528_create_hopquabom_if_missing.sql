CREATE TABLE IF NOT EXISTS hopquabom (
    bom_id SERIAL PRIMARY KEY,
    hop_qua_id INTEGER NOT NULL REFERENCES hopqua(hop_qua_id) ON DELETE CASCADE,
    bienthe_id INTEGER NOT NULL REFERENCES bienthesanpham(bienthe_id) ON DELETE CASCADE,
    so_luong INTEGER NOT NULL CHECK (so_luong > 0),
    ngay_tao TIMESTAMP WITHOUT TIME ZONE DEFAULT now(),
    CONSTRAINT uq_hopquabom_hop_qua_bienthe UNIQUE (hop_qua_id, bienthe_id)
);

CREATE INDEX IF NOT EXISTS idx_hopquabom_hop_qua_id ON hopquabom(hop_qua_id);
CREATE INDEX IF NOT EXISTS idx_hopquabom_bienthe_id ON hopquabom(bienthe_id);
