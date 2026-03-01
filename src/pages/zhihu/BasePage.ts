import { BrowserContext, Page } from 'playwright';
import { config } from '../../config';

/**
 * 所有页面对象的基类，封装常用操作
 */
export abstract class BasePage {
  protected page: Page;
  protected context: BrowserContext;

  constructor(context: BrowserContext, page?: Page) {
    this.context = context;
    this.page = page!;
  }

  /**
   * 打开新标签页并导航到指定 URL
   */
  async open(url: string): Promise<void> {
    if (!this.page || this.page.isClosed()) {
      this.page = await this.context.newPage();
    }
    console.log(`[${this.constructor.name}] 导航到: ${url}`);
    await this.page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: config.timeout.navigation,
    });
  }

  /**
   * 等待元素出现并点击
   */
  async click(selector: string, options?: { timeout?: number }): Promise<void> {
    const timeout = options?.timeout ?? config.timeout.element;
    await this.page.waitForSelector(selector, { timeout });
    await this.page.click(selector);
  }

  /**
   * 清空输入框并输入文字（模拟人工输入）
   */
  async typeText(selector: string, text: string, options?: { delay?: number }): Promise<void> {
    const delay = options?.delay ?? 50;
    await this.page.waitForSelector(selector, { timeout: config.timeout.element });
    await this.page.fill(selector, '');
    await this.page.type(selector, text, { delay });
  }

  /**
   * 等待页面导航完成
   */
  async waitForNavigation(): Promise<void> {
    await this.page.waitForLoadState('domcontentloaded', {
      timeout: config.timeout.navigation,
    });
  }

  /**
   * 随机等待（模拟人工操作间隔）
   */
  async randomDelay(min = 500, max = 2000): Promise<void> {
    const ms = Math.floor(Math.random() * (max - min + 1)) + min;
    await this.page.waitForTimeout(ms);
  }

  /**
   * 截图（用于调试）
   */
  async screenshot(name: string): Promise<void> {
    const fileName = `./screenshots/${name}-${Date.now()}.png`;
    await this.page.screenshot({ path: fileName, fullPage: false });
    console.log(`[${this.constructor.name}] 截图保存: ${fileName}`);
  }

  /**
   * 检查元素是否存在
   */
  async exists(selector: string, timeout = 3000): Promise<boolean> {
    try {
      await this.page.waitForSelector(selector, { timeout });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 获取元素文本
   */
  async getText(selector: string): Promise<string> {
    await this.page.waitForSelector(selector, { timeout: config.timeout.element });
    return (await this.page.textContent(selector)) ?? '';
  }

  /**
   * 滚动到页面底部
   */
  async scrollToBottom(): Promise<void> {
    await this.page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await this.randomDelay(500, 1000);
  }

  /**
   * 滚动到指定元素
   */
  async scrollToElement(selector: string): Promise<void> {
    await this.page.locator(selector).scrollIntoViewIfNeeded();
  }

  getPage(): Page {
    return this.page;
  }

  setPage(page: Page): void {
    this.page = page;
  }
}
