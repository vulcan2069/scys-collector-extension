// 生财网站内容脚本 - 页面信息提取
(function() {
    'use strict';

    console.log('生财收藏扩展 - 内容脚本已加载');

    // 页面信息提取器
    class ScysPageExtractor {
        constructor() {
            this.observers = [];
        }

        // 提取页面标题
        extractTitle() {
            // 根据真实HTML结构优化的标题选择器
            const titleSelectors = [
                'div[data-v-354154f6].post-title',  // 精确匹配真实结构
                '.post-title',                       // 通用选择器
                'div.post-title',                    // div标签的post-title
                '[class*="post-title"]',             // 包含post-title类名的元素
                'h1.title',
                'h1',
                '.article-title',
                '.content-title'
            ];

            console.log('开始提取标题，尝试选择器...');

            for (const selector of titleSelectors) {
                try {
                    const element = document.querySelector(selector);
                    if (element && element.textContent && element.textContent.trim()) {
                        const title = element.textContent.trim();
                        console.log(`✓ 标题提取成功，使用选择器: ${selector}`);
                        console.log(`✓ 提取到的标题: ${title}`);
                        return title;
                    } else {
                        console.log(`✗ 选择器 ${selector} 未找到有效内容`);
                    }
                } catch (error) {
                    console.log(`✗ 选择器 ${selector} 出错:`, error);
                }
            }

            // 如果都没找到，使用document.title
            console.log('⚠️ 所有选择器都失败，使用页面标题作为后备:', document.title);
            return document.title || '无标题';
        }

        // 提取作者信息
        extractAuthor() {
            // 根据真实HTML结构优化的作者选择器
            const authorSelectors = [
                'div[data-v-3eb8b42f].name-identity span[data-v-3eb8b42f].name',  // 最精确匹配
                '.name-identity .name',                    // 通用选择器
                'span[data-v-3eb8b42f].name',             // 精确span选择器
                '.name-identity span.name',               // 更具体的选择器
                'div.name-identity span.name',            // 包含div的选择器
                '[class*="name-identity"] [class*="name"]', // 模糊匹配
                '.author-name',
                '.post-author',
                '.username',
                '.user-name',
                '.author'
            ];

            console.log('开始提取作者信息，尝试选择器...');

            for (const selector of authorSelectors) {
                try {
                    const element = document.querySelector(selector);
                    if (element && element.textContent && element.textContent.trim()) {
                        const author = element.textContent.trim();
                        console.log(`✓ 作者提取成功，使用选择器: ${selector}`);
                        console.log(`✓ 提取到的作者: ${author}`);
                        return author;
                    } else {
                        console.log(`✗ 选择器 ${selector} 未找到有效内容`);
                    }
                } catch (error) {
                    console.log(`✗ 选择器 ${selector} 出错:`, error);
                }
            }

            console.log('⚠️ 未找到作者信息');
            return '';
        }

        // 检测是否为精华内容
        checkIsFeatured() {
            // 根据真实HTML结构优化的精华标识选择器
            const eliteSelectors = [
                'div[data-v-354154f6].elite-icon',    // 精确匹配真实结构
                '.elite-icon',                         // 通用选择器
                'div.elite-icon',                      // div标签的elite-icon
                '[class*="elite-icon"]',               // 包含elite-icon的元素
                '[class*="elite"]',                    // 包含elite的元素
                '.featured-icon',
                '[class*="featured"]'
            ];

            console.log('开始检测精华标识...');

            for (const selector of eliteSelectors) {
                try {
                    const element = document.querySelector(selector);
                    if (element && element.offsetParent !== null) { // 检查元素是否可见
                        console.log(`✓ 检测到精华标识，使用选择器: ${selector}`);
                        console.log(`✓ 精华元素内容:`, element.textContent?.trim());
                        return true;
                    } else if (element) {
                        console.log(`✗ 选择器 ${selector} 找到元素但不可见`);
                    } else {
                        console.log(`✗ 选择器 ${selector} 未找到元素`);
                    }
                } catch (error) {
                    console.log(`✗ 选择器 ${selector} 出错:`, error);
                }
            }

            console.log('⚠️ 未检测到精华标识');
            return false;
        }

        // 提取飞书链接
        extractFeishuLink() {
            const feishuSelectors = [
                'a[href*="feishu.cn"]',
                'a[href*="feishu.com"]',
                'a[href*="larksuite.com"]'
            ];

            for (const selector of feishuSelectors) {
                const element = document.querySelector(selector);
                if (element && element.href) {
                    return element.href;
                }
            }

            return '';
        }

        // 检测内容类型
        detectContentType() {
            const path = window.location.pathname;
            const url = window.location.href;

            console.log('检测内容类型，URL路径:', path);

            // 基于URL路径判断
            if (path.includes('/post/') || url.includes('post')) {
                console.log('检测到帖子类型');
                return '帖子';
            }
            if (path.includes('/article/') || url.includes('article')) {
                console.log('检测到文章类型');
                return '文章';
            }
            if (path.includes('/course/') || url.includes('course')) {
                console.log('检测到课程类型');
                return '课程';
            }
            if (path.includes('/live/') || url.includes('live')) {
                console.log('检测到直播类型');
                return '直播';
            }

            // 基于页面内容判断
            const pageContent = document.body.textContent.toLowerCase();
            if (pageContent.includes('课程') || pageContent.includes('教程')) {
                console.log('基于内容检测到课程类型');
                return '课程';
            }
            if (pageContent.includes('直播') || pageContent.includes('live')) {
                console.log('基于内容检测到直播类型');
                return '直播';
            }

            // 默认为文章类型（根据用户要求）
            console.log('使用默认类型：文章');
            return '文章';
        }

        // 提取页面关键词作为潜在标签
        extractPotentialTags() {
            const tags = new Set();

            // 从URL中提取
            const urlParts = window.location.pathname.split('/').filter(part =>
                part && part.length > 2 && !part.match(/^\d+$/)
            );
            urlParts.forEach(part => tags.add(part));

            // 从标题中提取关键词
            const title = this.extractTitle();
            const titleKeywords = this.extractKeywords(title);
            titleKeywords.forEach(keyword => tags.add(keyword));

            // 从页面中寻找标签相关元素
            const tagSelectors = [
                '.tag',
                '.tags',
                '.category',
                '.label',
                '[class*="tag"]',
                '[class*="category"]'
            ];

            tagSelectors.forEach(selector => {
                const elements = document.querySelectorAll(selector);
                elements.forEach(element => {
                    const text = element.textContent.trim();
                    if (text && text.length < 20) {
                        tags.add(text);
                    }
                });
            });

            return Array.from(tags).slice(0, 10); // 限制数量
        }

        // 提取关键词
        extractKeywords(text) {
            if (!text) return [];

            const keywords = [];
            const commonWords = new Set(['的', '是', '在', '了', '和', '与', '或', '但', '而', '就', '都', '要', '会', '能', '可', '以', '有', '无', '也', '不', '很', '更', '最', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十']);

            // 简单的中文分词（基于标点符号）
            const segments = text.split(/[，。！？；：、\s]+/)
                .filter(segment => segment.length >= 2 && segment.length <= 10)
                .filter(segment => !commonWords.has(segment))
                .slice(0, 5);

            return segments;
        }

        // 等待内容加载完成
        waitForContent() {
            return new Promise((resolve) => {
                // 检查关键内容是否已加载
                const checkContent = () => {
                    const hasTitle = document.querySelector('.post-title') || document.title;
                    const hasBasicContent = document.body && document.body.textContent.length > 100;

                    if (hasTitle && hasBasicContent) {
                        return true;
                    }
                    return false;
                };

                // 如果内容已经存在，直接返回
                if (checkContent()) {
                    resolve(this.extractPageInfo());
                    return;
                }

                // 否则等待内容加载
                const observer = new MutationObserver((mutations) => {
                    let shouldCheck = false;

                    mutations.forEach(mutation => {
                        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                            shouldCheck = true;
                        }
                    });

                    if (shouldCheck && checkContent()) {
                        observer.disconnect();
                        resolve(this.extractPageInfo());
                    }
                });

                observer.observe(document.body, {
                    childList: true,
                    subtree: true
                });

                this.observers.push(observer);

                // 设置超时机制，避免无限等待
                setTimeout(() => {
                    observer.disconnect();
                    resolve(this.extractPageInfo());
                }, 5000);
            });
        }

        // 提取完整页面信息
        extractPageInfo() {
            const info = {
                title: this.extractTitle(),
                url: window.location.href,
                author: this.extractAuthor(),
                contentType: this.detectContentType(),
                isFeatured: this.checkIsFeatured(),
                feishuLink: this.extractFeishuLink(),
                potentialTags: this.extractPotentialTags(),
                timestamp: Date.now()
            };

            console.log('提取的页面信息:', info);
            return info;
        }

        // 清理观察器
        cleanup() {
            this.observers.forEach(observer => observer.disconnect());
            this.observers = [];
        }
    }

    // 创建页面提取器实例
    const extractor = new ScysPageExtractor();

    // 监听来自popup的消息
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        console.log('内容脚本收到消息:', request);

        try {
            if (request.action === 'getPageInfo') {
                console.log('开始获取页面信息...');

                // 异步获取页面信息
                extractor.waitForContent().then(pageInfo => {
                    console.log('页面信息提取完成，准备发送:', pageInfo);
                    sendResponse({ success: true, data: pageInfo });
                }).catch(error => {
                    console.error('提取页面信息失败:', error);
                    sendResponse({ success: false, error: error.message });
                });

                // 返回true表示异步响应
                return true;
            }

            if (request.action === 'checkDomain') {
                const isScysUrl = window.location.hostname === 'scys.com' ||
                                  window.location.hostname.endsWith('.scys.com');
                const isTestPage = window.location.href.includes('test-scys-page.html');
                const isValidPage = isScysUrl || isTestPage;
                console.log('域名检查结果:', { isScysUrl, isTestPage, isValidPage, url: window.location.href });
                sendResponse({ isScysUrl: isValidPage, isValidPage: isValidPage, url: window.location.href });
                return true;
            }

            // 如果不是预期的action，发送错误响应
            console.warn('未知的action:', request.action);
            sendResponse({ error: '未知的action: ' + request.action });
        } catch (error) {
            console.error('消息处理错误:', error);
            sendResponse({ error: error.message });
        }

        return false; // 同步响应
    });

    // 页面卸载时清理
    window.addEventListener('beforeunload', () => {
        extractor.cleanup();
    });

    console.log('生财收藏扩展 - 内容脚本初始化完成');

})();