// 生财网站收藏扩展 - 完整版后台服务

// 导入干净版本的文件
importScripts('js/common-clean.js', 'js/record-manager-clean.js');

// 后台服务类
class ScysBackgroundService {
    constructor() {
        this.recordManager = new ScysRecordManager();
        this.init();
    }

    init() {
        // 监听来自popup和options的消息
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            this.handleMessage(message, sender, sendResponse);
            return true; // 保持消息通道开放以支持异步响应
        });

        console.log('生财收藏扩展后台服务已启动');
    }

    async handleMessage(message, sender, sendResponse) {
        console.log('收到消息:', message);

        try {
            switch (message.type) {
                case MESSAGE_TYPES.TEST_CONNECTION:
                    await this.handleTestConnection(message.config, sendResponse);
                    break;

                case MESSAGE_TYPES.CHECK_DOMAIN:
                    await this.handleCheckDomain(message.url, sendResponse);
                    break;

                case MESSAGE_TYPES.SAVE_URL:
                    await this.handleSaveUrl(message.data, sendResponse);
                    break;

                case MESSAGE_TYPES.CHECK_URL:
                    await this.handleCheckUrl(message.url, sendResponse);
                    break;

                case MESSAGE_TYPES.UPDATE_URL:
                    await this.handleUpdateUrl(message.recordId, message.data, sendResponse);
                    break;

                case MESSAGE_TYPES.GET_TAGS:
                    await this.handleGetTags(sendResponse);
                    break;

                default:
                    sendResponse({ success: false, error: '未知的消息类型' });
            }
        } catch (error) {
            console.error('处理消息时出错:', error);
            sendResponse({ success: false, error: error.message });
        }
    }

    // 获取配置
    async getConfig() {
        const result = await chrome.storage.sync.get(['appId', 'appSecret', 'tableUrl']);

        if (!result.appId || !result.appSecret || !result.tableUrl) {
            throw new Error('请先在设置页面配置飞书应用信息和表格URL');
        }

        return result;
    }

    // 处理测试连接
    async handleTestConnection(config, sendResponse) {
        try {
            console.log('测试连接配置:', { ...config, appSecret: '***' });

            // 1. 测试获取访问令牌
            const accessToken = await this.recordManager.getAccessToken(config.appId, config.appSecret);
            console.log('✓ 访问令牌获取成功');

            // 2. 测试解析表格URL
            const { appToken, tableId, viewId } = this.recordManager.parseTableUrl(config.tableUrl);
            console.log('✓ 表格URL解析成功');

            // 3. 测试获取表格信息
            let finalTableId = tableId;
            if (!finalTableId) {
                const tables = await this.recordManager.getTables(appToken, accessToken);
                if (tables.length === 0) {
                    throw new Error('该多维表格中没有找到任何表格');
                }
                finalTableId = tables[0].table_id;
            }
            console.log('✓ 表格访问成功');

            // 4. 测试获取字段信息
            const fields = await this.recordManager.getFields(appToken, finalTableId, viewId, accessToken);
            console.log('✓ 字段信息获取成功，共', fields.length, '个字段');

            console.log('✓ 连接测试成功');
            sendResponse({
                success: true,
                message: '连接测试成功！配置正确。',
                fieldCount: fields.length
            });

        } catch (error) {
            console.error('连接测试失败:', error);
            sendResponse({ success: false, error: error.message });
        }
    }

    // 处理域名检查
    async handleCheckDomain(url, sendResponse) {
        try {
            const isScysUrl = Utils.isScysUrl(url);
            sendResponse({ success: true, isScysUrl });
        } catch (error) {
            console.error('域名检查失败:', error);
            sendResponse({ success: false, isScysUrl: false, error: error.message });
        }
    }

    // 处理保存URL
    async handleSaveUrl(data, sendResponse) {
        try {
            const config = await this.getConfig();
            this.recordManager.setConfig(config);

            const result = await this.recordManager.saveRecord(data);
            sendResponse({ success: true, recordId: result.recordId });
        } catch (error) {
            console.error('保存URL失败:', error);
            sendResponse({ success: false, error: error.message });
        }
    }

    // 处理检查URL是否存在
    async handleCheckUrl(url, sendResponse) {
        try {
            const config = await this.getConfig();
            this.recordManager.setConfig(config);

            const record = await this.recordManager.findRecordByUrl(url);
            sendResponse({
                success: true,
                exists: !!record,
                record: record
            });
        } catch (error) {
            console.error('检查URL失败:', error);
            sendResponse({ success: false, error: error.message });
        }
    }

    // 处理更新URL记录
    async handleUpdateUrl(recordId, data, sendResponse) {
        try {
            const config = await this.getConfig();
            this.recordManager.setConfig(config);

            await this.recordManager.updateRecord(recordId, data);
            sendResponse({ success: true });
        } catch (error) {
            console.error('更新URL失败:', error);
            sendResponse({ success: false, error: error.message });
        }
    }

    // 处理获取标签
    async handleGetTags(sendResponse) {
        try {
            const config = await this.getConfig();
            this.recordManager.setConfig(config);

            const tags = await this.recordManager.getAllTags();
            sendResponse({ success: true, tags: tags });
        } catch (error) {
            console.error('获取标签失败:', error);
            sendResponse({ success: false, error: error.message, tags: [] });
        }
    }
}

// 启动后台服务
new ScysBackgroundService();