import { BrowserContext } from 'playwright';
import { BasePage } from './BasePage';

/**
 * 知乎回答评论页面
 *
 * 操作流程：
 * 1. 打开回答页（/question/xxx/answer/yyy）
 * 2. 找到该回答的评论入口按钮并点击，展开评论列表
 * 3. 点击评论输入框（Draft.js contenteditable），输入评论内容
 * 4. 点击「发布」按钮提交
 */
export class CommentPage extends BasePage {
  private readonly selectors = {
    // 评论入口按钮（在回答操作栏中，排除问题头部的评论按钮）
    // inspect 确认：class 含 ContentItem-action，parentClass 含 ContentItem-actions
    commentTrigger: [
      '.ContentItem-actions button:has-text("条评论")',
      '.ContentItem-actions button:has-text("添加评论")',
    ],

    // 评论输入框（Draft.js contenteditable，在展开评论列表顶部）
    // inspect 确认：div.notranslate.public-DraftEditor-content
    // parentPath: div.InputLike > div.Dropzone > div.DraftEditor-root > ...
    commentInput: [
      '.InputLike .public-DraftEditor-content',
      '.public-DraftEditor-content',
    ],

    // 发布按钮
    // inspect 确认：button "发布"，class 含 Button--primary Button--blue，输入前 disabled
    publishButton: 'button.Button--primary:has-text("发布")',
  };

  constructor(context: BrowserContext) {
    super(context);
  }

  /**
   * 打开回答页
   * @param url 完整的回答 URL，如 https://www.zhihu.com/question/xxx/answer/yyy
   */
  async navigate(url: string): Promise<void> {
    await this.open(url);
    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
    await this.randomDelay(2000, 3000);
    console.log(`[CommentPage] 回答页已加载: ${url}`);
  }

  /**
   * 点击评论入口按钮，展开评论列表
   *
   * 对于 /question/xxx/answer/yyy 直链，第一个 .ContentItem-actions 内的评论按钮
   * 对应的就是目标回答（其上方为问题头部的评论，已通过选择器排除）。
   */
  async openCommentSection(): Promise<void> {
    console.log('[CommentPage] 查找评论入口按钮...');

    for (const sel of this.selectors.commentTrigger) {
      if (await this.exists(sel, 5000)) {
        const btn = this.page.locator(sel).first();
        const text = await btn.textContent();
        console.log(`[CommentPage] 点击评论按钮: "${text?.trim()}" (${sel})`);
        await btn.click();
        await this.randomDelay(1500, 2500);
        console.log('[CommentPage] 评论列表已展开');
        return;
      }
    }

    throw new Error('[CommentPage] 未找到评论入口按钮，请确认回答页已正常加载');
  }

  /**
   * 在评论输入框中输入内容（Draft.js contenteditable）
   */
  async typeComment(content: string): Promise<void> {
    console.log(`[CommentPage] 填写评论内容: "${content.slice(0, 30)}${content.length > 30 ? '...' : ''}"`);

    for (const sel of this.selectors.commentInput) {
      if (await this.exists(sel, 8000)) {
        const el = this.page.locator(sel).first();
        await el.click();
        await this.randomDelay(300, 500);
        // Draft.js 不支持 fill()，通过键盘输入
        await this.page.keyboard.type(content, { delay: 20 });
        await this.randomDelay(300, 500);
        console.log('[CommentPage] 评论内容已填写');
        return;
      }
    }

    throw new Error('[CommentPage] 未找到评论输入框');
  }

  /**
   * 点击「发布」按钮提交评论
   */
  async publish(): Promise<boolean> {
    console.log('[CommentPage] 准备发布评论...');
    await this.randomDelay(500, 1000);

    if (!await this.exists(this.selectors.publishButton, 5000)) {
      throw new Error('[CommentPage] 未找到发布按钮');
    }

    const btn = this.page.locator(this.selectors.publishButton).first();
    const isDisabled = await btn.evaluate(el => (el as HTMLButtonElement).disabled);
    if (isDisabled) {
      throw new Error('[CommentPage] 发布按钮仍处于禁用状态，请确认评论内容已正确填入');
    }

    await btn.click();
    console.log('[CommentPage] 已点击发布按钮');

    // 等待发布完成：输入框清空或发布按钮重新变为禁用状态
    try {
      await this.page.waitForFunction(
        (sel) => {
          const btn = document.querySelector(sel) as HTMLButtonElement | null;
          return btn?.disabled === true;
        },
        this.selectors.publishButton,
        { timeout: 8000 },
      );
      console.log('[CommentPage] 评论发布成功！');
      return true;
    } catch {
      // 降级：简单等待后认为成功
      await this.randomDelay(1500, 2000);
      console.log('[CommentPage] 评论已提交（无法精确检测发布结果，请手动确认）');
      return true;
    }
  }

  /**
   * 完整流程：打开回答页 → 展开评论 → 填写评论 → 发布
   */
  async comment(url: string, content: string): Promise<boolean> {
    await this.navigate(url);
    await this.openCommentSection();
    await this.typeComment(content);
    return await this.publish();
  }
}
