import { BrowserContext } from 'playwright';
import { BasePage } from './BasePage';
import { config } from '../../config';

export interface AnswerInfo {
  author: string;
  upvotes: number;
  content: string;
}

/**
 * 知乎问题页面
 * 负责浏览问题、读取回答、撰写并发布回答
 */
export class QuestionPage extends BasePage {
  private readonly selectors = {
    // 问题信息
    questionTitle: '.QuestionHeader-title',
    questionDetail: '.QuestionHeader-detail',

    // 回答列表
    answerItem: '.AnswerItem',
    answerAuthor: '.AuthorInfo-name',
    answerContent: '.RichContent-inner',
    answerUpvotes: '.VoteButton--up',

    // 写回答
    writeAnswerButton: '.QuestionHeader .QuestionButtonGroup button:last-child',
    answerEditor: '.AnswerContent',
    editorContentArea: '.DraftEditor-editorContainer',
    editorInput: '.public-DraftEditor-content',

    // 工具栏图片按钮
    toolbarImageButton: '.toolbar-section button[aria-label="图片"]',

    // 图片素材浮层
    materialPersonalTab: '.Modal-content button:nth-child(4)',
    materialList: '.Modal-content div[role="list"]',
    materialItem: '.css-1n1dmov',
    materialItemTitle: '.css-56d21m',
    materialInsertButton: '.Modal-content button:has-text("插入图片")',

    // 发布按钮
    submitAnswerButton: '#AnswerFormPortalContainer .is-bottom button:has-text("发布回答")',

    // 已有回答数量
    answerCount: '.QuestionAnswerStatus-counts',
  };

  constructor(context: BrowserContext) {
    super(context);
  }

  /**
   * 打开指定问题页面
   */
  async navigate(questionUrl: string): Promise<void> {
    await this.open(questionUrl);
    await this.randomDelay(1000, 2000);
  }

  /**
   * 获取问题标题
   */
  async getTitle(): Promise<string> {
    return await this.getText(this.selectors.questionTitle);
  }

  /**
   * 获取问题描述
   */
  async getDetail(): Promise<string> {
    const hasDetail = await this.exists(this.selectors.questionDetail, 2000);
    if (!hasDetail) return '';
    return await this.getText(this.selectors.questionDetail);
  }

  /**
   * 获取现有回答列表
   */
  async getAnswers(maxCount = 5): Promise<AnswerInfo[]> {
    const answers: AnswerInfo[] = [];

    const hasAnswers = await this.exists(this.selectors.answerItem, 5000);
    if (!hasAnswers) {
      console.log('[QuestionPage] 暂无回答');
      return answers;
    }

    const items = await this.page.locator(this.selectors.answerItem).all();
    for (const item of items.slice(0, maxCount)) {
      const author = (await item.locator(this.selectors.answerAuthor).textContent()) ?? '';
      const content = (await item.locator(this.selectors.answerContent).textContent()) ?? '';
      const upvotesText = (await item.locator(this.selectors.answerUpvotes).textContent()) ?? '0';
      const upvotes = parseInt(upvotesText.replace(/[^0-9]/g, ''), 10) || 0;

      answers.push({
        author: author.trim(),
        content: content.trim(),
        upvotes,
      });
    }

    return answers;
  }

  /**
   * 点击"写回答"按钮，打开编辑器
   */
  async clickWriteAnswer(): Promise<boolean> {
    console.log('[QuestionPage] 点击写回答按钮');

    const hasButton = await this.exists(this.selectors.writeAnswerButton, 5000);
    if (!hasButton) {
      console.error('[QuestionPage] 未找到写回答按钮（可能未登录）');
      return false;
    }

    await this.click(this.selectors.writeAnswerButton);
    await this.randomDelay(1000, 2000);

    // 等待编辑器出现
    const editorAppeared = await this.exists(this.selectors.editorInput, 5000);
    if (!editorAppeared) {
      console.error('[QuestionPage] 编辑器未出现');
      return false;
    }

    console.log('[QuestionPage] 编辑器已打开');
    return true;
  }

  /**
   * 在回答编辑器中输入内容
   * 知乎使用 Draft.js 富文本编辑器
   */
  async typeAnswer(content: string): Promise<void> {
    console.log('[QuestionPage] 开始输入回答内容...');

    const editorSelector = this.selectors.editorInput;
    await this.page.waitForSelector(editorSelector, { timeout: config.timeout.element });

    // 点击编辑器激活
    await this.page.click(editorSelector);
    await this.randomDelay(300, 500);

    // 使用 JavaScript 方式输入文本（兼容 Draft.js）
    await this.page.focus(editorSelector);

    // 分段输入，模拟人工打字
    const paragraphs = content.split('\n');
    for (let i = 0; i < paragraphs.length; i++) {
      const paragraph = paragraphs[i];
      if (paragraph) {
        await this.page.type(editorSelector, paragraph, { delay: 30 });
      }
      // 如果不是最后一段，按 Enter 换行
      if (i < paragraphs.length - 1) {
        await this.page.keyboard.press('Enter');
      }
      await this.randomDelay(100, 300);
    }

    console.log('[QuestionPage] 回答内容输入完成');
  }

