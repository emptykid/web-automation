import { BrowserContext } from 'playwright';
import { BasePage } from './BasePage';
import { config } from '../../config';

/**
 * 百度知道提问页面
 * URL: https://zhidao.baidu.com/new?word=&entry=common_header
 */
export class AskPage extends BasePage {
  private readonly askUrl = `${config.zhidao.baseUrl}/new?word=&entry=common_header`;

  private readonly selectors = {
    // 提问标题输入框（主文本区域，用于输入问题）
    titleInput: '#question-title, .question-input, textarea[name="title"], input[name="title"]',

    // 问题说明（补充说明，选填）
    descInput: '#content-area, #question-content, textarea[name="content"]',

    // 匿名勾选框（自定义 span，通过 data-id 标识，cb-checked class 表示已勾选）
    anonymousCheckbox: "span[data-id='anonymity']",

    // 提交按钮
    submitButton: 'input[type="submit"], button[type="submit"], .btn-submit, button:has-text("提交")',
  };

  constructor(context: BrowserContext) {
    super(context);
  }

  /**
   * 打开提问页
   */
  async navigate(): Promise<void> {
    await this.open(this.askUrl);
    await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    await this.randomDelay(1000, 2000);
    console.log('[AskPage] 提问页已加载');
  }

  /**
   * 填写问题标题（必填）
   */
  async setTitle(title: string): Promise<void> {
    console.log(`[AskPage] 填写问题标题: "${title}"`);

    const titleSelectors = [
      '#question-title',
      'textarea[name="title"]',
      'input[name="title"]',
      '.question-input',
      'textarea.question-title',
      'textarea',
    ];

    for (const sel of titleSelectors) {
      if (await this.exists(sel, 3000)) {
        const tagName = await this.page.locator(sel).first().evaluate(el => el.tagName.toLowerCase());
        if (tagName === 'textarea' || tagName === 'input') {
          await this.page.fill(sel, title);
        } else {
          await this.page.click(sel);
          await this.randomDelay(200, 400);
          await this.page.evaluate((text: string) => {
            const clipboardData = new DataTransfer();
            clipboardData.setData('text/plain', text);
            document.activeElement?.dispatchEvent(
              new ClipboardEvent('paste', { bubbles: true, cancelable: true, clipboardData }),
            );
          }, title);
        }
        await this.randomDelay(300, 500);
        console.log('[AskPage] 标题填写完成');
        return;
      }
    }

    throw new Error('[AskPage] 未找到标题输入框');
  }

  /**
   * 填写问题说明（选填）
   */
  async setDescription(description: string): Promise<void> {
    if (!description) return;
    console.log('[AskPage] 填写问题说明...');

    const descSelectors = [
      '#content-area',
      '#question-content',
      'textarea[name="content"]',
      'textarea[name="description"]',
      '.description-input textarea',
    ];

    for (const sel of descSelectors) {
      if (await this.exists(sel, 2000)) {
        const tagName = await this.page.locator(sel).first().evaluate(el => el.tagName.toLowerCase());
        if (tagName === 'textarea') {
          await this.page.fill(sel, description);
        } else {
          await this.page.click(sel);
          await this.randomDelay(200, 400);
          await this.page.evaluate((text: string) => {
            const clipboardData = new DataTransfer();
            clipboardData.setData('text/plain', text);
            document.activeElement?.dispatchEvent(
              new ClipboardEvent('paste', { bubbles: true, cancelable: true, clipboardData }),
            );
          }, description);
        }
        await this.randomDelay(300, 500);
        console.log('[AskPage] 问题说明填写完成');
        return;
      }
    }

    console.warn('[AskPage] 未找到说明输入框，跳过说明填写');
  }

  /**
   * 设置匿名提问（选填）
   * anonymous=true  → 勾选匿名
   * anonymous=false → 取消勾选（不匿名）
   *
   * 百度知道的匿名控件是一个自定义 span，通过 data-id="anonymity" 标识，
   * 勾选状态由 class 中是否含 "cb-checked" 判断。
   */
  async setAnonymous(anonymous: boolean): Promise<void> {
    console.log(`[AskPage] 设置匿名提问: ${anonymous}`);

    const selector = "span[data-id='anonymity']";
    if (!await this.exists(selector, 3000)) {
      console.warn('[AskPage] 未找到匿名勾选框，跳过匿名设置');
      return;
    }

    const isChecked = await this.page
      .locator(selector)
      .evaluate(el => el.classList.contains('cb-checked'));

    if (isChecked !== anonymous) {
      await this.page.locator(selector).click();
      await this.randomDelay(200, 400);
    }

    console.log(`[AskPage] 匿名提问已${anonymous ? '勾选' : '取消'}`);
  }

  /**
   * 提交提问
   */
  async submit(): Promise<boolean> {
    console.log('[AskPage] 准备提交提问...');
    await this.randomDelay(1000, 2000);

    const submitSelectors = [
      'input[type="submit"][value*="提交"]',
      'button:has-text("提交")',
      '.btn-submit',
      'input.submit-btn',
      'button[type="submit"]',
    ];

    for (const sel of submitSelectors) {
      if (await this.exists(sel, 3000)) {
        await this.page.click(sel);
        console.log('[AskPage] 已点击提交按钮');
        return await this.verifySubmitSuccess();
      }
    }

    console.error('[AskPage] 未找到提交按钮');
    return false;
  }

  /**
   * 验证提问提交成功
   */
  private async verifySubmitSuccess(): Promise<boolean> {
    try {
      await Promise.race([
        // 提交成功后跳转到问题详情页
        this.page.waitForURL(/zhidao\.baidu\.com\/question\//, { timeout: 15000 }),
        // 或出现成功提示
        this.page.waitForSelector('.success-tip, .question-success', { timeout: 15000 }),
      ]);
      console.log('[AskPage] 提问提交成功！');
      return true;
    } catch {
      const hasError = await this.exists('.error-msg, .alert-danger, .error-tip', 2000);
      if (hasError) {
        const errorText = await this.getText('.error-msg, .alert-danger, .error-tip').catch(() => '未知错误');
        console.error(`[AskPage] 提交失败: ${errorText}`);
        return false;
      }
      console.warn('[AskPage] 无法确认提交状态，请手动检查浏览器');
      return false;
    }
  }

  /**
   * 完整流程：打开提问页 → 填写标题 → 填写说明（选填）→ 设置匿名（选填）→ 提交
   */
  async ask(title: string, description?: string, anonymous?: boolean): Promise<boolean> {
    await this.navigate();
    await this.setTitle(title);

    if (description) {
      await this.setDescription(description);
    }

    if (anonymous !== undefined) {
      await this.setAnonymous(anonymous);
    }

    return await this.submit();
  }
}
