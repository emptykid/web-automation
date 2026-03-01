import { BrowserContext } from 'playwright';
import { BasePage } from './BasePage';
import { config } from '../../config';

export interface ZhidaoSearchResult {
  title: string;
  url: string;
  excerpt?: string;
  answerCount?: string;
  asker?: string;
}

/**
 * 百度知道搜索页面
 * 搜索 URL 格式：https://zhidao.baidu.com/search?word=关键词&lm=0&site=-1&sites=0&date=3
 */
export class SearchPage extends BasePage {
  private readonly selectors = {
    // 搜索结果列表容器
    resultList: '#wgt-questions',
    // 单条结果
    resultItem: '.wgt-questions li, .list-question-item',
    // 问题标题链接
    titleLink: '.question-title a, .list-item-title a',
    // 摘要
    excerpt: '.question-desc, .list-item-desc',
    // 回答数
    answerCount: '.question-answers, .list-item-answer',
  };

  constructor(context: BrowserContext) {
    super(context);
  }

  /**
   * 按关键词搜索，跳转到搜索结果页
   */
  async search(keyword: string): Promise<void> {
    const encodedKeyword = encodeURIComponent(keyword);
    const searchUrl = `${config.zhidao.baseUrl}/search?lm=0&rn=10&pn=0&fr=search&dyTabStr=null&word=${encodedKeyword}`;
    console.log(`[SearchPage] 搜索: "${keyword}"`);
    await this.open(searchUrl);
    await this.randomDelay(1000, 2000);
  }

  /**
   * 获取当前搜索结果页的问题列表
   */
  async getResults(maxCount = 10): Promise<ZhidaoSearchResult[]> {
    // 等待结果加载
    await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    await this.randomDelay(500, 1000);

    const results = await this.page.evaluate(
      ({ maxCount }: { maxCount: number }) => {
        const items: { title: string; url: string; excerpt: string; answerCount: string }[] = [];

        // 百度知道搜索结果的多种可能选择器
        const selectors = [
          '.list-question-item',
          '.wgt-questions li',
          '.question-list .question-item',
          'dl.dl',
          '.search-result-list li',
        ];

        let elements: Element[] = [];
        for (const sel of selectors) {
          const found = Array.from(document.querySelectorAll(sel));
          if (found.length > 0) {
            elements = found;
            break;
          }
        }

        for (const el of elements.slice(0, maxCount)) {
          // 找标题链接
          const titleLinkSelectors = ['h3 a', '.question-title a', '.list-item-title a', 'a.ti', 'a[href*="/question/"]'];
          let titleEl: HTMLAnchorElement | null = null;
          for (const s of titleLinkSelectors) {
            titleEl = el.querySelector(s) as HTMLAnchorElement | null;
            if (titleEl) break;
          }
          if (!titleEl) continue;

          const title = titleEl.textContent?.trim() ?? '';
          let url = titleEl.href ?? '';
          if (!url.startsWith('http')) {
            url = `https://zhidao.baidu.com${url}`;
          }
          if (!title || !url) continue;

          // 摘要
          const excerptEl = el.querySelector('.question-desc, .list-item-desc, .description, dt.dt');
          const excerpt = excerptEl?.textContent?.trim() ?? '';

          // 回答数
          const answerEl = el.querySelector('.question-answers, .answers-num, .list-item-answer');
          const answerCount = answerEl?.textContent?.trim() ?? '';

          items.push({ title, url, excerpt, answerCount });
        }

        return items;
      },
      { maxCount },
    );

    console.log(`[SearchPage] 找到 ${results.length} 条结果`);
    return results;
  }

  /**
   * 搜索并返回第一条问题的 URL
   */
  async searchAndGetFirstQuestion(keyword: string): Promise<string | null> {
    await this.search(keyword);
    const results = await this.getResults(1);
    if (results.length === 0) {
      console.warn(`[SearchPage] 未找到关于 "${keyword}" 的问题`);
      return null;
    }
    console.log(`[SearchPage] 找到问题: ${results[0].title}`);
    return results[0].url;
  }
}
