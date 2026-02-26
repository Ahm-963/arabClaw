# 1. البيئة الأساسية
FROM python:3.10-slim

# 2. تثبيت الأدوات اللازمة للمتصفح وقاعدة البيانات
RUN apt-get update && apt-get install -y \
    wget gnupg unzip curl chromium chromium-driver libpq-dev gcc \
    && rm -rf /var/lib/apt/lists/*

# 3. إعدادات الكروم للعمل داخل الحاوية
ENV CHROME_BIN=/usr/bin/chromium \
    CHROME_PATH=/usr/lib/chromium/ \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app

WORKDIR /app

# 4. إنشاء ملف المتطلبات (في حال نسيت إضافته للريبو)
RUN echo "selenium\nwebdriver-manager\npandas\nsqlalchemy\npsycopg2-binary\nrequests\nbeautifulsoup4" > requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# 5. نسخ الملفات
COPY . .

# 6. أمر التشغيل (هنا نحتاج لتحديد ملف البداية)
# بما أن الريبو لا يحتوي على main.py، سنفترض أنك ستنشئ واحداً أو تشغل أحد السكربتات الموجودة
# سأضع أمراً افتراضياً يمكنك تعديله لاحقاً لاسم ملفك التشغيلي
CMD ["python", "arabClaw/spiders/example_spider.py"]
