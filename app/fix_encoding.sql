-- ============================================================
-- SCRIPT SỬA LỖI ENCODING MOJIBAKE TRONG DATABASE HIỆN TẠI
-- Chạy script này để cập nhật dữ liệu bị lỗi tiếng Việt
-- Sử dụng: docker exec -i sms-mysql mysql -u student_user -p student_db < fix_encoding.sql
-- ============================================================

SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;
SET CHARACTER SET utf8mb4;
SET character_set_client     = utf8mb4;
SET character_set_connection = utf8mb4;
SET character_set_results    = utf8mb4;
SET collation_connection     = utf8mb4_unicode_ci;

USE student_db;

-- ============================================================
-- Chuyển đổi charset của database và các bảng sang utf8mb4
-- (Phải làm trước khi xóa/insert để ENUM nhận tiếng Việt)
-- ============================================================
ALTER DATABASE student_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Bỏ FK constraint tạm thời để alter table dễ hơn
SET FOREIGN_KEY_CHECKS = 0;

ALTER TABLE diem      CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE sinh_vien CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE lop       CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Alter riêng cột ENUM để chắc chắn nhận utf8mb4
ALTER TABLE lop MODIFY he_dao_tao ENUM('Chính quy','Liên thông','Vừa làm vừa học','Cao học')
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'Chính quy';

ALTER TABLE sinh_vien MODIFY gioi_tinh ENUM('Nam','Nữ','Khác')
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'Nam';

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================
-- CẬP NHẬT DỮ LIỆU BẢNG lop — Xóa & insert lại đúng tiếng Việt
-- ============================================================
SET FOREIGN_KEY_CHECKS = 0;
DELETE FROM diem;       -- Xóa điểm trước (do FK)
DELETE FROM sinh_vien;  -- Xóa sinh viên
DELETE FROM lop;        -- Xóa lớp
SET FOREIGN_KEY_CHECKS = 1;

-- Insert lại bảng lop với tiếng Việt chuẩn
INSERT INTO lop (ma_lop, ten_lop, khoa, he_dao_tao, nien_khoa, giao_vien_chu_nhiem) VALUES
('CNTT01', 'Công nghệ thông tin K01', 'Công nghệ thông tin', 'Chính quy', '2022-2026', 'TS. Nguyễn Văn An'),
('CNTT02', 'Công nghệ thông tin K02', 'Công nghệ thông tin', 'Chính quy', '2023-2027', 'ThS. Trần Thị Bình'),
('KTPM01', 'Kỹ thuật phần mềm K01',  'Công nghệ thông tin', 'Chính quy', '2022-2026', 'TS. Lê Văn Cường'),
('ATTT01', 'An toàn thông tin K01',   'Công nghệ thông tin', 'Chính quy', '2022-2026', 'ThS. Phạm Minh Đức'),
('KHMT01', 'Khoa học máy tính K01',   'Công nghệ thông tin', 'Chính quy', '2021-2025', 'GS. Hoàng Thị Lan');

