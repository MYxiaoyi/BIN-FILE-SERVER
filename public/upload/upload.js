// 密码配置 (明文)
const ACCESS_PASSWORD = "admin123"; // 你可以修改这个密码

// DOM元素
const authSection = document.getElementById('authSection');
const uploadSection = document.getElementById('uploadSection');
const passwordInput = document.getElementById('passwordInput');
const authButton = document.getElementById('authButton');
const togglePassword = document.getElementById('togglePassword');
const dropzone = document.getElementById('dropzone');
const fileInput = document.getElementById('fileInput');
const uploadButton = document.getElementById('uploadButton');
const fileList = document.getElementById('fileList');
const statusAlert = document.getElementById('statusAlert');

// 当前选中的文件
let selectedFile = null;

// 初始化
function init() {
    // 密码显示/隐藏切换
    togglePassword.addEventListener('click', () => {
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);
        togglePassword.innerHTML = type === 'password' ? '<i class="fas fa-eye"></i>' : '<i class="fas fa-eye-slash"></i>';
    });
    
    // 认证按钮点击
    authButton.addEventListener('click', handleAuth);
    
    // 拖放区域事件
    dropzone.addEventListener('click', () => fileInput.click());
    dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.classList.add('bg-primary', 'bg-opacity-10');
    });
    dropzone.addEventListener('dragleave', () => {
        dropzone.classList.remove('bg-primary', 'bg-opacity-10');
    });
    dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.classList.remove('bg-primary', 'bg-opacity-10');
        if (e.dataTransfer.files.length) {
            handleFileSelect(e.dataTransfer.files[0]);
        }
    });
    
    // 文件选择事件
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length) {
            handleFileSelect(e.target.files[0]);
        }
    });
    
    // 上传按钮点击
    uploadButton.addEventListener('click', uploadFile);
}

// 处理认证
function handleAuth() {
    if (passwordInput.value === ACCESS_PASSWORD) {
        authSection.style.display = 'none';
        uploadSection.style.display = 'block';
    } else {
        showAlert('密码错误，请重试!', 'danger');
        passwordInput.focus();
    }
}

// 处理文件选择
function handleFileSelect(file) {
    if (!file.name.endsWith('.bin')) {
        showAlert('请选择.bin文件!', 'warning');
        return;
    }
    
    selectedFile = file;
    uploadButton.disabled = false;
    
    // 显示文件信息
    fileList.innerHTML = `
        <div class="card">
            <div class="card-body">
                <h5 class="card-title"><i class="fas fa-file-alt me-2"></i>${file.name}</h5>
                <p class="card-text mb-1">大小: ${(file.size / 1024).toFixed(2)} KB</p>
                <p class="card-text small text-muted">最后修改: ${new Date(file.lastModified).toLocaleString()}</p>
            </div>
        </div>
    `;
}

// 上传文件
function uploadFile() {
    if (!selectedFile) return;
    
    const formData = new FormData();
    formData.append('binfile', selectedFile);
    
    showAlert('上传中，请稍候...', 'info');
    uploadButton.disabled = true;
    
    fetch('/api/upload-bin', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showAlert('文件上传成功!', 'success');
            fileList.innerHTML = '';
            fileInput.value = '';
            selectedFile = null;
        } else {
            showAlert(data.error || '上传失败!', 'danger');
            uploadButton.disabled = false;
        }
    })
    .catch(error => {
        showAlert('上传出错: ' + error.message, 'danger');
        uploadButton.disabled = false;
    });
}

// 显示状态提示
function showAlert(message, type) {
    statusAlert.textContent = message;
    statusAlert.className = `alert alert-${type} mt-3 mb-0`;
    statusAlert.classList.remove('d-none');
    
    if (type !== 'info') {
        setTimeout(() => {
            statusAlert.classList.add('d-none');
        }, 5000);
    }
}

// 启动应用
document.addEventListener('DOMContentLoaded', init);