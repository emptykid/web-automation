import { BrowserContext } from 'playwright';
import { BasePage } from './BasePage';

/**
 * 知乎回答赞同页面
 *
 * 操作流程：
 * 1. 打开回答页（/question/xxx/answer/yyy）
 * 2. 找到该回答底部的「赞同」按钮（.VoteButton，排除踩按钮 .VoteButton--down）
 * 3. 检查是否已赞同，若未赞同则点击
 *
 * 选择器依据：
 *   赞同按钮：button.VoteButton（不含 VoteButton--down class）
 *   已赞同状态：按钮含 VoteButton--up 或 is-active class
 *   粘性操作栏（.Sticky / .is-fixed）跟随当前视口内的回答，是最可靠的定位方式
 */
export class UpvotePage extends BasePage {
  private readonly selectors = {
    // 赞同按钮候选（优先用粘性操作栏，它跟随当前显示的回答）
    // .VoteButton--down 是踩按钮，需排除
    upvoteButton: [
      '.ContentItem-actions.Sticky .VoteButton:not(.VoteButton--down)',
      '.RichContent-actions .VoteButton:not(.VoteButton--down)',
      '.ContentItem-actions .VoteButton:not(.VoteButton--down)',
    ],
  };

  constructor(context: BrowserContext) {
    super(context);
  }

  /**
   * 打开回答页
   */
  async navigate(url: string): Promise<void> {
    await this.open(url);
    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
    await this.randomDelay(2000, 3000);
    console.log(`[UpvotePage] 回答页已加载: ${url}`);
  }

  /**
   * 检查是否已赞同（按钮含 VoteButton--up 或 is-active class）
   */
  private async isUpvoted(buttonSel: string): Promise<boolean> {
    const classes = await this.page.locator(buttonSel).first().getAttribute('class') ?? '';
    return classes.includes('VoteButton--up') || classes.includes('is-active');
  }

  /**
   * 执行赞同操作
   * @returns true 表示本次点击成功；false 表示已赞同（跳过）
   */
  async upvote(): Promise<boolean> {
    console.log('[UpvotePage] 查找赞同按钮...');

    for (const sel of this.selectors.upvoteButton) {
      if (!await this.exists(sel, 5000)) continue;

      const btn = this.page.locator(sel).first();
      const text = (await btn.textContent())?.trim() ?? '';
      console.log(`[UpvotePage] 找到赞同按钮: "${text}" (${sel})`);

      if (await this.isUpvoted(sel)) {
        console.log('[UpvotePage] 已赞同该回答，无需重复操作');
        return false;
      }

      await btn.scrollIntoViewIfNeeded();
      await this.randomDelay(500, 1000);
      await btn.click();
      await this.randomDelay(1000, 2000);

      if (await this.isUpvoted(sel)) {
        console.log('[UpvotePage] 赞同成功！');
        return true;
      }

      // 降级验证：按钮文字数字变化也算成功
      const newText = (await btn.textContent())?.trim() ?? '';
      if (newText !== text) {
        console.log(`[UpvotePage] 赞同成功！（${text} → ${newText}）`);
        return true;
      }

      console.warn('[UpvotePage] 点击后状态未变化，请手动确认');
      return false;
    }

    throw new Error('[UpvotePage] 未找到赞同按钮，请确认回答页已正常加载');
  }

  /**
   * 完整流程：打开回答页 → 赞同
   */
  async upvoteAnswer(url: string): Promise<boolean> {
    await this.navigate(url);
    return await this.upvote();
  }
}
