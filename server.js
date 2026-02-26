const express = require('express');
const { exec } = require('child_process');
const app = express();
const port = process.env.PORT || 5000;

app.use(express.json());

// واجهة المستخدم (HTML)
app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html dir="rtl" lang="ar">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>لوحة تحكم ArabClaw</title>
            <style>
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f0f2f5; margin: 0; padding: 20px; color: #333; }
                .container { max-width: 800px; margin: 40px auto; background: white; padding: 30px; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
                h1 { color: #2c3e50; text-align: center; margin-bottom: 30px; }
                .input-group { display: flex; gap: 10px; margin-bottom: 20px; }
                input[type="text"] { flex: 1; padding: 12px; border: 1px solid #ddd; border-radius: 6px; font-size: 16px; outline: none; transition: border 0.3s; }
                input[type="text"]:focus { border-color: #3498db; }
                button { padding: 12px 25px; background-color: #27ae60; color: white; border: none; border-radius: 6px; font-size: 16px; cursor: pointer; transition: background 0.3s; font-weight: bold; }
                button:hover { background-color: #219150; }
                button:disabled { background-color: #95a5a6; cursor: not-allowed; }
                #logs { background-color: #1e1e1e; color: #00ff00; padding: 20px; border-radius: 6px; height: 400px; overflow-y: auto; font-family: 'Courier New', Courier, monospace; line-height: 1.5; white-space: pre-wrap; border: 1px solid #333; margin-top: 20px; }
                .status { margin-top: 10px; font-size: 0.9em; color: #666; }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>🕷️ لوحة تحكم ArabClaw</h1>
                <div class="input-group">
                    <input type="text" id="url" placeholder="أدخل رابط الموقع للزحف إليه (مثال: https://books.toscrape.com)">
                    <button id="btn" onclick="startScraping()">بدء الزحف</button>
                </div>
                <div class="status">سجل العمليات المباشر:</div>
                <div id="logs">انتظار الأوامر...</div>
            </div>

            <script>
                function startScraping() {
                    const url = document.getElementById('url').value;
                    const btn = document.getElementById('btn');
                    const logs = document.getElementById('logs');

                    if (!url) {
                        alert("الرجاء إدخال رابط صحيح!");
                        return;
                    }

                    btn.disabled = true;
                    btn.innerText = "جاري العمل...";
                    logs.innerText += "\\n----------------------------------\\n> جاري بدء الزحف إلى: " + url + "\\n";

                    fetch('/scrape', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ url })
                    })
                    .then(response => response.json())
                    .then(data => {
                        logs.innerText += "> النتيجة: " + data.message + "\\n";
                        logs.innerText += "> المخرجات: \\n" + (data.details || "لا توجد تفاصيل إضافية") + "\\n";
                        logs.scrollTop = logs.scrollHeight; // التمرير للأسفل تلقائياً
                        btn.disabled = false;
                        btn.innerText = "بدء الزحف";
                    })
                    .catch(err => {
                        logs.innerText += "> خطأ في الاتصال: " + err + "\\n";
                        btn.disabled = false;
                        btn.innerText = "بدء الزحف";
                    });
                }
            </script>
        </body>
        </html>
    `);
});

// استقبال طلب الزحف
app.post('/scrape', (req, res) => {
    const targetUrl = req.body.url;
    
    // تشغيل أمر npm start وتمرير الرابط كـ argument
    // ملاحظة: قد تحتاج لتعديل الأمر حسب كيفية استقبال الكود الأصلي للرابط
    // هذا الأمر يفترض أن السكربت يقبل --url
    console.log(`Starting scrape for: ${targetUrl}`);
    
    // استخدام timeout لكي لا يعلق السيرفر
    exec(`npm start -- --url="${targetUrl}"`, { timeout: 60000 }, (error, stdout, stderr) => {
        if (error) {
            console.error(`exec error: ${error}`);
            return res.json({ 
                message: "حدث خطأ أثناء التنفيذ", 
                details: stderr || error.message 
            });
        }
        
        console.log(`stdout: ${stdout}`);
        res.json({ 
            message: "تمت عملية الزحف بنجاح!", 
            details: stdout 
        });
    });
});

// الاستماع على 0.0.0.0 هو الحل لمشكلة Bad Gateway
app.listen(port, '0.0.0.0', () => {
    console.log(`Server running at http://0.0.0.0:${port}`);
});
