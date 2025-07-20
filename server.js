const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const bodyParser = require('body-parser');
const multer = require('multer');
const upload = multer({ dest: 'bins/' });

const app = express();
const PORT = 3000;

// 中间件
app.use(cors());
app.use(bodyParser.json());

// 静态文件服务
app.use(express.static(path.join(__dirname, 'public')));

// API路由
const BIN_DIR = path.join(__dirname, 'bins');

// 确保目录存在
if (!fs.existsSync(BIN_DIR)) {
    fs.mkdirSync(BIN_DIR);
}

// 原有的API路由保持不变
app.get('/api/bin-files', (req, res) => {
    fs.readdir(BIN_DIR, (err, files) => {
        if (err) {
            return res.status(500).json({ error: '无法读取目录' });
        }
        
        // 过滤出.bin文件
        const binFiles = files.filter(file => file.endsWith('.bin'));
        
        // 为每个文件添加更多信息
        const filesInfo = binFiles.map(file => {
            const stats = fs.statSync(path.join(BIN_DIR, file));
            return {
                name: file,
                size: stats.size,
                lastModified: stats.mtime,
                path: `/api/bin-files/${file}`
            };
        });
        
        res.json(filesInfo);
    });
});

app.get('/api/bin-files/:filename', (req, res) => {
    const filePath = path.join(BIN_DIR, req.params.filename);
    
    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: '文件不存在' });
    }
    
    res.download(filePath);
});

// 确保根路径返回index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});
//上传程序
app.post('/api/upload-bin', upload.single('binfile'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, error: '没有上传文件' });
        }
        
        // 重命名为原始文件名
        const originalName = req.file.originalname || 'uploaded.bin';
        const newPath = path.join(BIN_DIR, originalName);
        
        fs.renameSync(req.file.path, newPath);
        
        res.json({ 
            success: true,
            filename: originalName,
            path: `/api/bin-files/${originalName}`
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// 启动服务器
app.listen(PORT, () => {
    console.log(`服务器运行在 http://localhost:${PORT}`);
    console.log(`bin文件目录: ${BIN_DIR}`);
    console.log(`静态文件服务: ${path.join(__dirname, 'public')}`);
});