'Chính quy','Liên thông','Vừa làm vừa học','Cao học')
                        DEFAULT 'Chính quy',
    nien_khoa           VARCHAR(20)  NOT NULL,
    giao_vien_chu_nhiem VARCHAR(100),
    ngay_tao            TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_khoa (khoa)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLE: SINH VIEN
-- ============================================================
CREATE TABLE IF NOT EXISTS sinh_vien (
    ma_sv       VARCHAR(20)  NOT NULL PRIMARY KEY,
    ho_ten      VARCHAR(100) NOT NULL,
    ngay_sinh   DATE,
    gioi_tinh   ENUM('Nam','Nữ','Khác') DEFAULT 'Nam',
    email       VARCHAR(150) UNIQUE,
    sdt         VARCHAR(15),
    dia_chi     TEXT,
    ma_lop      VARCHAR(20),
    ngay_tao    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_sv_lop
        FOREIGN KEY (ma_lop) REFERENCES lop(ma_lop)
        ON DELETE SET NULL ON UPDATE CASCADE,
    INDEX idx_ho_ten (ho_ten),
    INDEX idx_ma_lop (ma_lop)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLE: DIEM SO
-- ============================================================
CREATE TABLE IF NOT EXISTS diem (
    id            INT          AUTO_INCREMENT PRIMARY KEY,
    ma_sv         VARCHAR(20)  NOT NULL,
    mon_hoc       VARCHAR(100) NOT NULL,
    diem_giua_ky  DECIMAL(4,2) CHECK (diem_giua_ky  BETWEEN 0 AND 10),
    diem_cuoi_ky  DECIMAL(4,2) CHECK (diem_cuoi_ky  BETWEEN 0 AND 10),
    diem_thi_lai  DECIMAL(4,2) CHECK (diem_thi_lai  BETWEEN 0 AND 10),
    diem_tong_ket DECIMAL(4,2) CHECK (diem_tong_ket BETWEEN 0 AND 10),
    hoc_ky        TINYINT      NOT NULL CHECK (hoc_ky BETWEEN 1 AND 3),
    nam_hoc       VARCHAR(20)  NOT NULL,
    ngay_cap_nhat TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_diem_sv
        FOREIGN KEY (ma_sv) REFERENCES sinh_vien(ma_sv)
        ON DELETE CASCADE ON UPDATE CASCADE,
    INDEX idx_diem_sv (ma_sv),
    INDEX idx_mon_hoc (mon_hoc)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================
-- SAMPLE DATA: LOP HOC (5 lop)
-- ============================================================
INSERT INTO lop (ma_lop, ten_lop, khoa, he_dao_tao, nien_khoa, giao_vien_chu_nhiem) VALUES
('CNTT01', 'Công nghệ Thông tin K01', 'Công nghệ Thông tin', 'Chính quy', '2022-2026', 'TS. Nguyễn Văn An'),
('CNTT02', 'Công nghệ Thông tin K02', 'Công nghệ Thông tin', 'Chính quy', '2023-2027', 'ThS. Trần Thị Bình'),
('KTPM01', 'Kỹ thuật Phần mềm K01',   'Công nghệ Thông tin', 'Chính quy', '2022-2026', 'TS. Lê Văn Cường'),
('ATTT01', 'An toàn Thông tin K01',   'Công nghệ Thông tin', 'Chính quy', '2022-2026', 'ThS. Phạm Minh Đức'),
('KHMT01', 'Khoa học Máy tính K01',   'Công nghệ Thông tin', 'Chính quy', '2021-2025', 'GS. Hoàng Thị Lan')
ON DUPLICATE KEY UPDATE ten_lop = VALUES(ten_lop);

-- ============================================================
-- SAMPLE DATA: SINH VIEN (10 sinh vien)
-- ============================================================
INSERT INTO sinh_vien (ma_sv, ho_ten, ngay_sinh, gioi_tinh, email, sdt, dia_chi, ma_lop) VALUES
('SV001', 'Nguyễn Thành Long',  '2004-03-15', 'Nam', 'long.sv001@student.edu.vn',   '0901234567', '12 Lê Lợi, Quận 1, TP. Hồ Chí Minh',         'CNTT01'),
('SV002', 'Trần Thị Hoa Mai',   '2004-07-22', 'Nữ', 'mai.sv002@student.edu.vn',    '0912345678', '45 Nguyễn Huệ, Quận 1, TP. Hồ Chí Minh',      'CNTT01'),
('SV003', 'Lê Minh Khoa',       '2003-11-05', 'Nam', 'khoa.sv003@student.edu.vn',   '0923456789', '78 Phạm Ngũ Lão, Quận 5, TP. Hồ Chí Minh',    'CNTT02'),
('SV004', 'Phạm Thị Thu Trang', '2004-01-30', 'Nữ', 'trang.sv004@student.edu.vn',  '0934567890', '23 Đinh Tiên Hoàng, Quận 3, TP. Hồ Chí Minh', 'KTPM01'),
('SV005', 'Hoàng Đức Anh',      '2003-08-18', 'Nam', 'anh.sv005@student.edu.vn',    '0945678901', '56 Trần Hưng Đạo, Quận 5, TP. Hồ Chí Minh',   'KTPM01'),
('SV006', 'Vũ Ngọc Linh',       '2004-05-12', 'Nữ', 'linh.sv006@student.edu.vn',   '0956789012', '89 Cách Mạng Tháng 8, Quận 10, TP. Hồ Chí Minh','ATTT01'),
('SV007', 'Đặng Văn Hùng',      '2003-12-25', 'Nam', 'hung.sv007@student.edu.vn',   '0967890123', '34 Võ Thị Sáu, Quận 3, TP. Hồ Chí Minh',      'ATTT01'),
('SV008', 'Bùi Thị Kim Ngân',   '2004-04-08', 'Nữ', 'ngan.sv008@student.edu.vn',   '0978901234', '67 Lý Thường Kiệt, Quận 10, TP. Hồ Chí Minh', 'KHMT01'),
('SV009', 'Ngô Xuân Trường',    '2003-09-14', 'Nam', 'truong.sv009@student.edu.vn', '0989012345', '11 Hai Bà Trưng, Quận 1, TP. Hồ Chí Minh',    'CNTT01'),
('SV010', 'Lý Thị Ánh Tuyết',   '2004-06-20', 'Nữ', 'tuyet.sv010@student.edu.vn',  '0990123456', '88 Điện Biên Phủ, Quận 3, TP. Hồ Chí Minh',   'CNTT02')
ON DUPLICATE KEY UPDATE ho_ten = VALUES(ho_ten), dia_chi = VALUES(dia_chi);

-- ============================================================
-- SAMPLE DATA: DIEM SO (20 ban ghi)
-- Cong thuc: diem_tong_ket = diem_giua_ky*0.4 + diem_cuoi_ky*0.6
-- ============================================================
INSERT INTO diem (ma_sv, mon_hoc, diem_giua_ky, diem_cuoi_ky, diem_tong_ket, hoc_ky, nam_hoc) VALUES
('SV001', 'Lập trình Web',                 7.5, 8.0, 7.80, 1, '2024-2025'),
('SV001', 'Cơ sở Dữ liệu',                8.0, 8.5, 8.30, 1, '2024-2025'),
('SV001', 'Mạng Máy tính',               6.5, 7.0, 6.80, 1, '2024-2025'),
('SV002', 'Lập trình Web',                 9.0, 8.5, 8.70, 1, '2024-2025'),
('SV002', 'Cơ sở Dữ liệu',                7.0, 6.5, 6.70, 1, '2024-2025'),
('SV002', 'Giải thuật & Cấu trúc DL',     8.5, 9.0, 8.80, 1, '2024-2025'),
('SV003', 'Lập trình Hướng đối tượng', 6.0, 5.5, 5.70, 1, '2024-2025'),
('SV003', 'Cơ sở Dữ liệu',                7.5, 7.0, 7.20, 1, '2024-2025'),
('SV004', 'Kỹ nghệ Phần mềm',             9.5, 9.0, 9.20, 2, '2024-2025'),
('SV004', 'Kiểm thử Phần mềm',            8.0, 8.5, 8.30, 2, '2024-2025'),
('SV005', 'Kỹ nghệ Phần mềm',             7.0, 7.5, 7.30, 2, '2024-2025'),
('SV005', 'Lập trình Web',                 8.5, 8.0, 8.20, 2, '2024-2025'),
('SV006', 'An toàn Thông tin',             9.0, 9.5, 9.30, 1, '2024-2025'),
('SV006', 'Mật mã học',                   8.5, 9.0, 8.80, 1, '2024-2025'),
('SV007', 'An toàn Thông tin',             7.5, 4.5, 5.70, 1, '2024-2025'),
('SV007', 'Mật mã học',                   6.0, 6.5, 6.30, 1, '2024-2025'),
('SV008', 'Trí tuệ Nhân tạo',            9.0, 9.5, 9.30, 2, '2024-2025'),
('SV008', 'Học máy',                      8.5, 9.0, 8.80, 2, '2024-2025'),
('SV009', 'Lập trình Web',                 7.0, 7.5, 7.30, 1, '2024-2025'),
('SV010', 'Mạng Máy tính',               6.5, 3.5, 4.70, 2, '2024-2025')
ON DUPLICATE KEY UPDATE diem_tong_ket = VALUES(diem_tong_ket);

-- ============================================================
-- MySQL Exporter User (quyen toi thieu - least privilege)
-- ============================================================
CREATE USER IF NOT EXISTS 'exporter'@'%'
  IDENTIFIED BY 'Exp0rt3r@2024!'
  WITH MAX_USER_CONNECTIONS 3;
GRANT PROCESS, REPLICATION CLIENT, SELECT ON *.* TO 'exporter'@'%';
FLUSH PRIVILEGES;

-- ============================================================
-- Xac nhan du lieu da nap
-- ============================================================
SELECT 'LOP'       AS bang, COUNT(*) AS so_ban_ghi FROM lop
UNION ALL
SELECT 'SINH_VIEN' AS bang, COUNT(*) AS so_ban_ghi FROM sinh_vien
UNION ALL
SELECT 'DIEM'      AS bang, COUNT(*) AS so_ban_ghi FROM diem;
