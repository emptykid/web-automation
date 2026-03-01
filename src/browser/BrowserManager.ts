import { chromium, BrowserContext, Browser } from 'playwright';
import * as fs from 'fs';
import { config } from '../config';

/**
 * 浏览器管理器
 * 支持两种模式：
 * 1. 持久化上下文（保存 Cookie/Session，按站点隔离目录）
 * 2. 普通浏览器（每次全新启动）
 */
export class BrowserManager {
  private context: BrowserContext | null = null;
  private browser: Browser | null = null;
  private readonly site: string;

  /**
   * @param site 站点标识符，用于隔离 Session 目录，例如 'zhihu' 或 'zhidao'
   */
  constructor(site: string) {
    this.site = site;
  }

  /**
   * 启动持久化浏览器上下文（保存登录状态）
   */
  async launchPersistent(): Promise<BrowserContext> {
    const userDataDir = config.browser.sessionDir(this.site);

    // 确保目录存在
    if (!fs.existsSync(userDataDir)) {
      fs.mkdirSync(userDataDir, { recursive: true });
    }

    console.log(`[BrowserManager] 启动持久化浏览器（${this.site}），数据目录: ${userDataDir}`);

    this.context = await chromium.launchPersistentContext(userDataDir, {
      channel: config.browser.channel,
      headless: config.browser.headless,
      slowMo: config.browser.slowMo,
      viewport: config.browser.viewport,
      locale: 'zh-CN',
      timezoneId: 'Asia/Shanghai',
      args: [
        '--no-sandbox',
        '--disable-blink-features=AutomationControlled',
        // 禁用 WebRTC，防止 IP 泄露
        '--disable-features=WebRtcHideLocalIpsWithMdns',
      ],
    });

    // 注入反检测脚本
    await this.injectAntiDetection(this.context);

    return this.context;
  }

  /**
   * 启动普通浏览器（不保存 Session）
   */
  async launch(): Promise<BrowserContext> {
    console.log('[BrowserManager] 启动普通浏览器');

    this.browser = await chromium.launch({
      channel: config.browser.channel,
      headless: config.browser.headless,
      slowMo: config.browser.slowMo,
      args: [
        '--no-sandbox',
        '--disable-blink-features=AutomationControlled',
      ],
    });

    this.context = await this.browser.newContext({
      viewport: config.browser.viewport,
      locale: 'zh-CN',
      timezoneId: 'Asia/Shanghai',
    });

    await this.injectAntiDetection(this.context);

    return this.context;
  }

  /**
   * 注入反自动化检测脚本
   */
  private async injectAntiDetection(context: BrowserContext): Promise<void> {
    await context.addInitScript(() => {
      // 隐藏 webdriver 标志
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined,
      });

      // 模拟正常的 Chrome 插件
      Object.defineProperty(navigator, 'plugins', {
        get: () => [1, 2, 3, 4, 5],
      });

      // 模拟正常的语言设置
      Object.defineProperty(navigator, 'languages', {
        get: () => ['zh-CN', 'zh', 'en'],
      });
    });
  }

  /**
   * 保存当前 Cookie 到文件
   */
  async saveCookies(filePath: string): Promise<void> {
    if (!this.context) throw new Error('浏览器未启动');
    const cookies = await this.context.cookies();
    fs.writeFileSync(filePath, JSON.stringify(cookies, null, 2), 'utf-8');
    console.log(`[BrowserManager] Cookie 已保存到: ${filePath}`);
  }

  /**
   * 从文件加载 Cookie
   */
  async loadCookies(filePath: string): Promise<void> {
    if (!this.context) throw new Error('浏览器未启动');
    if (!fs.existsSync(filePath)) {
      console.warn(`[BrowserManager] Cookie 文件不存在: ${filePath}`);
      return;
    }
    const cookies = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    await this.context.addCookies(cookies);
    console.log(`[BrowserManager] Cookie 已从 ${filePath} 加载`);
  }

  /**
   * 关闭浏览器
   */
  async close(): Promise<void> {
    if (this.context) {
      await this.context.close();
      this.context = null;
    }
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
    console.log('[BrowserManager] 浏览器已关闭');
  }

  getContext(): BrowserContext {
    if (!this.context) throw new Error('浏览器未启动，请先调用 launch() 或 launchPersistent()');
    return this.context;
  }
}
