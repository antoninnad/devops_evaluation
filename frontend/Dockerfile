FROM nginx:alpine

COPY --chmod=644 index.html style.css script.js /usr/share/nginx/html/

COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
