const express = require('express');
const { exec } = require('child_process');
const app = express();
const port = process.env.PORT || 5000;

app.use(express.json());

// واجهة المستخدم الرسومية (HTML بسيطة)
app.get('/', (req, res) => {
    res.send(`
        <html>
            <head>
                <title>arabClaw Dashboard</title>
                <style>
                    body { font-family: sans-serif; direction: rtl; padding: 20px; background: #f4f4f9; }
                    .container { max-width: 800px; margin: auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                    input { width: 70%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; }
                    button { padding: 10px 20px; background: #28a745; color: white; border: none; border-radius: 4px; cursor: pointer; }
                    #logs { background: #333; color: #fff; padding: 15px; border-radius: 4px; height: 300px; overflow-y: scroll; margin-top: 20px; white-space: pre-wrap; }
                </style>
            </head>
            <body>
                <div class="container">
                    <h1>لوحة تحكم arabClaw 🕷️</h1>
                    <p>أدخل الرابط لبدء عملية الزحف:</p>
                    <input type="text" id="url" placeholder="https://example.com">
                    <button onclick="startScraping()">بدء الزحف</button>
                    <div id="logs">في انتظار الأوامر...</div>
                </div>
                <script>
                    function startScraping() {
                        const url = document.getElementById('url').value;
                        const logs = document.getElementById('logs');
                        logs.innerText += "\\n جاري البدء في الزحف إلى: " + url;
                        
                        fetch('/scrape', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ url })
                        }).then(response => response.json())
                          .then(data => { logs.innerText += "\\n النتيجة: " + data.message; });
                    }
                </script>
            </body>
        </html>
    `);
});

// استقبال أوامر الزحف
app.post('/scrape', (req, res) => {
    const targetUrl = req.body.url;
    // هنا نقوم بتشغيل محرك arabClaw الأصلي عبر سطر الأوامر
    exec(`npm start -- --url ${targetUrl}`, (error, stdout, stderr) => {
        if (error) {
            return res.json({ message: "خطأ: " + error.message });
        }
        res.json({ message: "تمت العملية بنجاح! راجع قاعدة البيانات للنتائج." });
    });
});

app.listen(port, () => {
    console.log(`Dashboard running at http://localhost:${port}`);
});
