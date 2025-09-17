# Chrome 扩展开发需求文档

## 项目概述

### 项目名称
生财网站收藏助手 (Scys Collector Extension)

### 项目描述
专门针对生财网站(scys.com)的内容收藏Chrome扩展，自动提取页面信息并保存到飞书多维表格。

### 开发时间
2025年1月

### 版本
v1.0.0

## 功能需求

### 1. 核心功能

#### 1.1 页面信息自动提取
- **需求**：在生财网站页面自动提取关键信息
- **技术实现**：Content Script + DOM选择器
- **提取字段**：
  - 页面标题
  - 作者信息
  - 内容类型（文章/帖子/课程/直播）
  - 精华标识
  - 飞书链接
  - 页面URL

#### 1.2 数据保存到飞书
- **需求**：将提取的信息保存到飞书多维表格
- **技术实现**：飞书Open API调用
- **支持字段类型**：
  - 文本字段 (type=1)
  - 单选字段 (type=3)
  - 多选字段 (type=4)
  - 复选框字段 (type=7)
  - URL字段 (type=15)

#### 1.3 标签管理系统
- **需求**：支持多标签分类和智能推荐
- **技术实现**：动态标签输入组件
- **功能特性**：
  - 支持中英文逗号分隔输入
  - 智能标签推荐
  - 标签可视化管理
  - 一键删除标签

### 2. 用户界面需求