  /**
   * 通过剪贴板粘贴方式输入（适合长文本）
   */
  async pasteAnswer(content: string): Promise<void> {
    console.log('[QuestionPage] 通过粘贴方式输入回答...');

    const editorSelector = this.selectors.editorInput;
    await this.page.waitForSelector(editorSelector, { timeout: config.timeout.element });
    await this.page.click(editorSelector);
    await this.randomDelay(300, 500);

    // 通过 JavaScript 设置剪贴板并粘贴
    await this.page.evaluate((text: string) => {
      const clipboardData = new DataTransfer();
      clipboardData.setData('text/plain', text);

      const pasteEvent = new ClipboardEvent('paste', {
        bubbles: true,
        cancelable: true,
        clipboardData,
      });

      document.activeElement?.dispatchEvent(pasteEvent);
    }, content);

    await this.randomDelay(500, 1000);
    console.log('[QuestionPage] 粘贴完成');
  }

  /**
   * 发布回答
   */
  async submitAnswer(): Promise<boolean> {
    console.log('[QuestionPage] 准备发布回答...');
    await this.randomDelay(1000, 2000);

    const hasSubmitButton = await this.exists(this.selectors.submitAnswerButton, 5000);
    if (!hasSubmitButton) {
      console.error('[QuestionPage] 未找到发布按钮');
      return false;
    }

    await this.click(this.selectors.submitAnswerButton);
    console.log('[QuestionPage] 已点击发布按钮');

    // 等待发布完成（编辑器消失）
    try {
      await this.page.waitForSelector(this.selectors.editorInput, {
        state: 'detached',
        timeout: 10000,
      });
      console.log('[QuestionPage] 回答发布成功！');
      return true;
    } catch {
      // 编辑器未消失，可能发布失败
      console.warn('[QuestionPage] 无法确认发布状态，请手动检查');
      return false;
    }
  }

  /**
   * 从个人素材库插入图片
   * 在编辑器已激活的状态下调用
   */
  async insertImageFromMaterials(imageName: string): Promise<boolean> {
    console.log(`[QuestionPage] 插入图片素材: ${imageName}`);

    // Step 1: 点击工具栏图片按钮
    const hasToolbarBtn = await this.exists(this.selectors.toolbarImageButton, 5000);
    if (!hasToolbarBtn) {
      console.error('[QuestionPage] 未找到工具栏图片按钮');
      return false;
    }
    await this.click(this.selectors.toolbarImageButton);
    await this.randomDelay(500, 1000);

    // Step 2: 切换到「个人素材」 tab
    const hasTab = await this.exists(this.selectors.materialPersonalTab, 5000);
    if (!hasTab) {
      console.error('[QuestionPage] 未找到个人素材标签');
      return false;
    }
    await this.click(this.selectors.materialPersonalTab);
    await this.randomDelay(500, 1000);

    // Step 3: 在列表中查找匹配的图片并点击
    const hasList = await this.exists(this.selectors.materialList, 5000);
    if (!hasList) {
      console.error('[QuestionPage] 未找到素材列表');
      return false;
    }

    const found = await this.page.evaluate(
      ({ itemSel, titleSel, name }: { itemSel: string; titleSel: string; name: string }) => {
        const items = Array.from(document.querySelectorAll(itemSel));
        for (const item of items) {
          const titleEl = item.querySelector(titleSel);
          if (titleEl && titleEl.textContent?.includes(name)) {
            // 点击图片缩略图进行选中
            const img = item.querySelector('img');
            (img ?? (item as HTMLElement)).click();
            return titleEl.textContent?.trim() ?? name;
          }
        }
        return null;
      },
      {
        itemSel: `${this.selectors.materialList} ${this.selectors.materialItem}`,
        titleSel: this.selectors.materialItemTitle,
        name: imageName,
      },
    );

    if (!found) {
      console.error(`[QuestionPage] 未找到匹配的图片素材: "${imageName}"`);
      return false;
    }

    console.log(`[QuestionPage] 已选中图片: ${found}`);
    await this.randomDelay(300, 500);

    // Step 4: 点击插入按钮
    const hasInsertBtn = await this.exists(this.selectors.materialInsertButton, 3000);
    if (hasInsertBtn) {
      await this.click(this.selectors.materialInsertButton);
      console.log('[QuestionPage] 已点击插入按钮');
    } else {
      console.log('[QuestionPage] 无需插入按钮，图片已直接选中');
    }

    await this.randomDelay(500, 1000);
    console.log('[QuestionPage] 图片插入完成');
    return true;
  }

  /**
   * 完整流程：写回答并发布
   */
  async writeAndSubmitAnswer(content: string, usePaste = false, imageName?: string): Promise<boolean> {
    const opened = await this.clickWriteAnswer();
    if (!opened) return false;

    if (usePaste) {
      await this.pasteAnswer(content);
    } else {
      await this.typeAnswer(content);
    }

    if (imageName) {
      const imageInserted = await this.insertImageFromMaterials(imageName);
      if (!imageInserted) {
        console.warn('[QuestionPage] 图片插入失败，继续发布...');
      }
    }

    return await this.submitAnswer();
  }
}