-- ============================================================
-- CẬP NHẬT BẢNG sinh_vien
-- ============================================================
INSERT INTO sinh_vien (ma_sv, ho_ten, ngay_sinh, gioi_tinh, email, sdt, dia_chi, ma_lop) VALUES
('SV001', 'Nguyễn Thành Long',   '2004-03-15', 'Nam', 'long.sv001@student.edu.vn',   '0901234567', '12 Lê Lợi, Q1, TP.HCM',          'CNTT01'),
('SV002', 'Trần Thị Hoa Mai',    '2004-07-22', 'Nữ',  'mai.sv002@student.edu.vn',    '0912345678', '45 Nguyễn Huệ, Q1, TP.HCM',       'CNTT01'),
('SV003', 'Lê Minh Khoa',        '2003-11-05', 'Nam', 'khoa.sv003@student.edu.vn',   '0923456789', '78 Phạm Ngũ Lão, Q5, TP.HCM',     'CNTT02'),
('SV004', 'Phạm Thị Thu Trang',  '2004-01-30', 'Nữ',  'trang.sv004@student.edu.vn',  '0934567890', '23 Đinh Tiên Hoàng, Q3, TP.HCM',  'KTPM01'),
('SV005', 'Hoàng Đức Anh',       '2003-08-18', 'Nam', 'anh.sv005@student.edu.vn',    '0945678901', '56 Trần Hưng Đạo, Q5, TP.HCM',    'KTPM01'),
('SV006', 'Vũ Ngọc Linh',        '2004-05-12', 'Nữ',  'linh.sv006@student.edu.vn',   '0956789012', '89 Cách Mạng Tháng 8, Q10, TP.HCM','ATTT01'),
('SV007', 'Đặng Văn Hùng',       '2003-12-25', 'Nam', 'hung.sv007@student.edu.vn',   '0967890123', '34 Võ Thị Sáu, Q3, TP.HCM',       'ATTT01'),
('SV008', 'Bùi Thị Kim Ngân',    '2004-04-08', 'Nữ',  'ngan.sv008@student.edu.vn',   '0978901234', '67 Lý Thường Kiệt, Q10, TP.HCM',  'KHMT01'),
('SV009', 'Ngô Xuân Trường',     '2003-09-14', 'Nam', 'truong.sv009@student.edu.vn', '0989012345', '11 Hai Bà Trưng, Q1, TP.HCM',     'CNTT01'),
('SV010', 'Lý Thị Ánh Tuyết',    '2004-06-20', 'Nữ',  'tuyet.sv010@student.edu.vn',  '0990123456', '88 Điện Biên Phủ, Q3, TP.HCM',    'CNTT02');

-- ============================================================
-- CẬP NHẬT BẢNG diem
-- ============================================================
INSERT INTO diem (ma_sv, mon_hoc, diem_giua_ky, diem_cuoi_ky, diem_tong_ket, hoc_ky, nam_hoc) VALUES
('SV001', 'Lập trình Web',               7.5,  8.0,  7.80, 1, '2024-2025'),
('SV001', 'Cơ sở dữ liệu',              8.0,  8.5,  8.30, 1, '2024-2025'),
('SV001', 'Mạng máy tính',              6.5,  7.0,  6.80, 1, '2024-2025'),
('SV002', 'Lập trình Web',               9.0,  8.5,  8.70, 1, '2024-2025'),
('SV002', 'Cơ sở dữ liệu',              7.0,  6.5,  6.70, 1, '2024-2025'),
('SV002', 'Thuật toán',                  8.5,  9.0,  8.80, 1, '2024-2025'),
('SV003', 'Lập trình hướng đối tượng', 6.0,  5.5,  5.70, 1, '2024-2025'),
('SV003', 'Cơ sở dữ liệu',              7.5,  7.0,  7.20, 1, '2024-2025'),
('SV004', 'Kỹ nghệ phần mềm',           9.5,  9.0,  9.20, 2, '2024-2025'),
('SV004', 'Kiểm thử phần mềm',          8.0,  8.5,  8.30, 2, '2024-2025'),
('SV005', 'Kỹ nghệ phần mềm',           7.0,  7.5,  7.30, 2, '2024-2025'),
('SV005', 'Lập trình Web',               8.5,  8.0,  8.20, 2, '2024-2025'),
('SV006', 'An toàn thông tin',           9.0,  9.5,  9.30, 1, '2024-2025'),
('SV006', 'Mật mã học',                  8.5,  9.0,  8.80, 1, '2024-2025'),
('SV007', 'An toàn thông tin',           7.5,  4.5,  5.70, 1, '2024-2025'),
('SV007', 'Mật mã học',                  6.0,  6.5,  6.30, 1, '2024-2025'),
('SV008', 'Trí tuệ nhân tạo',           9.0,  9.5,  9.30, 2, '2024-2025'),
('SV008', 'Học máy',                     8.5,  9.0,  8.80, 2, '2024-2025'),
('SV009', 'Lập trình Web',               7.0,  7.5,  7.30, 1, '2024-2025'),
('SV009', 'Cơ sở dữ liệu',              8.0,  8.5,  8.30, 1, '2024-2025'),
('SV010', 'Mạng máy tính',              6.5,  3.5,  4.70, 2, '2024-2025'),
('SV010', 'Cơ sở dữ liệu',              7.5,  8.0,  7.80, 2, '2024-2025');

SELECT 'Fix encoding hoàn tất!' AS status;
