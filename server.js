const express = require('express');
const { exec } = require('child_process');
const { Pool } = require('pg'); // للاتصال بقاعدة البيانات
const app = express();
const port = process.env.PORT || 5000;

// إعداد الاتصال بقاعدة البيانات (تأكد من مطابقة البيانات للكومبوز)
const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://claw_user:claw_password@db:5432/arabclaw_db'
});

app.use(express.json());

// واجهة المستخدم الاحترافية
app.get('/', async (req, res) => {
    // جلب بعض الإحصائيات البسيطة من قاعدة البيانات
    let totalScraped = 0;
    try {
        const result = await pool.query('SELECT count(*) FROM scraped_data'); // افترضنا اسم الجدول
        totalScraped = result.rows[0].count;
    } catch (e) { totalScraped = "قيد الإعداد"; }

    res.send(`
        <!DOCTYPE html>
        <html dir="rtl" lang="ar">
        <head>
            <meta charset="UTF-8">
            <title>ArabClaw Pro Dashboard</title>
            <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.rtl.min.css" rel="stylesheet">
            <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
            <style>
                :root { --primary-color: #2c3e50; --accent-color: #3498db; }
                body { background-color: #f8f9fa; font-family: 'Segoe UI', sans-serif; }
                .sidebar { background: var(--primary-color); color: white; min-height: 100vh; padding: 20px; }
                .main-content { padding: 30px; }
                .stat-card { background: white; border-radius: 15px; padding: 20px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); transition: 0.3s; }
                .stat-card:hover { transform: translateY(-5px); }
                #live-logs { background: #1e1e1e; color: #00ff00; height: 300px; overflow-y: auto; font-family: monospace; padding: 15px; border-radius: 10px; font-size: 13px; }
                .btn-primary { background: var(--accent-color); border: none; }
                .table-container { background: white; border-radius: 15px; padding: 20px; margin-top: 20px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); }
            </style>
        </head>
        <body>
            <div class="container-fluid">
                <div class="row">
                    <div class="col-md-2 sidebar">
                        <h3 class="mb-4">ArabClaw 🕷️</h3>
                        <nav class="nav flex-column">
                            <a class="nav-link text-white active" href="#"><i class="fas fa-home me-2"></i> الرئيسية</a>
                            <a class="nav-link text-white" href="#" onclick="fetchResults()"><i class="fas fa-database me-2"></i> قاعدة البيانات</a>
                            <a class="nav-link text-white" href="#"><i class="fas fa-cog me-2"></i> الإعدادات</a>
                        </nav>
                    </div>

                    <div class="col-md-10 main-content">
                        <div class="d-flex justify-content-between align-items-center mb-4">
                            <h2>لوحة التحكم الاحترافية</h2>
                            <button class="btn btn-outline-dark" onclick="window.location.reload()"><i class="fas fa-sync"></i> تحديث</button>
                        </div>

                        <div class="row mb-4">
                            <div class="col-md-4">
                                <div class="stat-card">
                                    <h6 class="text-muted">إجمالي الروابط المزحوفة</h6>
                                    <h3>${totalScraped}</h3>
                                    <i class="fas fa-link float-end opacity-25" style="font-size: 2rem; margin-top: -30px;"></i>
                                </div>
                            </div>
                            <div class="col-md-4">
                                <div class="stat-card">
                                    <h6 class="text-muted">حالة النظام</h6>
                                    <h3 class="text-success">متصل ✅</h3>
                                </div>
                            </div>
                        </div>

                        <div class="table-container mb-4">
                            <h5>إصدار أمر زحف جديد</h5>
                            <div class="input-group mb-3">
                                <input type="text" id="target-url" class="form-control" placeholder="أدخل رابط الموقع كاملاً...">
                                <button class="btn btn-primary" onclick="executeScrape()">ابدأ الزحف الذكي</button>
                            </div>
                            <div id="live-logs">في انتظار الأوامر...</div>
                        </div>

                        <div class="table-container">
                            <div class="d-flex justify-content-between mb-3">
                                <h5>آخر النتائج المستخرجة</h5>
                                <button class="btn btn-success btn-sm" onclick="exportData()"><i class="fas fa-file-excel"></i> تصدير إكسيل</button>
                            </div>
                            <div class="table-responsive">
                                <table class="table table-hover">
                                    <thead>
                                        <tr>
                                            <th>ID</th>
                                            <th>العنوان</th>
                                            <th>الرابط</th>
                                            <th>تاريخ العملية</th>
                                        </tr>
                                    </thead>
                                    <tbody id="data-body">
                                        </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <script>
                function executeScrape() {
                    const url = document.getElementById('target-url').value;
                    const logBox = document.getElementById('live-logs');
                    logBox.innerHTML += "\\n[START] جاري معالجة: " + url + "...";
                    
                    fetch('/scrape', {
                        method: 'POST',
                        headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify({url})
                    })
                    .then(res => res.json())
                    .then(data => {
                        logBox.innerHTML += "\\n[DONE] " + data.message;
                        logBox.scrollTop = logBox.scrollHeight;
                        fetchResults(); // تحديث الجدول تلقائياً
                    });
                }

                function fetchResults() {
                    fetch('/api/results')
                    .then(res => res.json())
                    .then(data => {
                        const tbody = document.getElementById('data-body');
                        tbody.innerHTML = data.map(row => \`
                            <tr>
                                <td>\${row.id}</td>
                                <td>\${row.title || 'بدون عنوان'}</td>
                                <td><a href="\${row.url}" target="_blank">زيارة</a></td>
                                <td>\${new Date(row.created_at).toLocaleString('ar-EG')}</td>
                            </tr>
                        \`).join('');
                    });
                }

                // تحميل البيانات عند فتح الصفحة
                fetchResults();
            </script>
        </body>
        </html>
    `);
});

// API لجلب البيانات من Postgres
app.get('/api/results', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM scraped_data ORDER BY created_at DESC LIMIT 10');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// استقبال أوامر الزحف
app.post('/scrape', (req, res) => {
    const targetUrl = req.body.url;
    exec(`npm start -- --url="${targetUrl}"`, (error, stdout, stderr) => {
        res.json({ message: "اكتملت العملية", output: stdout });
    });
});

app.listen(port, '0.0.0.0', () => console.log('Server running on port ' + port));
