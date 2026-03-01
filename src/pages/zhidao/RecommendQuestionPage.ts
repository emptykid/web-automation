import { BrowserContext } from 'playwright';
import { BasePage } from './BasePage';

export interface ZhidaoRecommendQuestion {
  title: string;
  url: string;
}

/**
 * 百度知道「为我推荐」问题页面
 * 地址：https://zhidao.baidu.com/ihome/homepage/recommendquestion
 */
export class RecommendQuestionPage extends BasePage {
  private readonly url = 'https://zhidao.baidu.com/ihome/homepage/recommendquestion';

  private readonly selectors = {
    questionItem: '.recommend-question-item',
    titleLink: '.recommend-question-title-item',
    searchInput: 'input.uhome-search-input',
  };

  constructor(context: BrowserContext) {
    super(context);
  }

  async navigate(): Promise<void> {
    await this.open(this.url);
    await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    await this.randomDelay(800, 1500);
  }

  /**
   * 在搜索框中输入关键词并等待结果刷新
   */
  async filterByKeyword(keyword: string): Promise<void> {
    const inputExists = await this.exists(this.selectors.searchInput, 5000);
    if (!inputExists) {
      console.warn('[RecommendQuestionPage] 未找到搜索框，跳过关键词筛选');
      return;
    }

    console.log(`[RecommendQuestionPage] 输入关键词: "${keyword}"`);
    await this.page.fill(this.selectors.searchInput, keyword);
    await this.page.press(this.selectors.searchInput, 'Enter');
    // Wait for filtered results to load
    await this.randomDelay(3000, 4000);
  }

  /**
   * 获取推荐问题列表
   */
  async getQuestions(maxCount = 20): Promise<ZhidaoRecommendQuestion[]> {
    const results = await this.page.evaluate(
      ({ itemSel, linkSel, max }: { itemSel: string; linkSel: string; max: number }) => {
        const items: { title: string; url: string }[] = [];

        // Try per-item approach first
        const itemEls = Array.from(document.querySelectorAll(itemSel)).slice(0, max);
        if (itemEls.length > 0) {
          for (const el of itemEls) {
            const a = el.querySelector(linkSel) as HTMLAnchorElement | null;
            if (!a) continue;
            const title = a.textContent?.trim() ?? '';
            let url = a.href ?? '';
            if (!url.startsWith('http')) {
              url = `https://zhidao.baidu.com${url}`;
            }
            if (title && url) items.push({ title, url });
          }
          return items;
        }

        // Fallback: grab all title links directly
        const links = Array.from(document.querySelectorAll(linkSel)).slice(0, max) as HTMLAnchorElement[];
        for (const a of links) {
          const title = a.textContent?.trim() ?? '';
          let url = a.href ?? '';
          if (!url.startsWith('http')) {
            url = `https://zhidao.baidu.com${url}`;
          }
          if (title && url) items.push({ title, url });
        }
        return items;
      },
      { itemSel: this.selectors.questionItem, linkSel: this.selectors.titleLink, max: maxCount },
    );

    console.log(`[RecommendQuestionPage] 获取到 ${results.length} 条推荐问题`);
    return results;
  }
}
