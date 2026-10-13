#!/bin/bash
# ============================================================
# Script tạo chứng chỉ SSL tự ký (Self-Signed Certificate)
# Chạy: bash nginx/ssl/generate-ssl.sh
# ============================================================

set -e

SSL_DIR="$(dirname "$0")"
CERT_FILE="$SSL_DIR/cert.pem"
KEY_FILE="$SSL_DIR/key.pem"

echo "🔐 Đang tạo chứng chỉ SSL tự ký..."

openssl req -x509 -nodes -days 3650 \
  -newkey rsa:2048 \
  -keyout "$KEY_FILE" \
  -out "$CERT_FILE" \
  -subj "/C=VN/ST=HoChiMinh/L=HoChiMinh/O=StudentManagementSystem/OU=DevOps/CN=localhost" \
  -addext "subjectAltName=DNS:localhost,DNS:*.localhost,IP:127.0.0.1"

echo "✅ Tạo SSL certificate thành công!"
echo "   Certificate: $CERT_FILE"
echo "   Private Key: $KEY_FILE"
echo ""
echo "⚠️  Đây là self-signed cert dùng cho môi trường dev/học tập."
echo "   Không dùng trong production!"
