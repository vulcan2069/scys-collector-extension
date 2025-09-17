console.log('🚀 生财收藏扩展 - popup-final-fixed.js 开始加载');

class PopupManager {
    constructor() {
        console.log('🏗️ PopupManager构造函数调用');
        this.currentTab = null;
        this.isLoading = false;
        this.debugMode = false; // 调试模式：true=保存后不自动关闭窗口，false=正常模式
        this.testMode = false; // 测试模式：true=逐字段测试，false=正常保存
        this.tags = []; // 标签数组
        console.log(`🐛 调试模式: ${this.debugMode ? '开启' : '关闭'}`);
        console.log(`🧪 测试模式: ${this.testMode ? '开启' : '关闭'}`);
    }

    // 显示状态消息
    showStatus(message, type = 'info') {
        console.log(`📢 显示状态: ${type} - ${message}`);
        const statusArea = document.getElementById('statusArea');
        if (!statusArea) return;

        const statusDiv = document.createElement('div');
        statusDiv.className = `status ${type}`;
        statusDiv.textContent = message;

        statusArea.textContent = '';
        statusArea.appendChild(statusDiv);

        setTimeout(() => {
            if (statusDiv.parentNode) {
                statusDiv.remove();
            }
        }, type === 'error' ? 8000 : 5000);
    }

    // 更新状态栏
    updateStatusBar(text, type = 'info') {
        const statusBar = document.getElementById('statusBar');
        if (statusBar) {
            statusBar.textContent = text;
            statusBar.className = `status-bar ${type}`;
        }
    }

    // 更新保存按钮状态
    updateSaveButton() {
        const saveBtn = document.getElementById('saveBtn');
        const title = document.getElementById('title').value;
        const type = document.getElementById('type').value;

        if (title.trim() && type && !this.isLoading) {
            saveBtn.disabled = false;
            saveBtn.textContent = '保存收藏';
        } else {
            saveBtn.disabled = true;
            saveBtn.textContent = this.isLoading ? '正在处理...' : '保存收藏';
        }
    }

    // 设置加载状态
    setLoading(loading) {
        this.isLoading = loading;
        this.updateSaveButton();
    }

    // 检查是否为生财网站
    isScysUrl(url) {
        return url && (url.includes('scys.com') || url.includes('test-scys-page.html'));
    }

    // 初始化
    async init() {
        console.log('🚀 开始初始化PopupManager');
        try {
            this.updateStatusBar('正在初始化...', 'info');

            // 获取当前标签页
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            this.currentTab = tab;
            console.log('📋 当前标签页:', tab.url);

            // 检查是否为生财网站或测试页面
            const isTestPage = tab.url.includes('test-scys-page.html');
            const isScysUrl = this.isScysUrl(tab.url);
            console.log('🔍 页面检查:', { isScysUrl, isTestPage, url: tab.url });

            if (!isScysUrl && !isTestPage) {
                this.updateStatusBar('当前页面不是生财网站', 'warning');
                this.showStatus('请在生财网站页面使用此扩展', 'warning');
                console.log('⚠️ 页面不符合要求，使用基础信息');
                this.fillBasicInfo();
                return;
            }

            this.updateStatusBar('正在获取页面信息...', 'info');

            // 测试content script连接
            const connected = await this.testContentScript();
            if (!connected) {
                console.log('❌ Content Script连接失败，使用基础信息');
                this.fillBasicInfo();
                return;
            }

            // 提取页面信息
            await this.extractPageInfo();

            // 检查配置状态
            await this.checkConfigStatus();

        } catch (error) {
            console.error('❌ 初始化失败:', error);
            this.updateStatusBar('初始化失败', 'error');
            this.showStatus(`初始化失败: ${error.message}`, 'error');
            this.fillBasicInfo();
        }
    }

