// 生财收藏扩展 - 飞书配置管理器（参考options.js实现）
class ScysFeishuConfigManager {
    constructor() {
        this.init();
    }

    async init() {
        await this.loadConfig();
        this.bindEvents();
        this.updateConfigStatus();
    }

    async loadConfig() {
        try {
            const result = await chrome.storage.local.get(['feishuConfig']);
            const config = result.feishuConfig;

            if (config) {
                if (config.appId) {
                    document.getElementById('appId').value = config.appId;
                }
                if (config.appSecret) {
                    document.getElementById('appSecret').value = config.appSecret;
                }
                if (config.tableUrl) {
                    document.getElementById('tableUrl').value = config.tableUrl;
                }
            }
        } catch (error) {
            console.error('加载配置失败:', error);
            this.showMessage('加载配置失败', 'error');
        }
    }

    bindEvents() {
        // 保存配置
        document.getElementById('configForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleSave();
        });

        // 测试连接
        document.getElementById('testBtn').addEventListener('click', () => {
            this.handleTest();
        });

        // 实时验证输入
        const inputs = document.querySelectorAll('#appId, #appSecret, #tableUrl');
        inputs.forEach(input => {
            input.addEventListener('input', () => {
                this.updateConfigStatus();
            });
        });
    }

    async handleSave() {
        const formData = this.getFormData();

        if (!this.validateForm(formData)) {
            return;
        }

        this.setButtonLoading('saveBtn', true);

        try {
            // 从URL中提取appToken和tableId
            const urlInfo = this.parseTableUrl(formData.tableUrl);

            const config = {
                appId: formData.appId,
                appSecret: formData.appSecret,
                tableUrl: formData.tableUrl,
                appToken: urlInfo.appToken,
                tableId: urlInfo.tableId,
                lastUpdated: Date.now()
            };

            await chrome.storage.local.set({ feishuConfig: config });

            this.showMessage('配置保存成功！现在可以使用生财收藏功能了', 'success');
            this.updateConfigStatus();
        } catch (error) {
            console.error('保存配置失败:', error);
            this.showMessage('保存配置失败: ' + (error.message || '未知错误'), 'error');
        } finally {
            this.setButtonLoading('saveBtn', false);
        }
    }

    async handleTest() {
        const formData = this.getFormData();

        if (!this.validateForm(formData)) {
            return;
        }

        this.setButtonLoading('testBtn', true);
        this.setTestStatus('testing', '测试中...');

        try {
            // 从URL中提取appToken和tableId
            const urlInfo = this.parseTableUrl(formData.tableUrl);

            // 第一步：获取访问令牌
            this.showMessage('正在获取访问令牌...', 'info');
            const tenantAccessToken = await this.getTenantAccessToken(formData.appId, formData.appSecret);

            // 第二步：测试访问多维表格
            this.showMessage('正在测试多维表格访问...', 'info');
            const apiUrl = `https://open.feishu.cn/open-apis/bitable/v1/apps/${urlInfo.appToken}/tables/${urlInfo.tableId}/records`;

            const response = await fetch(apiUrl, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${tenantAccessToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.setTestStatus('success', '连接成功');

                let message = '连接测试成功！';
                if (data.data && data.data.items) {
                    message += `\n表格当前有 ${data.data.items.length} 条记录`;
                }

                this.showMessage(message, 'success');
            } else {
                const errorData = await response.json();
                throw new Error(`API返回错误: ${response.status} - ${errorData.msg || errorData.message || '未知错误'}`);
            }

        } catch (error) {
            console.error('测试连接失败:', error);
            this.setTestStatus('error', '连接失败');

            let errorMsg = '连接测试失败: ' + error.message;

            // 针对常见错误提供帮助信息
            if (error.message.includes('获取access_token失败')) {
                errorMsg += '\n请检查 App ID 和 App Secret 是否正确';
            } else if (error.message.includes('401') || error.message.includes('403')) {
                errorMsg += '\n请检查应用权限配置和表格访问权限';
            } else if (error.message.includes('404')) {
                errorMsg += '\n请检查表格URL是否正确，确保表格存在';
            } else if (error.message.includes('表格URL格式错误')) {
                errorMsg += '\n请输入完整的飞书多维表格URL';
            }

            this.showMessage(errorMsg, 'error');
        } finally {
            this.setButtonLoading('testBtn', false);
        }
    }

    // 获取tenant_access_token
    async getTenantAccessToken(appId, appSecret) {
        try {
            const response = await fetch('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    app_id: appId,
                    app_secret: appSecret
                })
            });

            const data = await response.json();

            if (data.code === 0) {
                return data.tenant_access_token;
            } else {
                throw new Error(`获取access_token失败: ${data.msg}`);
            }
        } catch (error) {
            throw new Error(`获取access_token异常: ${error.message}`);
        }
    }

    // 从表格URL中提取appToken和tableId
    parseTableUrl(url) {
        try {
            // 飞书表格URL格式: https://xxx.feishu.cn/base/{appToken}/...?table={tableId}&view={viewId}
            const urlObj = new URL(url);

            // 提取appToken (从路径中)
            const pathMatch = urlObj.pathname.match(/\/base\/([^\/]+)/);
            if (!pathMatch) {
                throw new Error('表格URL格式错误：无法提取App Token');
            }
            const appToken = pathMatch[1];

            // 提取tableId (从查询参数中)
            const tableId = urlObj.searchParams.get('table');
            if (!tableId) {
                throw new Error('表格URL格式错误：无法提取Table ID');
            }

            return { appToken, tableId };
        } catch (error) {
            throw new Error('表格URL格式错误: ' + error.message);
        }
    }

    getFormData() {
        return {
            appId: document.getElementById('appId').value.trim(),
            appSecret: document.getElementById('appSecret').value.trim(),
            tableUrl: document.getElementById('tableUrl').value.trim()
        };
    }

    validateForm(formData) {
        if (!formData.appId) {
            this.showMessage('请输入应用ID', 'error');
            document.getElementById('appId').focus();
            return false;
        }

        if (!formData.appSecret) {
            this.showMessage('请输入应用密钥', 'error');
            document.getElementById('appSecret').focus();
            return false;
        }

        if (!formData.tableUrl) {
            this.showMessage('请输入多维表格URL', 'error');
            document.getElementById('tableUrl').focus();
            return false;
        }

        if (!formData.tableUrl.includes('feishu.cn/base/')) {
            this.showMessage('请输入正确的飞书多维表格URL', 'error');
            document.getElementById('tableUrl').focus();
            return false;
        }

        return true;
    }

    setButtonLoading(buttonId, loading) {
        const button = document.getElementById(buttonId);
        const btnText = button.querySelector('.btn-text');
        const loadingText = button.querySelector('.loading');

        if (loading) {
            button.disabled = true;
            btnText.style.display = 'none';
            loadingText.style.display = 'inline';
        } else {
            button.disabled = false;
            btnText.style.display = 'inline';
            loadingText.style.display = 'none';
        }
    }

    setTestStatus(status, text) {
        const testStatus = document.getElementById('testStatus');
        testStatus.className = `status-value ${status}`;
        testStatus.textContent = text;
    }

    updateConfigStatus() {
        const formData = this.getFormData();
        const configStatus = document.getElementById('configStatus');

        if (formData.appId && formData.appSecret && formData.tableUrl) {
            configStatus.className = 'status-value success';
            configStatus.textContent = '已配置';
        } else {
            configStatus.className = 'status-value pending';
            configStatus.textContent = '未配置';
        }
    }

    showMessage(text, type = 'info') {
        // 使用与options.js相同的消息显示方式
        const messageContainer = document.getElementById('messageContainer');
        const messageElement = document.createElement('div');
        messageElement.className = `message ${type}`;
        messageElement.textContent = text;

        messageContainer.appendChild(messageElement);

        // 自动移除消息
        setTimeout(() => {
            if (messageElement.parentNode) {
                messageElement.remove();
            }
        }, type === 'error' ? 8000 : 5000);
    }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    new ScysFeishuConfigManager();
});