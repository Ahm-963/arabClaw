const express = require('express');
const { exec } = require('child_process');
const { Pool } = require('pg');
const app = express();
const port = process.env.PORT || 5000;

// إعداد الاتصال بقاعدة البيانات
const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://claw_user:claw_password@db:5432/arabclaw_db'
});

// وظيفة التجهيز الفني التلقائي (هذا هو الحل لمشكلتك)
async function initDB() {
    const createTableQuery = `
        CREATE TABLE IF NOT EXISTS scraped_data (
            id SERIAL PRIMARY KEY,
            title TEXT,
            url TEXT,
            data_json JSONB,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    `;
    try {
        await pool.query(createTableQuery);
        console.log("✅ تم تجهيز قاعدة البيانات والجدول بنجاح!");
    } catch (err) {
        console.error("❌ خطأ في تجهيز قاعدة البيانات:", err.message);
    }
}

// تشغيل التجهيز عند بدء السيرفر
initDB();

app.use(express.json());

// الواجهة الاحترافية (HTML)
app.get('/', async (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html dir="rtl" lang="ar">
        <head>
            <meta charset="UTF-8">
            <title>ArabClaw Pro</title>
            <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.rtl.min.css" rel="stylesheet">
            <style>
                body { background: #f4f7f6; font-family: sans-serif; }
                .card { border-radius: 15px; border: none; box-shadow: 0 5px 15px rgba(0,0,0,0.05); }
                #log-window { background: #2d3436; color: #fab1a0; height: 250px; overflow-y: auto; padding: 15px; border-radius: 10px; font-family: monospace; font-size: 12px; }
            </style>
        </head>
        <body>
            <div class="container py-5">
                <div class="text-center mb-5">
                    <h1 class="display-5 fw-bold text-primary">ArabClaw Dashboard 🕷️</h1>
                    <p class="text-muted">نظام الزحف الذكي وإدارة البيانات المستخرجة</p>
                </div>

                <div class="row g-4">
                    <div class="col-md-12">
                        <div class="card p-4 mb-4">
                            <h5><i class="fas fa-plus-circle"></i> أمر زحف جديد</h5>
                            <div class="input-group my-3">
                                <input type="text" id="urlInput" class="form-control" placeholder="أدخل الرابط المستهدف...">
                                <button class="btn btn-primary px-4" onclick="runScrape()">تشغيل المحرك</button>
                            </div>
                            <div id="log-window">في انتظار الأوامر...</div>
                        </div>
                    </div>

                    <div class="col-md-12">
                        <div class="card p-4">
                            <div class="d-flex justify-content-between align-items-center mb-3">
                                <h5><i class="fas fa-table"></i> البيانات المستخرجة</h5>
                                <button class="btn btn-sm btn-outline-secondary" onclick="loadData()">تحديث البيانات</button>
                            </div>
                            <div class="table-responsive">
                                <table class="table table-hover">
                                    <thead class="table-light">
                                        <tr>
                                            <th>ID</th>
                                            <th>الرابط</th>
                                            <th>الوقت</th>
                                            <th>الإجراء</th>
                                        </tr>
                                    </thead>
                                    <tbody id="dataTable"></tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <script>
                function runScrape() {
                    const url = document.getElementById('urlInput').value;
                    const logs = document.getElementById('log-window');
                    logs.innerHTML += \`\\n> جاري بدء الزحف: \${url}...\`;
                    
                    fetch('/scrape', {
                        method: 'POST',
                        headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify({url})
                    }).then(() => {
                        logs.innerHTML += \`\\n> اكتملت المهمة بنجاح! ✅\`;
                        loadData();
                    });
                }

                function loadData() {
                    fetch('/api/results').then(r => r.json()).then(data => {
                        const html = data.map(row => \`
                            <tr>
                                <td>\${row.id}</td>
                                <td class="text-truncate" style="max-width: 300px;">\${row.url}</td>
                                <td>\${new Date(row.created_at).toLocaleString('ar-EG')}</td>
                                <td><button class="btn btn-sm btn-info text-white">عرض</button></td>
                            </tr>
                        \`).join('');
                        document.getElementById('dataTable').innerHTML = html || '<tr><td colspan="4" class="text-center">لا توجد بيانات حالياً</td></tr>';
                    });
                }
                loadData();
            </script>
        </body>
        </html>
    `);
});

// API لجلب البيانات
app.get('/api/results', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM scraped_data ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).send(err.message);
    }
});

// تنفيذ الزحف (تعديل بسيط ليقوم بحفظ النتيجة في القاعدة أيضاً)
app.post('/scrape', (req, res) => {
    const url = req.body.url;
    exec(`npm start -- --url="${url}"`, async (error, stdout) => {
        // بعد انتهاء الزحف، نسجل العملية في الجدول
        try {
            await pool.query('INSERT INTO scraped_data (url, title) VALUES ($1, $2)', [url, 'عملية زحف ناجحة']);
        } catch (e) { console.error(e); }
        res.json({ success: true });
    });
});

app.listen(port, '0.0.0.0', () => console.log('Server running on 5000'));
