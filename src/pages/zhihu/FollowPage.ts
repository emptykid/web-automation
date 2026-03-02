import { BrowserContext } from 'playwright';
import { BasePage } from './BasePage';
import { config } from '../../config';

/**
 * 知乎关注用户页面
 *
 * 操作流程：
 * 1. 打开目标用户主页：https://www.zhihu.com/people/{username}
 * 2. 找到关注按钮（.FollowButton），检查是否已关注
 * 3. 若未关注，点击按钮完成关注
 */
export class FollowPage extends BasePage {
  private readonly selectors = {
    // 关注/已关注按钮
    followButton: '.FollowButton',
    // 用户名（用于确认页面加载正确）
    profileName: '.ProfileHeader-name',
  };

  constructor(context: BrowserContext) {
    super(context);
  }

  /**
   * 打开目标用户主页
   */
  async navigate(username: string): Promise<void> {
    const url = `${config.zhihu.baseUrl}/people/${username}`;
    await this.open(url);
    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
    await this.randomDelay(1500, 2500);
    console.log(`[FollowPage] 已打开用户主页: ${url}`);
  }

  /**
   * 检查是否已关注该用户
   * 已关注时按钮文字为「已关注」，未关注时为「关注他」/「关注她」/「关注 TA」
   */
  async isFollowing(): Promise<boolean> {
    if (!await this.exists(this.selectors.followButton, 5000)) {
      throw new Error('[FollowPage] 未找到关注按钮，请确认用户主页已正常加载');
    }
    const text = await this.getText(this.selectors.followButton);
    return text.includes('已关注');
  }

  /**
   * 执行关注操作
   * @returns true 表示本次点击成功；false 表示已是目标状态（跳过）
   */
  async follow(): Promise<boolean> {
    if (await this.isFollowing()) {
      console.log('[FollowPage] 已经关注该用户，无需重复操作');
      return false;
    }

    console.log('[FollowPage] 点击关注按钮...');
    await this.page.click(this.selectors.followButton);
    await this.randomDelay(1000, 2000);

    if (await this.isFollowing()) {
      console.log('[FollowPage] 关注成功！');
      return true;
    }

    await this.randomDelay(1000, 1500);
    if (await this.isFollowing()) {
      console.log('[FollowPage] 关注成功！');
      return true;
    }

    console.warn('[FollowPage] 点击后按钮状态未变为「已关注」，请手动确认');
    return false;
  }

  /**
   * 执行取消关注操作
   * @returns true 表示本次取消成功；false 表示本来就未关注（跳过）
   */
  async unfollow(): Promise<boolean> {
    if (!await this.isFollowing()) {
      console.log('[FollowPage] 当前未关注该用户，无需取消');
      return false;
    }

    console.log('[FollowPage] 点击取消关注按钮...');
    await this.page.click(this.selectors.followButton);
    await this.randomDelay(1000, 2000);

    if (!await this.isFollowing()) {
      console.log('[FollowPage] 取消关注成功！');
      return true;
    }

    await this.randomDelay(1000, 1500);
    if (!await this.isFollowing()) {
      console.log('[FollowPage] 取消关注成功！');
      return true;
    }

    console.warn('[FollowPage] 点击后按钮状态未恢复为未关注，请手动确认');
    return false;
  }
}
