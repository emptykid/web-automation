import { BrowserContext, Page } from 'playwright';
import { config } from '../../config';

/**
 * 百度知道所有页面对象的基类，封装常用操作
 */
export abstract class BasePage {
  protected page: Page;
  protected context: BrowserContext;

  constructor(context: BrowserContext, page?: Page) {
    this.context = context;
    this.page = page!;
  }

  async open(url: string, retries = 2): Promise<void> {
    if (!this.page || this.page.isClosed()) {
      this.page = await this.context.newPage();
    }
    console.log(`[${this.constructor.name}] 导航到: ${url}`);

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        await this.page.goto(url, {
          waitUntil: 'domcontentloaded',
          timeout: config.timeout.navigation,
        });
        return;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        const isNetworkError = msg.includes('ERR_EMPTY_RESPONSE') ||
          msg.includes('ERR_CONNECTION_RESET') ||
          msg.includes('ERR_NETWORK_CHANGED');

        if (isNetworkError && attempt < retries) {
          console.warn(`[${this.constructor.name}] 网络错误，${2}s 后重试 (${attempt}/${retries - 1})...`);
          await this.page.waitForTimeout(2000);
          continue;
        }

        if (isNetworkError) {
          throw new Error(
            `导航失败（${msg.match(/ERR_\w+/)?.[0] ?? '网络错误'}）：${url}\n` +
            `💡 提示：百度会在没有有效 Session 时拒绝自动化请求，请先运行 npm run zhidao:save-session 完成登录。`,
          );
        }
        throw err;
      }
    }
  }

  async click(selector: string, options?: { timeout?: number }): Promise<void> {
    const timeout = options?.timeout ?? config.timeout.element;
    await this.page.waitForSelector(selector, { timeout });
    await this.page.click(selector);
  }

  async typeText(selector: string, text: string, options?: { delay?: number }): Promise<void> {
    const delay = options?.delay ?? 50;
    await this.page.waitForSelector(selector, { timeout: config.timeout.element });
    await this.page.fill(selector, '');
    await this.page.type(selector, text, { delay });
  }

  async randomDelay(min = 500, max = 2000): Promise<void> {
    const ms = Math.floor(Math.random() * (max - min + 1)) + min;
    await this.page.waitForTimeout(ms);
  }

  async exists(selector: string, timeout = 3000): Promise<boolean> {
    try {
      await this.page.waitForSelector(selector, { timeout });
      return true;
    } catch {
      return false;
    }
  }

  async getText(selector: string): Promise<string> {
    await this.page.waitForSelector(selector, { timeout: config.timeout.element });
    return (await this.page.textContent(selector)) ?? '';
  }

  async scrollToBottom(): Promise<void> {
    await this.page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await this.randomDelay(500, 1000);
  }

  getPage(): Page {
    return this.page;
  }

  setPage(page: Page): void {
    this.page = page;
  }
}
