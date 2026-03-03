# Serve static frontend via Nginx
FROM nginx:1.27-alpine

# Remove default nginx page
RUN rm -rf /usr/share/nginx/html/*

# Copy all frontend files
COPY . /usr/share/nginx/html

# Custom nginx config: proxy /api/* to backend
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
