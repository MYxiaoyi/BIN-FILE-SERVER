        // 全局变量
        let port = null;
        let selectedFile = null;
        let fileContent = null;
        
        // DOM元素
        const fileListSelect = document.getElementById('fileList');
        const refreshFilesBtn = document.getElementById('refreshFiles');
        const sendFileBtn = document.getElementById('sendFile');
        const requestPortBtn = document.getElementById('requestPort');
        const openPortBtn = document.getElementById('openPort');
        const closePortBtn = document.getElementById('closePort');
        const portInfoDiv = document.getElementById('portInfo');
        const portStatusDiv = document.getElementById('portStatus');
        const fileStatusDiv = document.getElementById('fileStatus');
        const logOutputDiv = document.getElementById('logOutput');
        const progressBar = document.getElementById('progressBar');
        const uploadBtn = document.getElementById('uploadFiles');
        // 波特率和其他串口设置
        const baudRateSelect = document.getElementById('baudRate');
        const dataBitsSelect = document.getElementById('dataBits');
        const stopBitsSelect = document.getElementById('stopBits');
        const paritySelect = document.getElementById('parity');
        
        // 初始化
        document.addEventListener('DOMContentLoaded', () => {
            refreshFileList();
            setupEventListeners();
        });
        
        // 设置事件监听器
        function setupEventListeners() {
            refreshFilesBtn.addEventListener('click', refreshFileList);
            fileListSelect.addEventListener('change', onFileSelected);
            sendFileBtn.addEventListener('click', sendFileToPort);
            requestPortBtn.addEventListener('click', requestSerialPort);
            openPortBtn.addEventListener('click', openSerialPort);
            closePortBtn.addEventListener('click', closeSerialPort);
            uploadBtn.addEventListener('click', uploadFile);
        }

        // 刷新文件列表
        async function refreshFileList() {
            try {
                log('正在获取文件列表...');
                const response = await fetch('http://localhost:3000/api/bin-files');
                if (!response.ok) {
                    throw new Error(`HTTP错误! 状态码: ${response.status}`);
                }
                const files = await response.json();
                
                fileListSelect.innerHTML = '';
                files.forEach(file => {
                    const option = document.createElement('option');
                    option.value = file.name;
                    option.textContent = `${file.name} (${(file.size / 1024).toFixed(2)} KB)`;
                    fileListSelect.appendChild(option);
                });
                
                log(`找到 ${files.length} 个文件`);
                updateFileStatus('文件列表已刷新', 'success');
            } catch (error) {
                log(`获取文件列表失败: ${error.message}`, 'error');
                updateFileStatus('获取文件列表失败', 'error');
            }
        }
        function uploadFile(){
            window.open(`${window.location.origin}/upload/upload.html`, '_blank');
        }
        // 文件选择变化
        function onFileSelected() {
            selectedFile = fileListSelect.value;
            sendFileBtn.disabled = !selectedFile || !port;
            
            if (selectedFile) {
                log(`已选择文件: ${selectedFile}`);
                updateFileStatus(`已选择: ${selectedFile}`, 'info');
            }
        }
        
        // 请求串口
        async function requestSerialPort() {
            try {
                if (!navigator.serial) {
                    throw new Error('浏览器不支持Web Serial API，请使用Chrome/Edge 89+或Opera 76+');
                }
                
                port = await navigator.serial.requestPort();
                portInfoDiv.textContent = `${port.getInfo().usbProductId || '未知设备'}`;
                openPortBtn.disabled = false;
                closePortBtn.disabled = true;
                
                log('串口已选择，请配置参数并打开');
                updatePortStatus('串口已选择', 'info');
            } catch (error) {
                if (error.name === 'NotFoundError') {
                    log('用户未选择串口', 'info');
                } else {
                    log(`选择串口失败: ${error.message}`, 'error');
                    updatePortStatus('选择串口失败', 'error');
                }
            }
        }
        
        // 打开串口
        async function openSerialPort() {
            if (!port) {
                updatePortStatus('请先选择串口', 'error');
                return;
            }
            
            try {
                const baudRate = parseInt(baudRateSelect.value);
                const dataBits = parseInt(dataBitsSelect.value);
                const stopBits = parseInt(stopBitsSelect.value);
                const parity = paritySelect.value;
                
                await port.open({ baudRate, dataBits, stopBits, parity });
                
                openPortBtn.disabled = true;
                closePortBtn.disabled = false;
                sendFileBtn.disabled = !selectedFile;
                
                log(`串口已打开，配置: ${baudRate}波特, ${dataBits}数据位, ${stopBits}停止位, ${parity}校验`);
                updatePortStatus('串口已打开', 'success');
            } catch (error) {
                log(`打开串口失败: ${error.message}`, 'error');
                updatePortStatus('打开串口失败', 'error');
            }
        }
        
        // 关闭串口
        async function closeSerialPort() {
            if (!port) return;
            
            try {
                await port.close();
                port = null;
                
                openPortBtn.disabled = false;
                closePortBtn.disabled = true;
                sendFileBtn.disabled = true;
                
                log('串口已关闭');
                updatePortStatus('串口已关闭', 'info');
                portInfoDiv.textContent = '未选择';
            } catch (error) {
                log(`关闭串口失败: ${error.message}`, 'error');
                updatePortStatus('关闭串口失败', 'error');
            }
        }
        
        // 发送文件到串口
        async function sendFileToPort() {
            if (!port || !selectedFile) {
                updateFileStatus('请先选择文件和打开串口', 'error');
                return;
            }
            
            try {
                log(`开始发送文件: ${selectedFile}`);
                updateFileStatus('正在发送文件...', 'info');
                
                // 获取文件内容
                const response = await fetch(`http://localhost:3000/api/bin-files/${selectedFile}`);
                if (!response.ok) {
                    throw new Error(`HTTP错误! 状态码: ${response.status}`);
                }
                
                const fileData = await response.arrayBuffer();
                const writer = port.writable.getWriter();
                
                const chunkSize = 1024; // 每次发送1KB
                const totalChunks = Math.ceil(fileData.byteLength / chunkSize);
                let chunksSent = 0;
                
                progressBar.style.width = '0%';
                
                // 分块发送
                for (let offset = 0; offset < fileData.byteLength; offset += chunkSize) {
                    const chunk = fileData.slice(offset, offset + chunkSize);
                    await writer.write(new Uint8Array(chunk));
                    
                    chunksSent++;
                    const progress = Math.round((chunksSent / totalChunks) * 100);
                    progressBar.style.width = `${progress}%`;
                    
                    // 每10%或最后一块更新日志
                    if (progress % 10 === 0 || chunksSent === totalChunks) {
                        log(`发送进度: ${progress}% (${offset + chunk.byteLength}/${fileData.byteLength}字节)`);
                    }
                }
                
                await writer.close();
                
                log(`文件发送完成: ${selectedFile}`);
                updateFileStatus('文件发送完成', 'success');
                progressBar.style.width = '100%';
            } catch (error) {
                log(`文件发送失败: ${error.message}`, 'error');
                updateFileStatus('文件发送失败', 'error');
                progressBar.style.width = '0%';
                
                // 出错时尝试关闭串口
                try {
                    if (port) {
                        await port.close();
                        port = null;
                        openPortBtn.disabled = false;
                        closePortBtn.disabled = true;
                        sendFileBtn.disabled = true;
                        portInfoDiv.textContent = '未选择';
                    }
                } catch (closeError) {
                    log(`关闭串口失败: ${closeError.message}`, 'error');
                }
            }
        }
        
        // 更新串口状态显示
        function updatePortStatus(message, type) {
            portStatusDiv.textContent = message;
            portStatusDiv.className = `status ${type}`;
        }
        
        // 更新文件状态显示
        function updateFileStatus(message, type) {
            fileStatusDiv.textContent = message;
            fileStatusDiv.className = `status ${type}`;
        }
        
        // 日志输出
        function log(message, type = 'info') {
            const now = new Date();
            const timeStr = now.toTimeString().split(' ')[0];
            const logEntry = document.createElement('div');
            logEntry.textContent = `[${timeStr}] ${message}`;
            
            if (type === 'error') {
                logEntry.style.color = 'red';
            } else if (type === 'success') {
                logEntry.style.color = 'green';
            }
            
            logOutputDiv.appendChild(logEntry);
            logOutputDiv.scrollTop = logOutputDiv.scrollHeight;
        }