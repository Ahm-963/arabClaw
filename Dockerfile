# استخدام نسخة بايثون مستقرة
FROM python:3.10-slim

# تثبيت المتطلبات اللازمة لـ Selenium و Chromium وقاعدة البيانات
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

# ضبط بيئة العمل للمتصفح (Headless mode)
ENV CHROME_BIN=/usr/bin/chromium \
    CHROME_PATH=/usr/lib/chromium/ \
    PYTHONUNBUFFERED=1

WORKDIR /app

# تثبيت مكتبات بايثون (تأكد من وجود ملف requirements.txt في الريبو)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# نسخ ملفات المشروع
COPY . .

# أمر التشغيل الأساسي
CMD ["python", "main.py"]
