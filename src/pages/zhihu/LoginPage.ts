import { BrowserContext } from 'playwright';
import { BasePage } from './BasePage';
import { config } from '../../config';

/**
 * 知乎登录页面
 * 支持账号密码登录和扫码登录
 */
export class LoginPage extends BasePage {
  private readonly url = `${config.zhihu.baseUrl}/signin`;

  // 选择器
  private readonly selectors = {
    // 登录方式切换
    accountLoginTab: '.SignFlow-tabs .Button:nth-child(2)',
    phoneLoginTab: '.SignFlow-tabs .Button:first-child',

    // 账号密码表单
    usernameInput: 'input[name="username"]',
    passwordInput: 'input[name="password"]',
    submitButton: 'button[type="submit"]',

    // 登录成功标志（多个候选选择器，兼容知乎不同版本页面）
    userAvatarCandidates: [
      '.AppHeader-userInfo',
      '.AppHeader .Avatar',
      '[data-za-detail-view-element_name="Avatar"]',
      '.GlobalSideBar',
      '.TopstoryItem',
      '.Topstory-container',
      'header .AppHeader',
    ],

    // 验证码
    captchaImage: '.Captcha-img',
    captchaInput: 'input[name="captcha"]',

    // 错误提示
    errorMessage: '.SignFlow-errorMessage',
  };

  constructor(context: BrowserContext) {
    super(context);
  }

  /**
   * 打开登录页
   */
  async navigate(): Promise<void> {
    await this.open(this.url);
    await this.randomDelay(1000, 2000);
  }

  /**
   * 使用账号密码登录
   */
  async loginWithPassword(username?: string, password?: string): Promise<boolean> {
    const user = username || config.zhihu.username;
    const pass = password || config.zhihu.password;

    if (!user || !pass) {
      throw new Error('用户名或密码未配置，请检查 .env 文件');
    }

    console.log(`[LoginPage] 开始登录: ${user}`);

    // 确保在登录页
    await this.navigate();

    // 切换到账号密码登录（如果需要）
    const isAccountTab = await this.exists(this.selectors.usernameInput, 2000);
    if (!isAccountTab) {
      await this.click(this.selectors.accountLoginTab);
      await this.randomDelay(500, 1000);
    }

    // 输入用户名
    await this.typeText(this.selectors.usernameInput, user, { delay: 80 });
    await this.randomDelay(300, 800);

    // 输入密码
    await this.typeText(this.selectors.passwordInput, pass, { delay: 60 });
    await this.randomDelay(500, 1000);

    // 点击登录
    await this.click(this.selectors.submitButton);
    console.log('[LoginPage] 已点击登录按钮，等待结果...');

    // 等待登录结果
    return await this.waitForLoginResult();
  }

  /**
   * 等待登录结果
   */
  private async waitForLoginResult(): Promise<boolean> {
    try {
      // 等待 URL 跳转离开登录页，或出现错误提示（最多 15 秒）
      await Promise.race([
        this.page.waitForURL(url => !url.toString().includes('/signin'), { timeout: 15000 }),
        this.page.waitForSelector(this.selectors.errorMessage, { timeout: 15000 }),
      ]).catch(() => {});

      // 检查是否有错误信息
      const hasError = await this.exists(this.selectors.errorMessage, 1000);
      if (hasError) {
        const errorText = await this.getText(this.selectors.errorMessage);
        console.error(`[LoginPage] 登录失败: ${errorText}`);
        return false;
      }

      // 检查是否登录成功（通过 Cookie）
      const isLoggedIn = await this.isLoggedIn();
      if (isLoggedIn) {
        console.log('[LoginPage] 登录成功！');
        return true;
      }

      // 可能需要验证码
      const hasCaptcha = await this.exists(this.selectors.captchaImage, 2000);
      if (hasCaptcha) {
        console.warn('[LoginPage] 检测到验证码，需要手动处理');
        await this.screenshot('captcha');
        // 等待用户手动处理（通过轮询 Cookie，最多 60 秒）
        return await this.waitForManualLogin(60000);
      }

      return false;
    } catch (error) {
      console.error('[LoginPage] 等待登录结果超时');
      return false;
    }
  }

  /**
   * 检查是否已登录（通过 Cookie 或 URL 判断，不依赖具体 DOM 元素）
   */
  async isLoggedIn(): Promise<boolean> {
    // 方式1：检查认证 Cookie（z_c0 是知乎的登录凭证）
    const cookies = await this.context.cookies('https://www.zhihu.com');
    const authCookie = cookies.find(c => c.name === 'z_c0');
    if (authCookie?.value) {
      return true;
    }

    // 方式2：URL 不在登录页，且页面包含已登录元素
    const currentUrl = this.page.url();
    if (currentUrl.includes('/signin')) {
      return false;
    }

    // 方式3：尝试多个可能的已登录元素选择器
    for (const selector of this.selectors.userAvatarCandidates) {
      if (await this.exists(selector, 1500)) {
        return true;
      }
    }

    return false;
  }

  /**
   * 等待手动登录（headful 模式，检测登录完成后 URL 跳转或 Cookie 变化）
   */
  async waitForManualLogin(timeoutMs = 120000): Promise<boolean> {
    console.log(`[LoginPage] 等待手动登录，超时时间: ${timeoutMs / 1000}s`);
    console.log('[LoginPage] 请在浏览器中完成登录操作...');

    const start = Date.now();
    const pollInterval = 2000;

    while (Date.now() - start < timeoutMs) {
      // 优先检查 z_c0 Cookie（最可靠的登录标志）
      const cookies = await this.context.cookies('https://www.zhihu.com');
      const authCookie = cookies.find(c => c.name === 'z_c0');
      if (authCookie?.value) {
        console.log('[LoginPage] 检测到登录 Cookie，登录成功！');
        return true;
      }

      // 检查 URL 是否已离开登录页
      const url = this.page.url();
      if (!url.includes('/signin') && url.includes('zhihu.com')) {
        // 可能已登录，再做一次 Cookie 检查
        await this.page.waitForTimeout(1000);
        const cookiesAgain = await this.context.cookies('https://www.zhihu.com');
        if (cookiesAgain.find(c => c.name === 'z_c0')?.value) {
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
