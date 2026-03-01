import { BrowserContext } from 'playwright';
import { BasePage } from './BasePage';
import { config } from '../../config';

export interface SearchResult {
  title: string;
  url: string;
  type: 'question' | 'article' | 'topic' | 'user' | 'unknown';
  excerpt?: string;
}

/**
 * 知乎搜索页面
 */
export class SearchPage extends BasePage {
  private readonly selectors = {
    // 顶部搜索框
    searchInput: 'input.SearchBar-input',
    searchButton: 'button.SearchBar-submitButton',

    // 搜索结果
    resultItems: '.SearchResult-Card',
    questionItem: '.QuestionItem',
    questionTitle: '.QuestionItem-title a',
    questionLink: '.QuestionItem-title a',

    // 综合搜索结果
    contentItem: '.ContentItem',
    contentTitle: '.ContentItem-title a',
  };

  constructor(context: BrowserContext) {
    super(context);
  }

  /**
   * 在知乎搜索关键词
   */
  async search(keyword: string, type: 'general' | 'question' = 'general'): Promise<void> {
    const encodedKeyword = encodeURIComponent(keyword);
    const typeParam = type === 'question' ? '&type=question' : '';
    const searchUrl = `${config.zhihu.baseUrl}/search?q=${encodedKeyword}${typeParam}`;

    console.log(`[SearchPage] 搜索: "${keyword}"`);
    await this.open(searchUrl);
    await this.randomDelay(1000, 2000);
  }

  /**
   * 获取搜索结果列表
   */
  async getResults(maxCount = 10): Promise<SearchResult[]> {
    const results: SearchResult[] = [];

    // 等待结果加载
    await this.page.waitForSelector(
      `${this.selectors.resultItems}, ${this.selectors.contentItem}`,
      { timeout: config.timeout.element }
    );

    // 获取问题类型的结果
    const questionElements = await this.page.locator(this.selectors.questionTitle).all();
    for (const el of questionElements.slice(0, maxCount)) {
      const title = (await el.textContent()) ?? '';
      const href = (await el.getAttribute('href')) ?? '';
      const url = href.startsWith('http') ? href : `${config.zhihu.baseUrl}${href}`;

      results.push({
        title: title.trim(),
        url,
        type: 'question',
      });
    }

    // 如果没有找到问题，尝试通用结果
    if (results.length === 0) {
      const contentElements = await this.page.locator(this.selectors.contentTitle).all();
      for (const el of contentElements.slice(0, maxCount)) {
        const title = (await el.textContent()) ?? '';
        const href = (await el.getAttribute('href')) ?? '';
        const url = href.startsWith('http') ? href : `${config.zhihu.baseUrl}${href}`;
        const type = href.includes('/question/') ? 'question' : 'article';

        results.push({
          title: title.trim(),
          url,
          type,
        });
      }
    }

    console.log(`[SearchPage] 找到 ${results.length} 条结果`);
    return results;
  }

  /**
   * 搜索并返回第一个问题的 URL
   */
  async searchAndGetFirstQuestion(keyword: string): Promise<string | null> {
    await this.search(keyword, 'question');
    const results = await this.getResults(1);

    if (results.length === 0) {
      console.warn(`[SearchPage] 未找到关于 "${keyword}" 的问题`);
      return null;
    }

    console.log(`[SearchPage] 找到问题: ${results[0].title}`);
    return results[0].url;
  }
}
