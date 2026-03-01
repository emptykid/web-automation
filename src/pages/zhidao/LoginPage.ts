import { BrowserContext } from 'playwright';
import { BasePage } from './BasePage';
import { config } from '../../config';

/**
 * 百度知道登录页面
 * 百度使用统一登录体系，登录后 Cookie 在 zhidao 下通用
 */
export class LoginPage extends BasePage {
  private readonly loginUrl = 'https://passport.baidu.com/v2/?login';
  private readonly zhidaoUrl = config.zhidao.baseUrl;

  constructor(context: BrowserContext) {
    super(context);
  }

  /**
   * 打开百度知道首页（用于检测登录状态）
   */
  async navigate(): Promise<void> {
    await this.open(this.zhidaoUrl);
    await this.randomDelay(1000, 2000);
  }

  /**
   * 检查是否已登录（通过 BDUSS Cookie 判断）
   */
  async isLoggedIn(): Promise<boolean> {
    // 最可靠的方式：检查百度登录凭证 Cookie（BDUSS 或 STOKEN）
    const cookies = await this.context.cookies('https://zhidao.baidu.com');
    const bduss = cookies.find(c => c.name === 'BDUSS');
    if (bduss?.value) {
      return true;
    }
    const stoken = cookies.find(c => c.name === 'STOKEN');
    if (stoken?.value) {
      return true;
    }

    // 检查当前 URL 是否在登录页
    const currentUrl = this.page?.url() ?? '';
    if (currentUrl.includes('passport.baidu.com')) {
      return false;
    }

    // 检查页面上是否存在已登录用户信息（头像、用户名等）
    const loggedInSelectors = [
      '.user-name',
      '.user-info',
      '[class*="userInfo"]',
      '[class*="user-avatar"]',
    ];
    for (const sel of loggedInSelectors) {
      if (await this.exists(sel, 1000)) {
        return true;
      }
    }

    // 明确检查"登录"入口是否存在（未登录时显示）
    const loginLinkSelectors = [
      'a[href*="passport.baidu.com"]',
      'a:has-text("登录")',
      '.login-btn',
    ];
    for (const sel of loginLinkSelectors) {
      if (await this.exists(sel, 1000)) {
        return false;
      }
    }

    // 无法确定，默认返回 false，要求先登录
    return false;
  }

  /**
   * 打开百度登录页，等待用户手动登录
   */
  async navigateToLogin(): Promise<void> {
    await this.open(this.loginUrl);
    await this.randomDelay(1000, 2000);
  }

  /**
   * 等待手动登录完成（轮询 Cookie 或 URL 变化）
   */
  async waitForManualLogin(timeoutMs = 120000): Promise<boolean> {
    console.log(`[LoginPage] 等待手动登录，超时时间: ${timeoutMs / 1000}s`);
    console.log('[LoginPage] 请在浏览器中完成百度账号登录...');

    const start = Date.now();
    const pollInterval = 2000;

    while (Date.now() - start < timeoutMs) {
      const cookies = await this.context.cookies('https://zhidao.baidu.com');
      const bduss = cookies.find(c => c.name === 'BDUSS');
      if (bduss?.value) {
        console.log('[LoginPage] 检测到登录 Cookie（BDUSS），登录成功！');
        return true;
      }

      // 也检查 STOKEN（百度另一个登录凭证）
      const stoken = cookies.find(c => c.name === 'STOKEN');
      if (stoken?.value) {
        console.log('[LoginPage] 检测到登录 Cookie（STOKEN），登录成功！');
        return true;
      }

      const url = this.page?.url() ?? '';
      if (!url.includes('passport.baidu.com') && url.includes('baidu.com')) {
        // 跳转离开了登录页，再做一次 Cookie 检查
        await this.page.waitForTimeout(1500);
        const cookiesAgain = await this.context.cookies('https://zhidao.baidu.com');
        if (cookiesAgain.find(c => c.name === 'BDUSS')?.value) {
          console.log('[LoginPage] 检测到登录成功（URL 跳转 + Cookie）！');
          return true;
        }
      }

      await this.page.waitForTimeout(pollInterval);
    }

    console.error('[LoginPage] 等待手动登录超时');
    return false;
  }
}
