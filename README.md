# 🎓 Hệ thống Quản lý Sinh viên (SMS)

> **Môn học:** Triển khai và Quản trị Hệ thống Phần mềm  
> **Đề tài:** Đề 2 - Hệ thống Quản lý Sinh viên  
> **Stack:** Node.js + MySQL + Nginx + Prometheus + Grafana + Loki + Docker Compose

---

## 📋 Mục lục

1. [Kiến trúc hệ thống](#kiến-trúc-hệ-thống)
2. [Cấu trúc thư mục](#cấu-trúc-thư-mục)
3. [Yêu cầu hệ thống](#yêu-cầu-hệ-thống)
4. [Hướng dẫn khởi chạy](#hướng-dẫn-khởi-chạy)
5. [Cổng truy cập](#cổng-truy-cập)
6. [Kiểm tra Hardening](#kiểm-tra-hardening)
7. [LogQL Queries mẫu](#logql-queries-mẫu)
8. [Hướng dẫn 3 Commit Git](#hướng-dẫn-3-commit-git)
9. [Troubleshooting](#troubleshooting)

---

## 🏗️ Kiến trúc hệ thống

```
                         INTERNET
                             │
                        Port 80/443
                             │
                    ┌────────▼────────┐
                    │   NGINX Proxy   │  ← HTTPS + Security Headers
                    │  (frontend-net) │  ← Rate Limiting + Hardening
                    └────┬────────┬───┘
                         │        │
              ┌──────────▼──┐  ┌──▼─────────┐
              │  Node.js    │  │ phpMyAdmin  │
              │  Web App    │  │  (admin)    │
              │ :3000/metrics│  │            │
              └──────┬──────┘  └─────┬───────┘
                     │  backend-net  │
              ┌──────▼───────────────▼────┐
              │       MySQL 8.0           │  ← Internal only (no host port)
              │     (student_db)          │
              └───────────────────────────┘

  monitoring-net:
  ┌─────────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
  │ Prometheus  │  │ Grafana  │  │   Loki   │  │ Promtail │
  │  :9090      │  │  :3001   │  │  :3100   │  │          │
  └──────┬──────┘  └──────────┘  └──────────┘  └──────────┘
         │ scrape
  ┌──────▼──────┐  ┌──────────┐  ┌──────────────┐
  │Node-Exporter│  │ cAdvisor │  │MySQL-Exporter│
  └─────────────┘  └──────────┘  └──────────────┘
```

### Network Isolation

| Network | Services | Internal |
|---------|----------|----------|
| `sms_frontend_net` | Nginx ↔ webapp, phpmyadmin | No |
| `sms_backend_net` | webapp ↔ mysql, phpmyadmin ↔ mysql | **Yes** (no internet) |
| `sms_monitoring_net` | prometheus, grafana, loki, promtail, exporters | No |

---

## 📁 Cấu trúc thư mục

```
student-management-system/
├── .env                          # Biến môi trường (KHÔNG commit)
├── .env.example                  # Template .env
├── .gitignore
├── docker-compose.yml            # Orchestration toàn bộ hệ thống
├── README.md
│
├── app/                          # Node.js Web Application
│   ├── Dockerfile                # Multi-stage build, non-root user
│   ├── package.json
│   ├── server.js                 # Express server + /metrics + logging
│   ├── database.sql              # Init schema + sample data
│   ├── public/
│   │   ├── style.css             # Dark theme premium CSS
│   │   └── app.js                # Client-side JS
│   └── views/                    # EJS templates
│       ├── index.ejs             # Homepage
│       ├── _head.ejs / _foot.ejs # Partials
│       ├── error.ejs
│       ├── sinh-vien/            # CRUD sinh viên
│       ├── lop/                  # CRUD lớp học
│       └── diem/                 # CRUD điểm số
│
├── nginx/
│   ├── Dockerfile
│   ├── nginx.conf                # HTTPS + Security Headers + Rate Limiting
│   └── ssl/
│       └── generate-ssl.sh       # Script tạo self-signed cert
│
├── monitoring/
│   ├── prometheus/
│   │   └── prometheus.yml        # Scrape: webapp, node-exporter, cadvisor, mysql
│   └── grafana/
│       └── provisioning/
│           ├── datasources/
│           │   └── datasources.yml   # Auto-provision Prometheus + Loki
│           └── dashboards/
│               ├── dashboard.yml
│               └── sms-dashboard.json # Pre-built dashboard
│
└── logging/
    ├── loki/
    │   └── loki-config.yml       # Log storage 31 ngày
    └── promtail/
        └── promtail-config.yml   # Collect từ webapp + nginx logs
```

---

## ⚙️ Yêu cầu hệ thống

- **Docker** >= 24.0
- **Docker Compose** >= 2.20
- **OpenSSL** (để tạo SSL cert)
- RAM: tối thiểu **4GB** (recommended 8GB)
- Disk: tối thiểu **5GB** free

---

## 🚀 Hướng dẫn khởi chạy

### Bước 1: Clone và chuẩn bị

```bash
# Clone repository
git clone https://github.com/<your-username>/student-management-system.git
cd student-management-system

# Tạo file .env từ template
cp .env.example .env
# Chỉnh sửa mật khẩu trong .env nếu cần
```

### Bước 2: Tạo SSL Certificate

```bash
# Linux/Mac:
bash nginx/ssl/generate-ssl.sh

# Windows (Git Bash hoặc WSL):
bash nginx/ssl/generate-ssl.sh

# Hoặc dùng OpenSSL trực tiếp:
openssl req -x509 -nodes -days 3650 -newkey rsa:2048 \
  -keyout nginx/ssl/key.pem \
  -out nginx/ssl/cert.pem \
  -subj "/C=VN/ST=HCM/L=HCM/O=SMS/CN=localhost"
```

### Bước 3: Build và khởi chạy toàn bộ hệ thống

```bash
# Build images và start tất cả services
docker compose up -d --build

# Theo dõi logs khi khởi động
docker compose logs -f webapp mysql

# Kiểm tra trạng thái tất cả services
docker compose ps
```

### Bước 4: Kiểm tra health check

```bash
# Tất cả services phải ở trạng thái "healthy" hoặc "running"
docker compose ps

# Kiểm tra health của webapp
curl -k https://localhost/health

# Kiểm tra metrics endpoint
curl -k https://localhost/metrics | head -30
```

---

## 🌐 Cổng truy cập

| Service | URL | Port | Ghi chú |
|---------|-----|------|---------|
| **Web App (HTTPS)** | `https://localhost` | **443** | Main app — bấm "Advanced → Proceed" |
| **Web App (HTTP)** | `http://localhost` | **80** | Tự redirect 301 → HTTPS |
| **phpMyAdmin** | `http://localhost:8080` | **8080** | User: `student_user`, Pass: từ `.env` |
| **Grafana** | `http://localhost:3001` | **3001** | User: `admin`, Pass: từ `.env` |
| **Prometheus** | `http://localhost:9090` | **9090** | Web UI + API |
| **Loki** | `http://localhost:3100` | **3100** | API endpoint |
| **App Health** | `https://localhost/health` | 443 | JSON health status |
| **App Metrics** | `https://localhost/metrics` | 443 | Prometheus scrape endpoint |
| **MySQL** | — | — | Không expose ra host (bảo mật) |

> **Lưu ý:** Browser sẽ cảnh báo SSL certificate không tin cậy vì self-signed. Bấm **Advanced → Proceed to localhost** để tiếp tục.

---

## 🔒 Kiểm tra Hardening (Bảo mật)

### 1. Kiểm tra container chạy non-root

```bash
# Kiểm tra user của webapp container (phải là "nodeuser", uid 1001)
docker exec sms-webapp whoami
docker exec sms-webapp id

# Expected output:
# nodeuser
# uid=1001(nodeuser) gid=1001(nodegroup) groups=1001(nodegroup)

# Kiểm tra Prometheus chạy với nobody user
docker inspect sms-prometheus --format='{{.Config.User}}'
# Expected: 65534:65534
```

### 2. Kiểm tra Network Isolation (MySQL không expose port ra host)

```bash
# MySQL KHÔNG thể kết nối từ host (phải fail)
mysql -h 127.0.0.1 -P 3306 -u student_user -p
# Expected: ERROR 2003 (Can't connect to MySQL server)

# Kiểm tra backend-net là internal network (không có internet)
docker network inspect sms_backend_net | grep -i internal
# Expected: "Internal": true

# Kiểm tra containers trong backend-net
docker network inspect sms_backend_net --format='{{json .Containers}}' | python3 -m json.tool
```

### 3. Kiểm tra Security Headers (Nginx Hardening)

```bash
# Kiểm tra tất cả security headers
curl -k -I https://localhost 2>/dev/null | grep -E "Strict|X-Frame|X-Content|Content-Security|Referrer"

# Expected output:
# Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
# X-Frame-Options: SAMEORIGIN
# X-Content-Type-Options: nosniff
# X-XSS-Protection: 1; mode=block
# Content-Security-Policy: default-src 'self'; ...
# Referrer-Policy: strict-origin-when-cross-origin

# Kiểm tra server token bị ẩn
curl -k -I https://localhost 2>/dev/null | grep -i server
# Expected: server header không có phiên bản Nginx
```

### 4. Kiểm tra HTTPS redirect

```bash
# HTTP phải redirect sang HTTPS (301)
curl -I http://localhost
# Expected: HTTP/1.1 301 Moved Permanently
# Location: https://localhost/
```

### 5. Kiểm tra Prometheus scraping

```bash
# Kiểm tra targets đang up
curl http://localhost:9090/api/v1/targets | python3 -m json.tool | grep -E '"health"|"job"'

# Kiểm tra metrics của webapp
curl -k https://localhost/metrics | grep http_requests_total
```

### 6. Kiểm tra resource limits

```bash
# Xem memory limits của tất cả containers
docker stats --no-stream --format "table {{.Name}}\t{{.MemUsage}}\t{{.MemLimit}}"
```

---

## 📊 LogQL Queries mẫu (Grafana → Loki)

Truy cập **Grafana (http://localhost:3001) → Explore → chọn Loki datasource**

### Query 1: Filter HTTP 5xx errors từ webapp

```logql
{job="webapp"} | json | http_status >= 500
```

**Giải thích:** Lọc tất cả log entries từ job `webapp`, parse JSON, và chỉ hiển thị các request có HTTP status >= 500 (lỗi server). Dùng để phát hiện lỗi nghiêm trọng trong ứng dụng.

---

### Query 2: Tìm tất cả thao tác CRUD và đếm tần suất

```logql
sum by(level) (
  count_over_time(
    {job="webapp"} |= "CRUD" [5m]
  )
)
```

**Giải thích:** Đếm số lần xuất hiện chuỗi "CRUD" trong log của webapp trong mỗi cửa sổ 5 phút, phân nhóm theo `level` (info/warn/error). Giúp theo dõi hoạt động thao tác dữ liệu của người dùng.

---

### Query 3: Filter 4xx errors từ Nginx (Not Found, Unauthorized)

```logql
{job="nginx", log_type="access"} | json | status >= 400 | status < 500
```

**Giải thích:** Lọc log Nginx access log, parse JSON format, chỉ hiển thị HTTP 4xx responses (client errors như 404, 401, 403). Dùng để phát hiện các endpoint không tồn tại hoặc truy cập trái phép.

---

### Query 4 (Bonus): Rate của lỗi theo thời gian

```logql
sum(rate({job="webapp"} | json | level="error" [1m]))
```

**Giải thích:** Tính tốc độ xuất hiện log lỗi (level=error) từ webapp trong mỗi phút. Dùng để vẽ biểu đồ trend lỗi theo thời gian và cấu hình alert khi rate tăng đột biến.

---

### Query 5 (Bonus): Slow requests (> 1 giây)

```logql
{job="webapp"} | json | duration_ms > 1000
```

**Giải thích:** Tìm tất cả request có thời gian xử lý > 1000ms. Dùng để phát hiện performance bottleneck.

---

## 📝 Hướng dẫn 3 Commit Git

### Chuẩn bị repository

```bash
cd "d:/Triển khai loooo"
git init
git branch -M main

# Thay YOUR_MSSV = mã số sinh viên thực tế
git remote add origin https://github.com/YOUR_MSSV/student-management-system.git
```

> ⚠️ **Yêu cầu đề bài:** Đúng **3 commit**, không nhiều hơn không ít hơn. Kiểm tra bằng `git log --oneline`.

---

### COMMIT 1: Web App + MySQL + phpMyAdmin + Nginx + HTTPS

```bash
# Stage files cho Commit 1
git add .env.example .gitignore
git add app/
git add nginx/
git add docker-compose.yml

# Tạo commit
git commit -m "feat: [Commit 1] Web App CRUD + MySQL + Nginx HTTPS + Hardening

- Node.js Express app với CRUD sinh viên/lớp/điểm
- MySQL 8.0 với database.sql init script và dữ liệu mẫu
- phpMyAdmin để quản lý DB qua giao diện web
- Nginx reverse proxy với HTTPS self-signed SSL
- Security headers: HSTS, X-Frame-Options, CSP, X-Content-Type-Options
- Network isolation: frontend-net (external) + backend-net (internal)
- App chạy non-root user (nodeuser:1001) - Multi-stage Dockerfile
- MySQL không expose port ra host machine
- Endpoint /metrics (prom-client) + /health check
- Structured JSON logging (Winston) cho Promtail"

git push -u origin main
```

---

### COMMIT 2: Prometheus + Grafana Monitoring

```bash
# Stage files cho Commit 2
git add monitoring/

# Tạo commit
git commit -m "feat: [Commit 2] Monitoring - Prometheus + Grafana + Exporters

- Prometheus scrape: webapp /metrics, node-exporter, cAdvisor, mysql-exporter
- Grafana với datasource provisioning tự động (Prometheus + Loki)
- Pre-built dashboard JSON: HTTP metrics, container resources, MySQL stats, logs
- Node Exporter: giám sát tài nguyên host
- cAdvisor: giám sát resources từng container (CPU/RAM/Network)
- MySQL Exporter: queries/sec, connections, buffer pool metrics
- Monitoring trên port: Prometheus:9090, Grafana:3001"

git push
```

---

### COMMIT 3: Loki + Promtail + Hardening

```bash
# Stage files cho Commit 3
git add logging/
git add README.md

# Tạo commit
git commit -m "feat: [Commit 3] Centralized Logging - Loki + Promtail + LogQL

- Loki với filesystem storage, retention 31 ngày
- Promtail thu thập log từ webapp (JSON Winston) và Nginx (JSON format)
- Pipeline stages: JSON parse, label extraction, timestamp normalization
- 5 LogQL queries mẫu: 5xx errors, CRUD tracking, 4xx filter, error rate, slow requests
- Grafana dashboard tích hợp Loki logs panel
- README cập nhật: LogQL queries + hướng dẫn đầy đủ"

git push
```

---

## 🔧 Troubleshooting

### Lỗi: SSL certificate không tồn tại

```bash
# Chạy script tạo SSL
bash nginx/ssl/generate-ssl.sh

# Hoặc trực tiếp:
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout nginx/ssl/key.pem -out nginx/ssl/cert.pem \
  -subj "/CN=localhost"
```

### Lỗi: MySQL không kết nối được

```bash
# Xem logs MySQL
docker compose logs mysql --tail=50

# Kiểm tra health
docker compose ps mysql

# Restart MySQL
docker compose restart mysql

# Xem biến môi trường (để debug)
docker compose exec mysql env | grep MYSQL
```

### Lỗi: Webapp không start

```bash
# Xem logs webapp
docker compose logs webapp --tail=50

# Rebuild image
docker compose build webapp --no-cache
docker compose up -d webapp
```

### Reset toàn bộ (xóa data)

```bash
# Dừng và xóa tất cả containers + volumes
docker compose down -v

# Rebuild từ đầu
docker compose up -d --build
```

### Xem logs realtime

```bash
# Tất cả services
docker compose logs -f

# Chỉ webapp và nginx
docker compose logs -f webapp nginx

# Chỉ monitoring
docker compose logs -f prometheus grafana loki promtail
```

---

## 📊 Grafana Dashboard Guide

1. Mở http://localhost:3001
2. Đăng nhập: `admin` / `Gr@fana@Adm1n!` (hoặc giá trị trong .env)
3. Vào **Dashboards → SMS → Student Management System**
4. Dashboard đã pre-load với các panels:
   - HTTP Request Rate & Status Codes
   - Response Time Percentiles (p50/p90/p99)
   - Container CPU & Memory (cAdvisor)
   - MySQL Queries/sec & Connections
   - Live App Logs (Loki integration)

---

## 🔍 Prometheus Queries mẫu

Truy cập http://localhost:9090/graph

```promql
# Tổng request/phút
sum(rate(http_requests_total{job="webapp"}[5m])) * 60

# Response time trung bình
rate(http_request_duration_seconds_sum[5m]) / rate(http_request_duration_seconds_count[5m])

# Tỷ lệ lỗi 5xx
sum(rate(http_requests_total{status_code=~"5.."}[5m])) / sum(rate(http_requests_total[5m]))

# Memory container webapp
container_memory_usage_bytes{name="sms-webapp"}

# MySQL connections
mysql_global_status_threads_connected
```

---

*Generated for Môn Triển khai và Quản trị Hệ thống Phần mềm - Đề 2*
