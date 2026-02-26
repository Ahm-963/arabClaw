FROM node:18-slim

# تثبيت Chromium لعمل الزاحف
RUN apt-get update && apt-get install -y \
    chromium \
    fonts-kacst \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

WORKDIR /app

COPY package*.json ./
RUN npm install
# تثبيت express للواجهة
RUN npm install express

COPY . .

# فتح المنفذ 5000 للواجهة
EXPOSE 5000

# تشغيل ملف السيرفر الذي أنشأناه
CMD ["node", "server.js"]
