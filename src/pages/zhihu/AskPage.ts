import { BrowserContext } from 'playwright';
import { BasePage } from './BasePage';
import { config } from '../../config';

/**
 * 知乎提问页面
 *
 * 操作流程：
 * 1. 打开知乎首页
 * 2. 点击顶部创作按钮（button#Popover2-toggle），展开下拉菜单
 * 3. 点击「提问题」，弹出提问对话框
 * 4. 在对话框中填写题目（必填）和题目内容（选填）
 * 5. 点击「发布问题」按钮提交
 */
export class AskPage extends BasePage {
  private readonly homeUrl = config.zhihu.baseUrl;

  private readonly selectors = {
    // 顶部创作按钮（触发下拉菜单）
    // inspect 确认：button#Popover2-toggle
    creatorButton: [
      'button#Popover2-toggle',
      'button[id^="Popover"][id$="-toggle"]',
    ],

    // 下拉菜单中的「提问题」选项
    // inspect 确认：button.Button.Menu-item:has-text("提问题")
    askMenuItem: [
      'button:has-text("提问题")',
      'a:has-text("提问题")',
    ],

    // 提问对话框容器
    // inspect 确认：.Modal-enter-done 包含 form.Ask-form
    dialog: '.Modal-enter-done',

    // 问题标题输入框
    // inspect 确认：textarea.Input（placeholder="写下你的问题，准确地描述问题更容易得到解答"）
    // parentPath: div.Ask-titleWrapper > div.Ask-title > div.AskTitle > label.AskTitle-input
    titleInput: [
      '.AskTitle-input textarea',
      '.Ask-titleWrapper textarea',
      'textarea[placeholder*="问题"]',
    ],

    // 问题说明输入框（填入标题后 3s 才出现）
    // inspect 确认：div.notranslate.public-DraftEditor-content（Draft.js contenteditable）
    // parentPath: div.InputLike > div.Dropzone > div.DraftEditor-root > div.DraftEditor-editorContainer
    contentInput: [
      '.Ask-form .public-DraftEditor-content',
      '.InputLike .public-DraftEditor-content',
      '.public-DraftEditor-content',
    ],

    // 发布问题按钮
    // inspect 确认：button:has-text("发布问题")，填入标题前 disabled，填入后 enabled
    submitButton: [
      'button:has-text("发布问题")',
      'button:has-text("提交问题")',
    ],
  };

  constructor(context: BrowserContext) {
    super(context);
  }

  /**
   * 打开知乎首页（前提：已有登录 session）
   */
  async navigate(): Promise<void> {
    await this.open(this.homeUrl);
    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
    await this.randomDelay(1500, 2500);
    console.log('[AskPage] 知乎首页已加载');
  }

  /**
   * 点击顶部创作按钮，展开下拉菜单
   */
  async openCreatorMenu(): Promise<void> {
    console.log('[AskPage] 点击创作按钮...');

    for (const sel of this.selectors.creatorButton) {
      if (await this.exists(sel, 5000)) {
        await this.page.click(sel);
        await this.randomDelay(800, 1500);
        console.log(`[AskPage] 已点击创作按钮: ${sel}`);
        return;
      }
    }

    throw new Error('[AskPage] 未找到创作按钮，请确认已登录且页面已加载完成');
  }

  /**
   * 在下拉菜单中点击「提问题」，打开提问对话框
   */
  async clickAskMenuItem(): Promise<void> {
    console.log('[AskPage] 查找「提问题」菜单项...');

    for (const sel of this.selectors.askMenuItem) {
      if (await this.exists(sel, 5000)) {
        await this.page.click(sel);
        await this.randomDelay(1000, 2000);
        console.log(`[AskPage] 已点击「提问题」: ${sel}`);
        return;
      }
    }

    throw new Error('[AskPage] 未找到「提问题」菜单项，请运行 inspect-ask 脚本确认当前选择器');
  }

  /**
   * 等待提问对话框出现
   */
  private async waitForDialog(): Promise<void> {
    if (await this.exists(this.selectors.dialog, 8000)) {
      console.log('[AskPage] 提问对话框已出现');
      return;
    }
    console.warn('[AskPage] 未检测到对话框容器，继续尝试填写...');
  }

