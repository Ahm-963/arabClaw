FROM node:18-slim

# تثبيت متطلبات المتصفح للعمل في بيئة لينكس
RUN apt-get update && apt-get install -y \
    chromium \
    fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-kacst fonts-freefont-ttf libxss1 \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# نسخ ملفات التعريف وتثبيت المكتبات
COPY package*.json ./
RUN npm install

# نسخ ملفات المشروع
COPY . .

# تشغيل المشروع (بناءً على أوامر npm start في الريبو)
CMD ["npm", "start"]