    // 测试content script连接
    async testContentScript() {
        try {
            console.log('🔗 测试Content Script连接...');

            const response = await new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error('连接超时'));
                }, 5000);

                chrome.tabs.sendMessage(this.currentTab.id, { action: 'checkDomain' }, (response) => {
                    clearTimeout(timeout);
                    if (chrome.runtime.lastError) {
                        reject(new Error(chrome.runtime.lastError.message));
                    } else {
                        resolve(response);
                    }
                });
            });

            console.log('📨 Content Script响应:', response);

            if (response && response.isValidPage) {
                console.log('✅ Content Script连接成功');
                return true;
            } else {
                console.log('❌ Content Script响应无效, 期望isValidPage为true, 实际:', response);
                return false;
            }

        } catch (error) {
            console.error('❌ Content Script连接失败:', error);
            this.showStatus('页面脚本连接失败，请刷新页面后重试', 'warning');
            return false;
        }
    }

    // 提取页面信息
    async extractPageInfo() {
        try {
            console.log('📝 开始提取页面信息...');

            const response = await new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error('获取页面信息超时'));
                }, 10000);

                chrome.tabs.sendMessage(this.currentTab.id, { action: 'getPageInfo' }, (response) => {
                    clearTimeout(timeout);
                    if (chrome.runtime.lastError) {
                        reject(new Error(chrome.runtime.lastError.message));
                    } else {
                        resolve(response);
                    }
                });
            });

            console.log('📨 getPageInfo响应:', response);

            if (response && response.success) {
                console.log('✅ 页面信息提取成功:', response.data);
                this.fillPageData(response.data);
                this.updateStatusBar('页面信息获取成功', 'success');
            } else {
                console.log('❌ getPageInfo响应格式错误或失败:', response);
                throw new Error(response?.error || '页面信息提取失败');
            }

        } catch (error) {
            console.error('❌ 页面信息提取失败:', error);
            this.showStatus(`页面信息获取失败: ${error.message}`, 'error');
            this.fillBasicInfo();
        }
    }

    // 填充页面数据
    fillPageData(data) {
        console.log('📝 填充页面数据:', data);

        if (data.title) {
            document.getElementById('title').value = data.title;
        }

        if (data.author) {
            document.getElementById('author').value = data.author;
        }

        if (data.contentType) {
            document.getElementById('type').value = data.contentType;
        }

        if (data.url) {
            document.getElementById('url').value = data.url;
        }

        if (data.isFeatured !== undefined) {
            document.getElementById('featured').value = data.isFeatured ? '是' : '否';
        }

        // 设置默认阅读状态为"否"
        document.getElementById('isRead').value = '否';

        if (data.feishuLink) {
            document.getElementById('feishuLink').value = data.feishuLink;
        }

        // 根据内容智能推荐标签
        this.suggestTags(data);

        this.updateSaveButton();
    }

    // 标签管理方法
    initTagsInput() {
        const tagInput = document.getElementById('tagInput');
        const tagsDisplay = document.getElementById('tagsDisplay');

        if (!tagInput || !tagsDisplay) {
            console.warn('标签输入元素未找到');
            return;
        }

        // 监听回车键添加标签
        tagInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.addTagFromInput();
            }
        });

        // 监听失去焦点时添加标签
        tagInput.addEventListener('blur', () => {
            this.addTagFromInput();
        });

        // 初始化显示
        this.renderTags();
    }

    addTagFromInput() {
        const tagInput = document.getElementById('tagInput');
        const value = tagInput.value.trim();

        if (!value) return;

        // 支持中英文逗号分隔的多个标签
        const newTags = value.split(/[,，]/).map(tag => tag.trim()).filter(tag => tag);

        for (const tag of newTags) {
            this.addTag(tag);
        }

        tagInput.value = '';
    }

    addTag(tagText) {
        if (!tagText || this.tags.includes(tagText)) {
            return;
        }

        this.tags.push(tagText);
        this.renderTags();
        console.log('添加标签:', tagText, '当前标签:', this.tags);
    }

    removeTag(tagText) {
        const index = this.tags.indexOf(tagText);
        if (index > -1) {
            this.tags.splice(index, 1);
            this.renderTags();
            console.log('移除标签:', tagText, '当前标签:', this.tags);
        }
    }

    renderTags() {
        const tagsDisplay = document.getElementById('tagsDisplay');
        if (!tagsDisplay) return;

        tagsDisplay.innerHTML = '';

        this.tags.forEach(tag => {
            const tagElement = document.createElement('div');
            tagElement.className = 'tag-item';
            tagElement.innerHTML = `
                <span>${tag}</span>
                <button type="button" class="tag-remove" data-tag="${tag}">×</button>
            `;

            // 绑定删除事件
            const removeBtn = tagElement.querySelector('.tag-remove');
            removeBtn.addEventListener('click', () => {
                this.removeTag(tag);
            });

            tagsDisplay.appendChild(tagElement);
        });
    }

    getTags() {
        return [...this.tags]; // 返回标签数组的副本
    }

    // 智能标签推荐
    suggestTags(data) {
        const suggestedTags = [];

        // 根据内容类型推荐
        if (data.contentType === '课程') {
            suggestedTags.push('学习', '教程');
        } else if (data.contentType === '直播') {
            suggestedTags.push('直播', '分享');
        } else if (data.contentType === '文章') {
            suggestedTags.push('文章');
        }

        // 根据标题关键词推荐
        if (data.title) {
            const title = data.title.toLowerCase();
            if (title.includes('ai') || title.includes('人工智能')) {
                suggestedTags.push('AI');
            }
            if (title.includes('seo') || title.includes('搜索引擎')) {
                suggestedTags.push('SEO');
            }
            if (title.includes('运营') || title.includes('营销')) {
                suggestedTags.push('运营');
            }
            if (title.includes('创业') || title.includes('商业')) {
                suggestedTags.push('创业');
            }
            if (title.includes('技术') || title.includes('开发')) {
                suggestedTags.push('技术');
            }
            if (title.includes('赚钱') || title.includes('收入') || title.includes('变现')) {
                suggestedTags.push('变现');
            }
        }

        // 精华内容推荐特殊标签
        if (data.isFeatured) {
            suggestedTags.push('精华');
        }

        // 去重并添加到标签列表
        const uniqueTags = [...new Set(suggestedTags)];
        uniqueTags.forEach(tag => {
            if (!this.tags.includes(tag)) {
                this.addTag(tag);
            }
        });

        if (uniqueTags.length > 0) {
            console.log('🏷️ 智能推荐标签:', uniqueTags);
        }
    }

    // 填充基础信息（后备方案）
    fillBasicInfo() {
        if (this.currentTab) {
            document.getElementById('title').value = this.currentTab.title || '无标题';
            document.getElementById('url').value = this.currentTab.url || '';
            document.getElementById('type').value = '文章';
            this.updateSaveButton();
        }
    }

    // 保存收藏
    async saveCollection() {
        console.log('💾 开始保存收藏流程...');
        try {
            const formData = this.getFormData();
            console.log('📝 表单数据:', formData);

            if (!this.validateForm(formData)) {
                console.log('❌ 表单验证失败');
                return;
            }
            console.log('✅ 表单验证通过');

            // 检查配置
            console.log('🔍 检查配置状态...');
            const configValid = await this.checkConfigStatus();
            if (!configValid) {
                console.log('❌ 配置检查失败');
                this.showStatus('请先配置飞书设置', 'warning');
                return;
            }
            console.log('✅ 配置检查通过');

            this.setLoading(true);
            this.updateStatusBar('正在保存到飞书...', 'info');

            // 获取飞书配置
            const result = await chrome.storage.local.get(['feishuConfig']);
            const config = result.feishuConfig;
            console.log('📋 当前配置:', config);

            if (!config || !config.appId || !config.appSecret || !config.appToken || !config.tableId) {
                console.log('❌ 配置不完整，缺少字段:', {
                    hasAppId: !!config?.appId,
                    hasAppSecret: !!config?.appSecret,
                    hasAppToken: !!config?.appToken,
                    hasTableId: !!config?.tableId
                });
                throw new Error('飞书配置不完整');
            }

            // 获取 tenant_access_token
            console.log('🔑 获取访问令牌...');

            // 先测试网络连接
            console.log('🌐 测试网络连接...');
            try {
                const testResponse = await fetch('https://open.feishu.cn', { method: 'HEAD' });
                console.log('✅ 网络连接正常，飞书域名可访问');
            } catch (testError) {
                console.log('❌ 网络连接测试失败:', testError.message);
                throw new Error(`无法连接到飞书服务器，请检查网络连接：${testError.message}`);
            }

            const tenantAccessToken = await this.getTenantAccessToken(config.appId, config.appSecret);

            // 获取表格字段信息
            console.log('📋 获取表格字段信息...');
            const tableFields = await this.getTableFields(config.appToken, config.tableId, tenantAccessToken);
            console.log('📋 表格字段列表:', tableFields);

            // 根据模式选择测试方式
            if (this.testMode) {
                console.log('🧪 开始逐字段测试模式...');
                await this.testFieldsIndividually(formData, tableFields, config, tenantAccessToken);
                return;
            }

            // 正常模式：一次性保存所有字段
            let fields = this.buildFieldsData(formData, tableFields);
            let recordData = { fields };

            console.log('🔧 智能匹配后的字段格式:', fields);
            console.log('📤 准备保存到飞书:', recordData);

            // 调用飞书API - 带有回退机制
            const apiUrl = `https://open.feishu.cn/open-apis/bitable/v1/apps/${config.appToken}/tables/${config.tableId}/records`;
            console.log('🌐 API URL:', apiUrl);
            console.log('🔑 使用令牌:', tenantAccessToken ? '已获取' : '未获取');

            let response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${tenantAccessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(recordData)
            });

            console.log('📡 API响应状态:', response.status, response.statusText);

            // 检查第一次请求的结果
            let responseData;
            if (response.ok) {
                responseData = await response.json();
                console.log('📨 飞书API完整响应:', responseData);

                // 如果URL格式失败，尝试使用纯文本格式
                if (responseData.code === 1254068 && responseData.msg === 'URLFieldConvFail') {
                    console.log('🔄 URL格式失败，尝试纯文本格式...');

                    // 重新构建数据，所有字段都使用文本格式
                    fields = this.buildFieldsDataAsText(formData, tableFields);
                    recordData = { fields };

                    console.log('📝 纯文本格式:', fields);

                    response = await fetch(apiUrl, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${tenantAccessToken}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(recordData)
                    });

                    console.log('📡 重试响应状态:', response.status, response.statusText);

                    // 读取重试的响应
                    if (response.ok) {
                        responseData = await response.json();
                        console.log('📨 重试API响应:', responseData);
                    }
                }
            }

            // 处理最终响应
            if (response.ok && responseData) {
                // 飞书API即使返回200状态码，也可能在响应体中包含错误信息
                if (responseData.code === 0) {
                    console.log('✅ 飞书API保存成功:', responseData);
                    this.updateStatusBar('保存成功', 'success');

                    if (this.debugMode) {
                        this.showStatus('✅ 内容已成功保存到飞书表格！(调试模式：窗口保持打开)', 'success');
                        console.log('🐛 调试模式开启，保存成功后不关闭窗口');
                    } else {
                        this.showStatus('内容已成功保存到飞书表格！窗口将在3秒后关闭', 'success');
                        setTimeout(() => {
                            window.close();
                        }, 3000);
                    }
                } else {
                    // 飞书API返回了业务错误
                    console.log('❌ 飞书API业务错误:', responseData);
                    let errorMessage = `飞书API错误 (${responseData.code}): ${responseData.msg}`;

                    // 针对具体错误提供建议
                    if (responseData.msg === 'URLFieldConvFail') {
                        errorMessage += '\n\n问题：URL字段格式不正确\n建议：请检查飞书表格中的URL字段设置，确保字段类型为"URL"类型';
                    } else if (responseData.msg.includes('permission')) {
                        errorMessage += '\n\n问题：权限不足\n建议：请检查应用权限和表格访问权限';
                    } else if (responseData.msg.includes('field')) {
                        errorMessage += '\n\n问题：字段不匹配\n建议：请检查表格字段名称是否与扩展期望的完全一致';
                    }

                    throw new Error(errorMessage);
                }
            } else if (!response.ok) {
                let errorData;
                try {
                    errorData = await response.json();
                } catch (e) {
                    errorData = { message: '无法解析错误响应' };
                }
                console.log('❌ HTTP错误响应:', errorData);
                throw new Error(`HTTP错误: ${response.status} - ${errorData.msg || errorData.message || '未知错误'}`);
            } else {
                throw new Error('未知的响应状态');
            }

        } catch (error) {
            console.error('❌ 保存失败:', error);
            this.updateStatusBar('保存失败 - 窗口将保持打开以查看错误详情', 'error');
            this.showStatus(`保存失败: ${error.message}`, 'error');

            // 失败时不关闭窗口，让用户可以看到错误信息
            console.log('🔍 保存失败，窗口将保持打开以便查看错误详情');
            console.log('📋 错误详情:', {
                message: error.message,
                stack: error.stack,
                timestamp: new Date().toISOString()
            });

            // 提供具体的错误建议
            if (error.message.includes('401') || error.message.includes('403')) {
                this.showStatus('权限错误，请检查飞书配置和表格权限', 'warning');
            } else if (error.message.includes('网络') || error.message.includes('fetch') || error.message.includes('Failed to fetch')) {
                this.showStatus('网络错误，请检查网络连接和防火墙设置', 'warning');
            } else if (error.message.includes('CORS')) {
                this.showStatus('跨域访问被阻止，请检查飞书应用配置', 'warning');
            }

            // 显示重试按钮
            setTimeout(() => {
                this.showStatus('如需重试，请重新点击保存按钮', 'info');
            }, 2000);
        } finally {
            this.setLoading(false);
        }
    }

    // 获取表单数据
    getFormData() {
        return {
            title: document.getElementById('title').value.trim(),
            type: document.getElementById('type').value,
            author: document.getElementById('author').value.trim(),
            featured: document.getElementById('featured').value,
            isRead: document.getElementById('isRead').value,
            feishuLink: document.getElementById('feishuLink').value.trim(),
            url: document.getElementById('url').value.trim(),
            inspiration: document.getElementById('inspiration').value.trim(),
            tags: this.getTags(),
            timestamp: Date.now()
        };
    }

    // 验证表单
    validateForm(data) {
        if (!data.title) {
            this.showStatus('请输入文章标题', 'warning');
            document.getElementById('title').focus();
            return false;
        }

        if (!data.type) {
            this.showStatus('请选择内容类型', 'warning');
            document.getElementById('type').focus();
            return false;
        }

        return true;
    }

    // 打开配置页面
    openConfigPage() {
        chrome.tabs.create({
            url: chrome.runtime.getURL('feishu-config-new.html')
        });
    }

    // 检查配置状态
    async checkConfigStatus() {
        try {
            const result = await chrome.storage.local.get(['feishuConfig']);
            const config = result.feishuConfig;
            const configStatus = document.getElementById('configStatus');

            if (!config || !config.appId || !config.appSecret || !config.tableUrl || !config.appToken || !config.tableId) {
                if (configStatus) configStatus.style.display = 'block';
                return false;
            } else {
                if (configStatus) configStatus.style.display = 'none';
                return true;
            }
        } catch (error) {
            console.error('❌ 检查配置状态失败:', error);
            return false;
        }
    }

    // 逐字段测试功能
    async testFieldsIndividually(formData, tableFields, config, tenantAccessToken) {
        console.log('🧪 开始逐字段测试，每次只测试一个字段...');

        const apiUrl = `https://open.feishu.cn/open-apis/bitable/v1/apps/${config.appToken}/tables/${config.tableId}/records`;
        const fieldMapping = {
            title: ['文章名称', '标题', 'title', '名称'],
            type: ['类型', 'type', '分类'],
            author: ['作者', 'author', '发布者'],
            featured: ['精华', '是否精华', 'featured', '标记'],
            isRead: ['阅读', '是否已阅读', 'isRead', '已阅读'],
            url: ['生财链接', '原链接', 'url', '链接'],
            feishuLink: ['飞书链接', '飞书文档', '文档链接', 'feishu'],
            inspiration: ['启发感悟', '感悟', '备注', '说明', 'note'],
            tags: ['标签', 'tags', '分类标签', 'tag']
        };

        const results = {};

        for (const [formField, value] of Object.entries(formData)) {
            if (!value || formField === 'timestamp') continue;

            const possibleNames = fieldMapping[formField] || [formField];
            const matchedField = this.findMatchingField(possibleNames, tableFields);

            if (!matchedField) {
                console.log(`⚠️ 跳过未匹配字段: ${formField}`);
                continue;
            }

            console.log(`\n🧪 测试字段: ${formField} -> ${matchedField.name} (类型: ${matchedField.type})`);

            // 构建单字段测试数据
            const testFields = {};

            // 根据字段类型处理格式
            if (matchedField.type === 7) {
                // 复选框字段 - 尝试不同格式
                console.log(`📋 复选框字段，当前值: "${value}"`);

                // 尝试多种格式
                const formats = [
                    value === '是' ? true : false,
                    value === '是' ? 'true' : 'false',
                    value,
                    value === '是' ? 1 : 0
                ];

                for (let i = 0; i < formats.length; i++) {
                    const format = formats[i];
                    testFields[matchedField.name] = format;

                    console.log(`📝 复选框格式${i+1}: ${typeof format} - ${format}`);

                    const success = await this.testSingleField(testFields, apiUrl, tenantAccessToken, `${formField}(格式${i+1})`);
                    if (success) {
                        results[formField] = { field: matchedField, format: format, formatType: typeof format };
                        break;
                    }
                }
            } else if ((matchedField.type === 11 || matchedField.type === 15) && (formField === 'url' || formField === 'feishuLink')) {
                // URL字段 - 尝试两种格式
                console.log(`🔗 URL字段，当前值: "${value}"`);

                const formats = [
                    { text: value, link: value },
                    value
                ];

                for (let i = 0; i < formats.length; i++) {
                    const format = formats[i];
                    testFields[matchedField.name] = format;

                    console.log(`📝 URL格式${i+1}:`, format);

                    const success = await this.testSingleField(testFields, apiUrl, tenantAccessToken, `${formField}(格式${i+1})`);
                    if (success) {
                        results[formField] = { field: matchedField, format: format, formatType: typeof format };
                        break;
                    }
                }
            } else if (matchedField.type === 4 && Array.isArray(value)) {
                // 多选字段 - 标签数组，尝试多种格式
                console.log(`🏷️ 多选字段，当前值:`, value);

                // 飞书多选字段格式: ["标签1", "标签2", "标签3"]
                testFields[matchedField.name] = value;

                console.log(`📝 多选格式(字符串数组):`, value);

                const success = await this.testSingleField(testFields, apiUrl, tenantAccessToken, formField);
                if (success) {
                    results[formField] = { field: matchedField, format: value, formatType: 'array' };
                }
            } else {
                // 普通文本字段
                console.log(`📝 文本字段，当前值: "${value}"`);
                testFields[matchedField.name] = value;

                const success = await this.testSingleField(testFields, apiUrl, tenantAccessToken, formField);
                if (success) {
                    results[formField] = { field: matchedField, format: value, formatType: typeof value };
                }
            }

            // 每次测试后短暂延迟
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        console.log('\n📊 逐字段测试结果汇总:');
        console.log(results);

        // 提供最终建议
        const successfulFields = Object.keys(results);
        const failedFields = Object.keys(formData).filter(f => f !== 'timestamp' && !successfulFields.includes(f));

        this.showStatus(`测试完成！成功字段: ${successfulFields.length}，失败字段: ${failedFields.length}`, 'info');
        console.log(`✅ 成功字段: ${successfulFields.join(', ')}`);
        console.log(`❌ 失败字段: ${failedFields.join(', ')}`);
    }

    // 测试单个字段
    async testSingleField(fields, apiUrl, tenantAccessToken, fieldName) {
        try {
            const recordData = { fields };
            console.log(`📤 测试数据:`, recordData);

            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${tenantAccessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(recordData)
            });

            if (response.ok) {
                const responseData = await response.json();
                if (responseData.code === 0) {
                    console.log(`✅ ${fieldName} 测试成功!`);
                    return true;
                } else {
                    console.log(`❌ ${fieldName} 测试失败: ${responseData.msg}`);
                    return false;
                }
            } else {
                console.log(`❌ ${fieldName} HTTP错误: ${response.status}`);
                return false;
            }
        } catch (error) {
            console.log(`❌ ${fieldName} 异常: ${error.message}`);
            return false;
        }
    }

    // 智能构建字段数据
    buildFieldsData(formData, tableFields) {
        console.log('🎯 开始智能字段匹配...');
        const fields = {};

        // 定义字段映射规则
        const fieldMapping = {
            title: ['文章名称', '标题', 'title', '名称'],
            type: ['类型', 'type', '分类'],
            author: ['作者', 'author', '发布者'],
            featured: ['精华', '是否精华', 'featured', '标记'],
            isRead: ['阅读', '是否已阅读', 'isRead', '已阅读'],
            url: ['生财链接', '原链接', 'url', '链接'],
            feishuLink: ['飞书链接', '飞书文档', '文档链接', 'feishu'],
            inspiration: ['启发感悟', '感悟', '备注', '说明', 'note'],
            tags: ['标签', 'tags', '分类标签', 'tag']
        };

        // 为每个表单字段寻找匹配的表格字段
        for (const [formField, value] of Object.entries(formData)) {
            if (!value) continue; // 跳过空值

            const possibleNames = fieldMapping[formField] || [formField];
            const matchedField = this.findMatchingField(possibleNames, tableFields);

            if (matchedField) {
                console.log(`✅ 字段匹配: ${formField} -> ${matchedField.name} (${matchedField.type})`);

                // 根据字段类型处理数据格式
                if (matchedField.type === 7) {
                    // 复选框字段 - 根据测试结果使用boolean格式
                    console.log(`☑️ 复选框字段 (类型${matchedField.type}): ${matchedField.name}`);
                    fields[matchedField.name] = value === '是' ? true : false;
                } else if (matchedField.type === 15) {
                    // URL字段 - 根据测试结果使用复合对象格式 {text: url, link: url}
                    console.log(`🔗 URL字段 (类型${matchedField.type}): ${matchedField.name}`);
                    fields[matchedField.name] = {
                        text: value,
                        link: value
                    };
                } else if (matchedField.type === 4 && Array.isArray(value)) {
                    // 多选字段 - 简单字符串数组格式
                    console.log(`🏷️ 多选字段 (类型${matchedField.type}): ${matchedField.name}`);
                    fields[matchedField.name] = value;
                } else {
                    // 普通文本字段
                    console.log(`📝 文本字段 (类型${matchedField.type}): ${matchedField.name}`);
                    fields[matchedField.name] = value;
                }
            } else {
                console.log(`⚠️ 未找到匹配字段: ${formField} (值: ${value})`);
                console.log(`📋 可用字段: ${tableFields.map(f => f.name).join(', ')}`);
            }
        }

        return fields;
    }

    // 构建混合格式的字段数据（回退方案）
    buildFieldsDataAsText(formData, tableFields) {
        console.log('📝 使用混合格式构建字段数据...');
        const fields = {};

        const fieldMapping = {
            title: ['文章名称', '标题', 'title', '名称'],
            type: ['类型', 'type', '分类'],
            author: ['作者', 'author', '发布者'],
            featured: ['精华', '是否精华', 'featured', '标记'],
            isRead: ['阅读', '是否已阅读', 'isRead', '已阅读'],
            url: ['生财链接', '原链接', 'url', '链接'],
            feishuLink: ['飞书链接', '飞书文档', '文档链接', 'feishu'],
            inspiration: ['启发感悟', '感悟', '备注', '说明', 'note'],
            tags: ['标签', 'tags', '分类标签', 'tag']
        };

        for (const [formField, value] of Object.entries(formData)) {
            if (!value || formField === 'timestamp') continue;

            const possibleNames = fieldMapping[formField] || [formField];
            const matchedField = this.findMatchingField(possibleNames, tableFields);

            if (matchedField) {
                // 保持各字段类型的正确格式，只有URL字段改为文本
                if (matchedField.type === 7) {
                    // 复选框字段仍然使用boolean
                    console.log(`☑️ 混合格式-复选框字段: ${formField} -> ${matchedField.name} = ${value === '是' ? true : false}`);
                    fields[matchedField.name] = value === '是' ? true : false;
                } else if (matchedField.type === 4 && Array.isArray(value)) {
                    // 多选字段 - 简单字符串数组格式
                    console.log(`🏷️ 混合格式-多选字段: ${formField} -> ${matchedField.name} = ${JSON.stringify(value)}`);
                    fields[matchedField.name] = value;
                } else {
                    // 其他字段使用文本格式
                    console.log(`📝 混合格式-文本字段: ${formField} -> ${matchedField.name} = "${value}"`);
                    fields[matchedField.name] = String(value);
                }
            }
        }

        return fields;
    }

    // 寻找匹配的字段
    findMatchingField(possibleNames, tableFields) {
        for (const name of possibleNames) {
            const field = tableFields.find(f =>
                f.name === name ||
                f.name.toLowerCase() === name.toLowerCase() ||
                f.name.includes(name) ||
                name.includes(f.name)
            );
            if (field) return field;
        }
        return null;
    }

    // 获取表格字段信息
    async getTableFields(appToken, tableId, accessToken) {
        try {
            console.log('📋 请求表格字段信息...');
            const apiUrl = `https://open.feishu.cn/open-apis/bitable/v1/apps/${appToken}/tables/${tableId}/fields`;

            const response = await fetch(apiUrl, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            });

            console.log('📡 字段查询响应状态:', response.status, response.statusText);

            if (!response.ok) {
                throw new Error(`获取字段信息失败: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            console.log('📨 字段查询响应:', data);

            if (data.code === 0) {
                return data.data.items.map(field => ({
                    name: field.field_name,
                    type: field.type,
                    id: field.field_id
                }));
            } else {
                throw new Error(`获取字段信息API错误: ${data.msg}`);
            }
        } catch (error) {
            console.error('❌ 获取表格字段失败:', error);
            throw error;
        }
    }

    // 获取tenant_access_token
    async getTenantAccessToken(appId, appSecret) {
        try {
            console.log('🔑 开始获取tenant_access_token...');
            console.log('📋 使用的凭据:', { appId: appId ? '已设置' : '未设置', appSecret: appSecret ? '已设置' : '未设置' });

            const requestData = {
                app_id: appId,
                app_secret: appSecret
            };

            console.log('📤 发送请求到飞书API:', 'https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal');

            const response = await fetch('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestData)
            });

            console.log('📡 飞书认证API响应状态:', response.status, response.statusText);

            if (!response.ok) {
                throw new Error(`HTTP错误: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            console.log('📨 飞书认证API响应数据:', data);

            if (data.code === 0) {
                console.log('✅ 成功获取access_token');
                return data.tenant_access_token;
            } else {
                throw new Error(`获取access_token失败: ${data.msg || data.message || '未知错误'}`);
            }
        } catch (error) {
            console.error('❌ 获取access_token详细错误:', error);

            // 提供更详细的错误信息
            if (error.message.includes('Failed to fetch')) {
                throw new Error(`网络连接失败，请检查：
1. 网络连接是否正常
2. 防火墙是否阻止访问
3. 稍后重试

原始错误: ${error.message}`);
            } else if (error.message.includes('CORS')) {
                throw new Error(`跨域访问被拦截，这是浏览器安全限制。请检查飞书应用配置。`);
            } else {
                throw new Error(`获取access_token异常: ${error.message}`);
            }
        }
    }

    // 绑定事件
    bindEvents() {
        console.log('🔗 开始绑定事件');

        // 配置按钮
        const configBtn = document.getElementById('configBtn');
        if (configBtn) {
            configBtn.addEventListener('click', () => {
                console.log('⚙️ 配置按钮被点击');
                this.openConfigPage();
            });
        }

        // 取消按钮
        const cancelBtn = document.getElementById('cancelBtn');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                console.log('❌ 取消按钮被点击');
                window.close();
            });
        }

        // 保存按钮
        const saveBtn = document.getElementById('saveBtn');
        if (saveBtn) {
            console.log('✅ 找到保存按钮，绑定点击事件');
            saveBtn.addEventListener('click', () => {
                console.log('🖱️ 保存按钮被点击!');
                this.saveCollection();
            });
        } else {
            console.error('❌ 找不到保存按钮!');
        }

        // 表单变化监听
        ['title', 'type'].forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('input', () => {
                    this.updateSaveButton();
                });
            }
        });

        // 回车键保存
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && e.ctrlKey) {
                const saveBtn = document.getElementById('saveBtn');
                if (saveBtn && !saveBtn.disabled) {
                    this.saveCollection();
                }
            }
        });

        console.log('✅ 事件绑定完成');

        // 初始化标签输入
        this.initTagsInput();
        console.log('✅ 标签输入初始化完成');
    }
}

// 页面加载完成后初始化
console.log('📄 准备初始化PopupManager');

document.addEventListener('DOMContentLoaded', function() {
    console.log('📄 DOM内容已加载，开始创建PopupManager');

    try {
        const popupManager = new PopupManager();
        console.log('✅ PopupManager实例创建成功');

        popupManager.bindEvents();
        popupManager.init();

    } catch (error) {
        console.error('❌ PopupManager创建失败:', error);
    }
});

console.log('🚀 popup-final-fixed.js 加载完成');