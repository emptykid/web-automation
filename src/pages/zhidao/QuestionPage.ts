import { BrowserContext } from 'playwright';
import { BasePage } from './BasePage';
import { config } from '../../config';

/**
 * 百度知道问题页面
 * 负责打开问题、点击「我来回答」、输入回答内容并提交
 */
export class QuestionPage extends BasePage {
  private readonly selectors = {
    // 问题标题
    questionTitle: '#wgt-list h1, .ask-title h1, .question-title',

    // 「我来回答」按钮（问题下方）
    answerButton: 'a.btn-answer, a[href*="answer"], .answer-btn a, a:has-text("我来回答")',

    // 回答编辑器（百度知道使用 textarea 或富文本编辑器）
    editorTextarea: '#question-content, #wgt-answer textarea, .edit-area textarea',
    editorContentEditable: '[contenteditable="true"]',

    // 提交回答按钮
    submitButton: 'input[type="submit"][value*="提交"], button:has-text("提交回答"), .btn-submit',

    // 登录提示
    loginPrompt: '.login-layer, .passport-login',
  };

  constructor(context: BrowserContext) {
    super(context);
  }

  /**
   * 打开指定问题页
   */
  async navigate(questionUrl: string): Promise<void> {
    await this.open(questionUrl);
    await this.randomDelay(1000, 2000);
  }

  /**
   * 获取问题标题
   */
  async getTitle(): Promise<string> {
    // 尝试多个标题选择器
    const selectors = [
      '#wgt-list h1',
      '.ask-title',
      'h1.question-title',
      'h1',
    ];
    for (const sel of selectors) {
      if (await this.exists(sel, 2000)) {
        return await this.getText(sel);
      }
    }
    return '（未获取到标题）';
  }

  /**
   * 点击「我来回答」按钮，打开回答编辑区
   */
  async clickAnswerButton(): Promise<boolean> {
    console.log('[QuestionPage] 点击「我来回答」按钮...');

    // 尝试多种选择器（#answer-bar 是知道现代页面的实际 ID）
    const btnSelectors = [
      '#answer-bar',
      'a.btn-answer',
      '.btn-answer',
      'a:has-text("我来回答")',
      'button:has-text("我来回答")',
      'a:has-text("我来答")',
      'button:has-text("我来答")',
      '.wgt-header-title-btn',
      'span:has-text("我来答")',
      'span:has-text("我来回答")',
      '.question-operation a:first-child',
    ];

    for (const sel of btnSelectors) {
      if (await this.exists(sel, 2000)) {
        await this.page.click(sel);
        // 给编辑器足够时间渲染（知道页面有时需要 2-3s）
        await this.randomDelay(2000, 3000);
        console.log('[QuestionPage] 已点击「我来回答」');
        return true;
      }
    }

    console.error('[QuestionPage] 未找到「我来回答」按钮');
    return false;
  }

  /**
   * 在编辑器中输入回答内容
   * 百度知道的回答编辑器可能是 textarea 或 contenteditable div
   */
  async typeAnswer(content: string): Promise<void> {
    console.log('[QuestionPage] 输入回答内容...');

    // 额外等待，确保点击按钮后编辑区完全渲染
    await this.page.waitForTimeout(2000);

    // 优先尝试 contenteditable 编辑器（包含知道现代页面常见选择器）
    const contentEditableSelectors = [
      '#ueditor_0 [contenteditable="true"]',
      '.edui-editor-body[contenteditable="true"]',
      '.write-answer [contenteditable="true"]',
      '.new-preedit [contenteditable="true"]',
      '.answer-editor [contenteditable="true"]',
      '.edit-area [contenteditable="true"]',
      '[contenteditable="true"]',
    ];

    for (const sel of contentEditableSelectors) {
      if (await this.exists(sel, 5000)) {
        await this.page.click(sel);
        await this.randomDelay(300, 500);
        await this.page.evaluate((text: string) => {
          const clipboardData = new DataTransfer();
          clipboardData.setData('text/plain', text);
          document.activeElement?.dispatchEvent(
            new ClipboardEvent('paste', { bubbles: true, cancelable: true, clipboardData }),
          );
        }, content);
        await this.randomDelay(500, 1000);
        console.log('[QuestionPage] 已通过粘贴方式输入回答（contenteditable）');
        return;
      }
    }

    // contenteditable 位于 iframe（如 UEditor）
    const iframeSelectors = [
      'iframe[id^="ueditor"]',
      'iframe.edui-editor-iframe',
      '#ueditor_0',
    ];

    for (const sel of iframeSelectors) {
      const handle = await this.page.$(sel);
      if (!handle) continue;
      const frame = await handle.contentFrame();
      if (!frame) continue;

      await frame.waitForTimeout(200);
      const filled = await frame.evaluate((text: string) => {
        const editable = document.querySelector('[contenteditable="true"]') as HTMLElement | null;
        const target = editable ?? document.body;
        if (!target) return false;
        target.focus();
        target.innerHTML = '';
        target.textContent = text;
        const inputEvent = typeof InputEvent !== 'undefined'
          ? new InputEvent('input', { bubbles: true, cancelable: true })
          : new Event('input', { bubbles: true, cancelable: true });
        target.dispatchEvent(inputEvent);
        return true;
      }, content).catch(() => false);

      if (filled) {
        await this.randomDelay(500, 800);
        console.log('[QuestionPage] 已通过 iframe 编辑器输入回答');
        return;
      }
    }

    // 降级：textarea
    const textareaSelectors = [
      '#question-content',
      '#wgt-answer textarea',
      'textarea.answer-textarea',
      'textarea',
    ];
    for (const sel of textareaSelectors) {
      if (await this.exists(sel, 5000)) {
        await this.page.fill(sel, content);
        await this.randomDelay(300, 500);
        console.log('[QuestionPage] 已通过 fill 输入回答（textarea）');
        return;
      }
    }

    // 调试：截图 + 输出页面中所有 contenteditable 元素，帮助定位实际选择器
    const debugInfo = await this.page.evaluate(() => {
      const items = Array.from(document.querySelectorAll('[contenteditable]'));
      return items.map(el => ({
        tag: el.tagName,
        id: el.id,
        className: el.className,
        contenteditable: el.getAttribute('contenteditable'),
      }));
    });
    console.error('[QuestionPage] 调试 - 页面中的 contenteditable 元素:', JSON.stringify(debugInfo, null, 2));

    const screenshotPath = `/tmp/zhidao-editor-debug-${Date.now()}.png`;
    await this.page.screenshot({ path: screenshotPath, fullPage: false });
    console.error(`[QuestionPage] 已截图至: ${screenshotPath}`);

    throw new Error('[QuestionPage] 未找到回答编辑器，无法输入内容');
  }

