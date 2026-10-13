FROM nginx:1.25-alpine

# Tạo non-root user (nginx mặc định đã có user nginx)
# Copy cấu hình
COPY nginx.conf /etc/nginx/nginx.conf
COPY ssl/ /etc/nginx/ssl/

# Tạo thư mục log
RUN mkdir -p /var/log/nginx && \
    chown -R nginx:nginx /var/log/nginx && \
    chmod 755 /var/log/nginx

EXPOSE 80 443

CMD ["nginx", "-g", "daemon off;"]
