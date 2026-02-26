# 1. استخدام نسخة بايثون مستقرة وخفيفة
FROM python:3.10-slim

# 2. تثبيت التبعات الأساسية للمتصفح (Chrome/Chromium) والاعتمادات لنظام Linux
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    unzip \
    curl \
    chromium \
    chromium-driver \
    libpq-dev \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# 3. ضبط متغيرات البيئة ليعمل المتصفح داخل الحاوية بدون مشاكل
ENV CHROME_BIN=/usr/bin/chromium \
    CHROME_PATH=/usr/lib/chromium/ \
    PYTHONUNBUFFERED=1

# 4. تحديد مجلد العمل داخل الحاوية
WORKDIR /app

# 5. نسخ ملف المكتبات وتثبيتها
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 6. نسخ بقية ملفات المشروع
COPY . .

# 7. أمر التشغيل (تأكد من اسم الملف الرئيسي في المشروع، عادة يكون main.py)
CMD ["python", "main.py"]