#### 2.1 Popup界面
- **尺寸**：380px × 520px
- **设计风格**：现代化、简洁
- **主色调**：绿色主题 (#22c55e)
- **布局结构**：
  - 头部：标题 + 配置按钮
  - 状态栏：实时状态显示
  - 主体：表单字段
  - 底部：操作按钮

#### 2.2 配置页面
- **需求**：飞书应用配置
- **字段**：
  - 应用ID (App ID)
  - 应用密钥 (App Secret)
  - 表格URL
- **功能**：配置测试、保存验证

### 3. 技术架构需求

#### 3.1 Chrome Extension架构
- **Manifest版本**：V3
- **权限要求**：
  - `storage` - 存储配置信息
  - `activeTab` - 访问当前标签页
  - `scripting` - 注入Content Script
- **Host权限**：
  - `https://scys.com/*`
  - `https://*.scys.com/*`
  - `https://open.feishu.cn/*`

#### 3.2 文件结构
```
scys-collector-extension/
├── manifest.json              # 扩展清单文件
├── popup-final.html           # 主界面HTML
├── feishu-config-new.html     # 配置页面HTML
├── content-script.js          # 内容脚本
├── background-full.js         # 后台服务脚本
├── js/
│   ├── popup-final-fixed.js   # 主界面逻辑
│   └── feishu-config-new.js   # 配置页面逻辑
├── icons/                     # 扩展图标
├── README.md                  # 使用说明
└── DEVELOPMENT_REQUIREMENTS.md # 本文档
```

## 技术实现细节

### 1. Content Script实现

#### 1.1 页面信息提取器
```javascript
class ScysPageExtractor {
    // 提取页面标题
    extractTitle() {
        const titleSelectors = [
            'div[data-v-354154f6].post-title',
            '.post-title',
            'h1.title',
            'h1'
        ];
        // 选择器优先级查找逻辑
    }

    // 提取作者信息
    extractAuthor() {
        const authorSelectors = [
            'div[data-v-3eb8b42f].name-identity span[data-v-3eb8b42f].name',
            '.name-identity .name',
            '.author-name'
        ];
        // 选择器优先级查找逻辑
    }

    // 检测精华标识
    checkIsFeatured() {
        const eliteSelectors = [
            'div[data-v-354154f6].elite-icon',
            '.elite-icon'
        ];
        // 精华标识检测逻辑
    }
}
```

#### 1.2 消息通信
```javascript
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'getPageInfo') {
        extractor.waitForContent().then(pageInfo => {
            sendResponse({ success: true, data: pageInfo });
        });
        return true; // 异步响应
    }
});
```

### 2. 飞书API集成

#### 2.1 认证流程
```javascript
// 获取tenant_access_token
async getTenantAccessToken(appId, appSecret) {
    const response = await fetch('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ app_id: appId, app_secret: appSecret })
    });
}
```

#### 2.2 字段格式处理
```javascript
buildFieldsData(formData, tableFields) {
    const fields = {};

    for (const [formField, value] of Object.entries(formData)) {
        const matchedField = this.findMatchingField(formField, tableFields);

        if (matchedField.type === 7) {
            // 复选框：boolean格式
            fields[matchedField.name] = value === '是' ? true : false;
        } else if (matchedField.type === 15) {
            // URL字段：{text: url, link: url}格式
            fields[matchedField.name] = { text: value, link: value };
        } else if (matchedField.type === 4) {
            // 多选字段：["tag1", "tag2"]格式
            fields[matchedField.name] = value;
        } else {
            // 文本字段：字符串格式
            fields[matchedField.name] = value;
        }
    }

    return fields;
}
```

### 3. 用户界面实现

#### 3.1 标签管理组件
```javascript
class TagsManager {
    initTagsInput() {
        // 监听回车键添加标签
        tagInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                this.addTagFromInput();
            }
        });
    }

    addTag(tagText) {
        if (!this.tags.includes(tagText)) {
            this.tags.push(tagText);
            this.renderTags();
        }
    }

    renderTags() {
        // 动态渲染标签UI
        this.tags.forEach(tag => {
            const tagElement = document.createElement('div');
            tagElement.className = 'tag-item';
            tagElement.innerHTML = `
                <span>${tag}</span>
                <button class="tag-remove">×</button>
            `;
        });
    }
}
```

#### 3.2 智能标签推荐
```javascript
suggestTags(data) {
    const suggestedTags = [];

    // 根据内容类型推荐
    if (data.contentType === '课程') {
        suggestedTags.push('学习', '教程');
    }

    // 根据标题关键词推荐
    if (data.title.includes('AI')) {
        suggestedTags.push('AI');
    }

    // 自动添加推荐标签
    suggestedTags.forEach(tag => this.addTag(tag));
}
```

## 测试与调试

### 1. 调试模式设计
```javascript
class PopupManager {
    constructor() {
        this.debugMode = false;  // 生产模式
        this.testMode = false;   // 正常保存模式
    }
}
```

### 2. 逐字段测试机制
```javascript
async testFieldsIndividually(formData, tableFields) {
    // 单独测试每个字段格式
    for (const [formField, value] of Object.entries(formData)) {
        const testFields = {};
        testFields[matchedField.name] = formatValue(value, matchedField.type);

        const success = await this.testSingleField(testFields);
        console.log(`${formField} 测试${success ? '成功' : '失败'}`);
    }
}
```

### 3. 错误处理机制
```javascript
try {
    const response = await this.saveToFeishu(data);
    if (response.code !== 0) {
        // 根据错误码提供具体建议
        this.handleFeishuError(response.code, response.msg);
    }
} catch (error) {
    console.error('保存失败:', error);
    this.showError(error.message);
}
```

## 部署与发布

### 1. 版本管理
- **版本号格式**：语义化版本 (Semantic Versioning)
- **版本文件**：manifest.json中的version字段
- **发布流程**：
  1. 功能开发完成
  2. 关闭调试模式
  3. 更新版本号
  4. 测试验证
  5. 打包发布

### 2. 打包要求
- 移除调试代码
- 压缩静态资源
- 验证manifest.json
- 测试所有功能

## 扩展性考虑

### 1. 支持更多网站
- 抽象化页面信息提取逻辑
- 配置化选择器规则
- 插件化内容提取器

### 2. 支持更多字段类型
- 日期时间字段
- 数字字段
- 关联记录字段
- 附件字段

### 3. 高级功能
- 批量导入
- 数据同步
- 离线缓存
- 数据导出

## 性能优化

### 1. 加载性能
- 懒加载非关键模块
- 压缩静态资源
- 优化DOM选择器

### 2. API调用优化
- 请求去重
- 错误重试机制
- 并发控制

### 3. 内存管理
- 及时清理事件监听器
- 避免内存泄漏
- 优化数据结构

## 安全考虑

### 1. 数据安全
- 本地存储加密
- API密钥安全存储
- HTTPS通信

### 2. 权限最小化
- 最小权限原则
- 明确权限用途
- 定期权限审核

### 3. 内容安全策略
- 禁止内联脚本
- 外部资源白名单
- XSS防护

## 维护与支持

### 1. 日志系统
- 结构化日志记录
- 错误状态追踪
- 性能监控

### 2. 用户反馈
- 错误报告机制
- 功能建议收集
- 版本更新通知

### 3. 兼容性维护
- 飞书API版本兼容
- Chrome版本兼容
- 网站结构变更适配

---

## 开发总结

本项目成功实现了一个功能完整的Chrome扩展，具备以下特点：

1. **专业性**：专门针对生财网站定制开发
2. **智能化**：自动信息提取和智能标签推荐
3. **健壮性**：完善的错误处理和重试机制
4. **扩展性**：模块化设计便于功能扩展
5. **用户友好**：现代化UI和良好的交互体验

该文档可作为类似项目的开发参考，涵盖了从需求分析到技术实现的完整开发流程。