  /**
   * 提交回答
   */
  async submitAnswer(): Promise<boolean> {
    console.log('[QuestionPage] 准备提交回答...');
    await this.randomDelay(1000, 2000);

    const submitSelectors = [
      '.new-editor-deliver-btn',
      'input[type="submit"][value*="提交"]',
      'button:has-text("提交回答")',
      'a:has-text("提交回答")',
      '.btn-submit',
      'input.submit-btn',
      'button.submit',
    ];

    for (const sel of submitSelectors) {
      if (await this.exists(sel, 3000)) {
        await this.page.click(sel);
        console.log('[QuestionPage] 已点击提交按钮');
        await this.randomDelay(2000, 3000);
        return await this.verifySubmitSuccess();
      }
    }

    console.error('[QuestionPage] 未找到提交按钮');
    return false;
  }

  /**
   * 验证提交是否成功（检查 URL 跳转或成功提示）
   */
  private async verifySubmitSuccess(): Promise<boolean> {
    try {
      // 百度知道提交成功后通常跳转到问题详情页或显示成功提示
      await Promise.race([
        this.page.waitForURL(/zhidao\.baidu\.com\/question\//, { timeout: 10000 }),
        this.page.waitForSelector('.answer-success, .submit-success, .answer-item', { timeout: 10000 }),
      ]);
      console.log('[QuestionPage] 回答提交成功！');
      return true;
    } catch {
      // 检查是否有错误提示
      const hasError = await this.exists('.error-msg, .alert-danger', 2000);
      if (hasError) {
        const errorText = await this.getText('.error-msg, .alert-danger').catch(() => '未知错误');
        console.error(`[QuestionPage] 提交失败: ${errorText}`);
        return false;
      }
      // 无法确定，可能已成功
      console.warn('[QuestionPage] 无法确认提交状态，请手动检查浏览器');
      return false;
    }
  }

  /**
   * 检查当前问题是否已经回答过（页面存在「我的回答」区块）
   */
  async hasAlreadyAnswered(): Promise<boolean> {
    return await this.exists('.answer-mine', 3000);
  }

  /**
   * 完整流程：点击「我来回答」→ 输入内容 → 提交
   * 若已回答过则跳过，返回 null 表示跳过、true/false 表示提交结果
   */
  async writeAndSubmitAnswer(content: string): Promise<boolean | null> {
    if (await this.hasAlreadyAnswered()) {
      console.log('[QuestionPage] 检测到「我的回答」，该问题已回答过，跳过');
      return null;
    }

    const clicked = await this.clickAnswerButton();
    if (!clicked) return false;

    await this.typeAnswer(content);
    return await this.submitAnswer();
  }

  /**
   * 检查是否需要登录才能回答（页面弹出登录框）
   */
  async isLoginRequired(): Promise<boolean> {
    return await this.exists('.login-layer, .passport-login-pop, #passport-login-pop', 2000);
  }
}