  /**
   * 填写问题标题（必填）
   *
   * 标题框是 <textarea>（class: Input），位于 label.AskTitle-input 内。
   * 填完标题后知乎会动态渲染说明输入框（Draft.js），需等待约 3s。
   */
  async setTitle(title: string): Promise<void> {
    console.log(`[AskPage] 填写问题标题: "${title}"`);

    for (const sel of this.selectors.titleInput) {
      if (await this.exists(sel, 5000)) {
        const el = this.page.locator(sel).first();
        await el.click();
        await this.randomDelay(200, 300);
        await el.fill(title);
        // 触发 input 事件，确保 React 状态更新
        await el.dispatchEvent('input');
        await this.randomDelay(300, 500);
        console.log('[AskPage] 标题填写完成，等待说明输入框渲染（3s）...');
        // 说明框在标题有值后才动态出现，等待其加载
        await this.page.waitForTimeout(3000);
        return;
      }
    }

    throw new Error('[AskPage] 未找到问题标题输入框');
  }

  /**
   * 填写问题说明/内容（选填）
   *
   * 说明框在标题填写后才出现，是一个 Draft.js contenteditable div：
   *   class: notranslate public-DraftEditor-content
   *   parentPath: div.InputLike > div.Dropzone > div.DraftEditor-root > div.DraftEditor-editorContainer
   *
   * 注意：必须在 setTitle() 之后调用（内部已等待 3s）。
   */
  async setContent(content: string): Promise<void> {
    if (!content) return;
    console.log('[AskPage] 填写问题说明...');

    for (const sel of this.selectors.contentInput) {
      if (await this.exists(sel, 5000)) {
        const el = this.page.locator(sel).first();
        await el.click();
        await this.randomDelay(200, 300);
        // Draft.js 不支持 fill()，需要通过键盘输入
        await this.page.keyboard.type(content, { delay: 20 });
        await this.randomDelay(300, 500);
        console.log('[AskPage] 问题说明填写完成');
        return;
      }
    }

    console.warn('[AskPage] 未找到问题说明输入框（Draft.js），跳过内容填写');
  }

  /**
   * 点击「发布问题」按钮提交
   */
  async submit(): Promise<boolean> {
    console.log('[AskPage] 准备发布问题...');
    await this.randomDelay(800, 1500);

    for (const sel of this.selectors.submitButton) {
      if (await this.exists(sel, 5000)) {
        await this.page.click(sel);
        console.log(`[AskPage] 已点击发布按钮: ${sel}`);
        return await this.verifySubmitSuccess();
      }
    }

    console.error('[AskPage] 未找到发布问题按钮');
    return false;
  }

  /**
   * 验证问题提交成功（等待跳转到问题详情页或关闭对话框）
   */
  private async verifySubmitSuccess(): Promise<boolean> {
    try {
      await Promise.race([
        // 提交成功后通常跳转到问题详情页
        this.page.waitForURL(/zhihu\.com\/question\/\d+/, { timeout: 15000 }),
        // 或者对话框消失
        this.page.waitForSelector('[role="dialog"]', { state: 'hidden', timeout: 15000 }),
      ]);
      console.log('[AskPage] 问题发布成功！');
      await this.randomDelay(1000, 2000);
      return true;
    } catch {
      const url = this.page.url();
      if (/zhihu\.com\/question\/\d+/.test(url)) {
        console.log('[AskPage] 已跳转到问题详情页，发布成功');
        return true;
      }
      console.warn('[AskPage] 无法确认发布状态，请手动检查浏览器');
      return false;
    }
  }

  /**
   * 完整流程：打开首页 → 创作菜单 → 提问题 → 填写标题（内含 3s 等待）→ 填写说明（选填）→ 发布
   */
  async ask(title: string, content?: string): Promise<boolean> {
    await this.navigate();
    await this.openCreatorMenu();
    await this.clickAskMenuItem();
    await this.waitForDialog();
    // setTitle 内部会在填完后等待 3s，确保说明输入框渲染完毕
    await this.setTitle(title);

    if (content) {
      await this.setContent(content);
    }

    return await this.submit();
  }
}
