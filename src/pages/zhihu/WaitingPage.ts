import { BrowserContext } from 'playwright';
import { BasePage } from './BasePage';

export type WaitingType = 'recommend' | 'invite' | 'new' | 'hot';

export interface WaitingQuestion {
  index: number;
  title: string;
  url: string;
  stats: string;
}

const TYPE_URL_MAP: Record<WaitingType, string> = {
  recommend: 'https://www.zhihu.com/question/waiting',
  invite: 'https://www.zhihu.com/question/waiting?type=invite',
  new: 'https://www.zhihu.com/question/waiting?type=new',
  hot: 'https://www.zhihu.com/question/waiting?type=hot',
};

/**
 * 知乎「等你来答」页面
 */
export class WaitingPage extends BasePage {
  private readonly selectors = {
    // 问题列表条目（.jsNavigable 是每个实际问题卡片的容器）
    questionItem: '.QuestionWaiting-questions .jsNavigable',
  };

  constructor(context: BrowserContext) {
    super(context);
  }

  async navigate(type: WaitingType = 'recommend'): Promise<void> {
    await this.open(TYPE_URL_MAP[type]);
    await this.randomDelay(1500, 2500);
  }

  /**
   * 获取等待回答的问题列表
   */
  async getQuestions(count = 10): Promise<WaitingQuestion[]> {
    // 等待问题列表出现
    const hasItems = await this.exists(this.selectors.questionItem, 8000);
    if (!hasItems) {
      console.error('[WaitingPage] 未找到问题列表，可能未登录或页面结构已变更');
      return [];
    }

    const questions = await this.page.evaluate(
      ({ itemSel, maxCount }: { itemSel: string; maxCount: number }) => {
        const items = Array.from(document.querySelectorAll(itemSel));
        const results: { title: string; url: string; stats: string }[] = [];

        for (const item of items) {
          // 在条目内查找问题链接（href 含数字 question ID，排除导航链接）
          const links = Array.from(item.querySelectorAll('a[href]')) as HTMLAnchorElement[];
          const questionLink = links.find((a) => /\/question\/\d+/.test(a.href));
          if (!questionLink) continue;

          // 有些链接内含「新问」标签 div，取最后的文本节点更干净
          const rawText = Array.from(questionLink.childNodes)
            .filter((n) => n.nodeType === Node.TEXT_NODE)
            .map((n) => n.textContent?.trim())
            .filter(Boolean)
            .join('')
            || questionLink.textContent?.trim();
          const title = rawText?.trim();
          if (!title) continue;

          // 统计信息在问题链接的下一个兄弟元素（.css-wkcc0n）
          const statsEl = questionLink.nextElementSibling as HTMLElement | null;
          const stats = statsEl?.textContent?.trim() ?? '';

          results.push({ title, url: questionLink.href, stats });

          if (results.length >= maxCount) break;
        }

        return results;
      },
      { itemSel: this.selectors.questionItem, maxCount: count },
    );

    return questions.map((q, i) => ({ index: i + 1, ...q }));
  }
}
