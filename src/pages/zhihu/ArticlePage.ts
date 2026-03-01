import { BrowserContext } from 'playwright';
import * as path from 'path';
import { BasePage } from './BasePage';
import { config } from '../../config';

/**
 * 正文内容段：纯文字 或 图片占位
 * 通过 ArticlePage.parseContentSegments() 从含 [IMAGE:path] 标记的字符串中解析
 */
export interface ContentSegment {
  type: 'text' | 'image';
  value: string;
}

/**
 * 知乎专栏文章编辑页
 * 负责打开写文章页面、填入标题和正文、设置封面、发布文章
 */
export class ArticlePage extends BasePage {
  private readonly selectors = {
    // 标题输入框（知乎文章编辑器顶部 textarea，placeholder 包含"请输入标题"）
    titleInput: 'textarea[placeholder*="请输入标题"]',

    // 正文编辑器（Draft.js）
    editorInput: '.public-DraftEditor-content',

    // 添加封面区域的 label（实际文本是"添加封面"）
    coverLabel: 'label:has-text("添加封面")',

    // 封面专用 file input（始终在 DOM 中，可直接 setInputFiles）
    coverFileInput: 'input.UploadPicture-input',

    // 封面裁剪/确认按钮（上传后可能出现）
    coverConfirmButton: 'button:has-text("确认")',

    // 发布文章按钮（顶部右上角）
    publishButton: 'button:has-text("发布")',

    // ── 发布设置：话题 ──
    // 点击后展开话题搜索输入框
    topicAddButton: 'button:has-text("添加话题")',
    // 话题搜索输入框（默认隐藏，点击 topicAddButton 后可用）
    topicSearchInput: 'input[aria-label="搜索话题"]',
    // 话题搜索下拉中的候选按钮
    topicSuggestionItem: '.Popover-content button',

    // ── 发布设置：专栏 ──
    // "发布到专栏" radio label（点击后展开专栏 / 话题设置区域）
    columnRadioPublish: 'label:has-text("发布到专栏")',
    // "不发布到专栏" radio label（默认选中）
    columnRadioNone: 'label:has-text("不发布到专栏")',
    // 专栏选择下拉按钮（仅在选中"发布到专栏"后出现）
    columnSelectorCombo: '.ColumnSetting-ColumnSelector button[role="combobox"]',
    // 专栏下拉列表中的候选按钮
    columnOptionItem: '.Popover-content button',
  };

  constructor(context: BrowserContext) {
    super(context);
  }

  /**
   * 打开知乎文章编辑页
   */
  async navigate(): Promise<void> {
    await this.open('https://zhuanlan.zhihu.com/write');
    // 等待编辑器完全加载
    await this.page.waitForSelector(this.selectors.editorInput, {
      timeout: config.timeout.navigation,
    });
    await this.randomDelay(1000, 2000);
    console.log('[ArticlePage] 文章编辑器已加载');
  }

  /**
   * 填写文章标题
   */
  async setTitle(title: string): Promise<void> {
    console.log('[ArticlePage] 填写文章标题...');

    await this.page.waitForSelector(this.selectors.titleInput, {
      timeout: config.timeout.element,
    });
    await this.page.click(this.selectors.titleInput);
    await this.randomDelay(300, 500);
    await this.page.type(this.selectors.titleInput, title, { delay: 50 });

    console.log(`[ArticlePage] 标题填写完成: "${title}"`);
  }

  /**
   * 在正文编辑器中逐字输入内容（适合短文本，< 200 字符）
   */
  async typeContent(content: string): Promise<void> {
    console.log('[ArticlePage] 开始逐字输入正文...');

    const editorSelector = this.selectors.editorInput;
    await this.page.waitForSelector(editorSelector, { timeout: config.timeout.element });
    await this.page.click(editorSelector);
    await this.randomDelay(300, 500);
    await this.page.focus(editorSelector);

    const paragraphs = content.split('\n');
    for (let i = 0; i < paragraphs.length; i++) {
      const paragraph = paragraphs[i];
      if (paragraph) {
        await this.page.type(editorSelector, paragraph, { delay: 30 });
      }
      if (i < paragraphs.length - 1) {
        await this.page.keyboard.press('Enter');
      }
      await this.randomDelay(100, 300);
    }

    console.log('[ArticlePage] 正文输入完成');
  }

  /**
   * 通过剪贴板粘贴方式输入正文（适合长文本，≥ 200 字符）
   */
  async pasteContent(content: string): Promise<void> {
    console.log('[ArticlePage] 通过粘贴方式输入正文...');

    const editorSelector = this.selectors.editorInput;
    await this.page.waitForSelector(editorSelector, { timeout: config.timeout.element });
    await this.page.click(editorSelector);
    await this.randomDelay(300, 500);

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
    console.log('[ArticlePage] 正文粘贴完成');
  }

  /**
   * 解析含 [IMAGE:路径] 标记的正文字符串，拆分为文字段和图片段的有序数组。
   *
   * 示例输入：
   *   "第一段文字\n[IMAGE:./Assets/图1.png]\n第二段文字"
   * 输出：
   *   [ { type:'text', value:'第一段文字\n' },
   *     { type:'image', value:'./Assets/图1.png' },
   *     { type:'text', value:'\n第二段文字' } ]
   */
  static parseContentSegments(content: string): ContentSegment[] {
    const segments: ContentSegment[] = [];
    const markerRegex = /\[IMAGE:([^\]]+)\]/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = markerRegex.exec(content)) !== null) {
      const textBefore = content.slice(lastIndex, match.index);
      if (textBefore) segments.push({ type: 'text', value: textBefore });
      segments.push({ type: 'image', value: match[1].trim() });
      lastIndex = match.index + match[0].length;
    }

    const remaining = content.slice(lastIndex);
    if (remaining) segments.push({ type: 'text', value: remaining });

    return segments;
  }

  /**
   * 在当前光标处粘贴文字（不移动光标到末尾，保留插入位置）
   */
  private async _pasteAtCursor(text: string): Promise<void> {
    await this.page.click(this.selectors.editorInput);
    await this.randomDelay(200, 400);

    await this.page.evaluate((t: string) => {
      const clipboardData = new DataTransfer();
      clipboardData.setData('text/plain', t);
      document.activeElement?.dispatchEvent(
        new ClipboardEvent('paste', { bubbles: true, cancelable: true, clipboardData }),
      );
    }, text);

    await this.randomDelay(400, 700);
  }

  /**
   * 在当前光标处插入图片（内部方法，不做 Ctrl+End 跳转）
   */
  private async _insertImagesAtCursor(imagePaths: string[]): Promise<boolean> {
    const hasImageBtn = await this.exists('button[aria-label="图片"]', 5000);
    if (!hasImageBtn) {
      console.error('[ArticlePage] 未找到工具栏图片按钮');
      return false;
    }
    await this.click('button[aria-label="图片"]');

    const hasModal = await this.exists('.Modal-content', 8000);
    if (!hasModal) {
      console.error('[ArticlePage] 图片上传弹窗未出现');
      return false;
    }
    await this.randomDelay(500, 800);

    const fileInputSelector = '.Modal-content input[type="file"][accept="image/*"]';
    try {
      await this.page.waitForSelector(fileInputSelector, { state: 'attached', timeout: 5000 });
    } catch {
      console.error('[ArticlePage] 未找到文件上传输入框');
      return false;
    }

    const absolutePaths = imagePaths.map((p) => path.resolve(p));
    await this.page.locator(fileInputSelector).setInputFiles(absolutePaths);
    console.log(`[ArticlePage] 已选择 ${absolutePaths.length} 张图片，等待上传...`);
    await this.randomDelay(3000, 5000);

    const insertBtnSelector = '.Modal-content button:has-text("插入图片")';
    const hasInsertBtn = await this.exists(insertBtnSelector, 8000);
    if (hasInsertBtn) {
      await this.click(insertBtnSelector);
      await this.randomDelay(1000, 2000);
    }
    return true;
  }

  /**
   * 按照 ContentSegment 数组顺序，将文字和图片交替写入正文编辑器。
   * 每张图片都会插入在紧接着前段文字之后、独占一行。
   */
  async writeContentWithImages(segments: ContentSegment[]): Promise<void> {
    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];

      if (seg.type === 'text') {
        if (seg.value.trim()) {
          console.log(`[ArticlePage] 写入第 ${i + 1} 段文字...`);
          await this._pasteAtCursor(seg.value);
        }
      } else {
        // 图片：先确保光标在行末，换行后插入
        console.log(`[ArticlePage] 在当前位置插入图片: ${seg.value}`);
        await this.page.click(this.selectors.editorInput);
        await this.page.keyboard.press('End');
        await this.page.keyboard.press('Enter');
        await this.randomDelay(200, 400);

        const ok = await this._insertImagesAtCursor([seg.value]);
        if (!ok) {
          console.warn(`[ArticlePage] 图片插入失败: ${seg.value}，跳过继续`);
        }

        // 插入完成后，图片后面换一行，方便继续输入文字
        await this.page.click(this.selectors.editorInput);
        await this.page.keyboard.press('End');
        await this.page.keyboard.press('Enter');
        await this.randomDelay(200, 400);
      }
    }
  }

  /**
   * 在正文末尾追加插入本地图片（支持一次插入多张）
   * 适用于不需要指定位置、直接追加到末尾的场景
   */
  async insertBodyImages(imagePaths: string[]): Promise<boolean> {
    console.log(`[ArticlePage] 准备在正文末尾插入 ${imagePaths.length} 张图片...`);

    // 先点击标题区域消除浮动工具栏，再跳到正文末尾
    await this.page.click(this.selectors.titleInput);
    await this.randomDelay(300, 500);
    await this.page.click(this.selectors.editorInput);
    await this.randomDelay(300, 500);
    await this.page.keyboard.press('Control+End');
    await this.randomDelay(300, 500);

    const ok = await this._insertImagesAtCursor(imagePaths);
    if (ok) {
      console.log('[ArticlePage] 图片插入完成');
    }
    return ok;
  }

  /**
   * 内部辅助：确保"发布到专栏" radio 已被选中，从而展开话题 / 专栏设置区域。
   * 通过检查 radio input 的 checked 状态来判断，比检查元素可见性更可靠。
   */
  private async _expandPublishPanel(): Promise<void> {
    await this.scrollToBottom();
    await this.randomDelay(300, 500);

    // 直接检查"发布到专栏" radio 的 checked 属性
    const isChecked = await this.page
      .locator('#PublishPanel-columnLabel-1')
      .isChecked()
      .catch(() => false);

    if (!isChecked) {
      await this.page.locator(this.selectors.columnRadioPublish).first().click();
      await this.randomDelay(800, 1200);
      console.log('[ArticlePage] 已展开发布设置面板（选中"发布到专栏"）');
    }
  }

  /**
   * 为文章添加话题标签。
   * 每个话题名称会在搜索框里匹配第一个建议后点击添加；
   * 若搜索无结果则跳过并打印警告。
   *
   * @param topics 话题名数组，例如 ['教育', '职场']
   */
  async addTopics(topics: string[]): Promise<void> {
    if (!topics.length) return;
    console.log(`[ArticlePage] 准备添加话题: ${topics.join(', ')}`);

    // 话题区域仅在"发布到专栏"模式下可见
    await this._expandPublishPanel();

    for (const topic of topics) {
      // 点击「添加话题」按钮使搜索框显现（先滚到可见位置）
      const addBtn = this.page.locator(this.selectors.topicAddButton).first();
      await addBtn.waitFor({ state: 'visible', timeout: 5000 });
      await addBtn.scrollIntoViewIfNeeded();
      await addBtn.click();
      await this.randomDelay(400, 600);

      // 填入话题关键字
      const searchInput = this.page.locator(this.selectors.topicSearchInput).first();
      await searchInput.waitFor({ state: 'visible', timeout: 5000 });
      await searchInput.fill(topic);
      await this.randomDelay(1000, 1500);

      // 等待话题建议弹窗（直接取 searchInput 附近的 Popover-content）
      const popover = this.page.locator('.Popover-content').filter({ has: this.page.locator('button') }).last();
      const hasPopover = await popover.isVisible().catch(() => false);
      if (!hasPopover) {
        console.warn(`[ArticlePage] 话题"${topic}"搜索无建议，已跳过`);
        await this.page.keyboard.press('Escape');
        continue;
      }

      // 找到文本最接近的候选项（首选完全匹配，其次第一项）
      const suggestions = await popover.locator('button').all();
      let matched = false;
      for (const btn of suggestions) {
        const text = (await btn.textContent()) ?? '';
        if (text.includes(topic)) {
          await btn.click();
          await this.randomDelay(400, 600);
          console.log(`[ArticlePage] 已添加话题: "${text.trim()}"`);
          matched = true;
          break;
        }
      }
      if (!matched && suggestions.length > 0) {
        const firstText = (await suggestions[0].textContent()) ?? '';
        await suggestions[0].click();
        await this.randomDelay(400, 600);
        console.log(`[ArticlePage] 未精确匹配"${topic}"，已选择最接近的话题: "${firstText.trim()}"`);
      } else if (!matched) {
        console.warn(`[ArticlePage] 未找到话题"${topic}"的建议项，已跳过`);
        await this.page.keyboard.press('Escape');
      }
    }

    console.log('[ArticlePage] 话题添加完成');
  }

  /**
   * 将文章发布到指定专栏。
   * 先点击"发布到专栏"radio 展开设置面板，然后从下拉列表中选择匹配的专栏。
   * 若传入空字符串或 undefined，则点击"不发布到专栏"保持默认。
   *
   * @param columnName 专栏名称（与知乎后台专栏名称一致）
   */
  async setColumn(columnName: string): Promise<void> {
    if (!columnName) return;
    console.log(`[ArticlePage] 准备发布到专栏: "${columnName}"`);

    await this._expandPublishPanel();

    // 等待专栏 combobox 挂载（元素可能不在视口内，但存在于 DOM 中）
    const comboSelector = this.selectors.columnSelectorCombo;
    try {
      await this.page.waitForSelector(comboSelector, { state: 'attached', timeout: 5000 });
    } catch {
      console.warn('[ArticlePage] 未找到专栏选择下拉，跳过专栏设置');
      return;
    }

    // 滚动到 combobox 可见位置，再点击
    const comboLocator = this.page.locator(comboSelector);
    await comboLocator.scrollIntoViewIfNeeded();
    await this.randomDelay(300, 500);
    await comboLocator.click();
    await this.randomDelay(800, 1200);

    // 等待专栏下拉弹窗（combobox aria-expanded 变为 true）
    try {
      await this.page.waitForSelector(
        `${comboSelector}[aria-expanded="true"]`,
        { timeout: 5000 },
      );
    } catch {
      // 弹窗可能已展开但 aria 未更新，继续尝试
    }
    await this.randomDelay(500, 800);

    const popover = this.page.locator('.Popover-content').filter({ has: this.page.locator('button') }).last();
    const hasPopover = await popover.isVisible().catch(() => false);
    if (!hasPopover) {
      console.warn('[ArticlePage] 专栏下拉列表未出现，跳过专栏设置');
      return;
    }

    // 找到匹配的专栏
    const options = await popover.locator('button').all();
    let matched = false;
    for (const opt of options) {
      const text = (await opt.textContent()) ?? '';
      if (text.includes(columnName)) {
        await opt.click();
        await this.randomDelay(400, 600);
        console.log(`[ArticlePage] 已选择专栏: "${text.trim()}"`);
        matched = true;
        break;
      }
    }
    if (!matched) {
      // 列出可用专栏便于排查
      const names = await Promise.all(options.map((o) => o.textContent()));
      console.warn(`[ArticlePage] 未找到专栏"${columnName}"，可用专栏: ${names.map((n) => n?.trim()).join(', ')}`);
      // 关闭下拉
      await this.page.keyboard.press('Escape');
    }
  }

  /**
   * 点击"添加封面" label 并从本地上传封面图片
   * @param imagePath 本地图片路径（绝对路径或相对于工作目录的路径）
   */
  async setCoverImage(imagePath: string): Promise<boolean> {
    console.log(`[ArticlePage] 设置文章封面: ${imagePath}`);

    const absolutePath = path.resolve(imagePath);

    // 先滚动到页面底部确保封面区域可见
    await this.scrollToBottom();
    await this.randomDelay(500, 800);

    try {
      // 优先直接对 UploadPicture-input 设置文件（最可靠）
      const hasCoverInput = await this.page
        .waitForSelector(this.selectors.coverFileInput, { state: 'attached', timeout: 5000 })
        .then(() => true)
        .catch(() => false);

      if (hasCoverInput) {
        await this.page.locator(this.selectors.coverFileInput).setInputFiles(absolutePath);
        console.log('[ArticlePage] 已选择封面图片，等待上传...');
      } else {
        // 降级方案：通过点击 label 触发 filechooser
        const hasCoverLabel = await this.exists(this.selectors.coverLabel, 5000);
        if (!hasCoverLabel) {
          console.error('[ArticlePage] 未找到封面上传入口');
          return false;
        }
        const [fileChooser] = await Promise.all([
          this.page.waitForEvent('filechooser', { timeout: 10000 }),
          this.click(this.selectors.coverLabel),
        ]);
        await fileChooser.setFiles(absolutePath);
        console.log('[ArticlePage] 已通过 filechooser 选择封面图片，等待上传...');
      }

      await this.randomDelay(2000, 3000);

      // 如果上传后出现裁剪/确认弹窗，点击确认
      const hasConfirm = await this.exists(this.selectors.coverConfirmButton, 5000);
      if (hasConfirm) {
        await this.click(this.selectors.coverConfirmButton);
        await this.randomDelay(1000, 1500);
        console.log('[ArticlePage] 已确认封面裁剪');
      }

      console.log('[ArticlePage] 封面图片设置完成');
      return true;
    } catch (error) {
      console.error('[ArticlePage] 设置封面失败:', error);
      return false;
    }
  }

  /**
   * 发布文章
   */
  async publish(): Promise<boolean> {
    console.log('[ArticlePage] 准备发布文章...');
    await this.randomDelay(1000, 2000);

    // 发布按钮：优先匹配"发布文章"，其次"发布"（右上角按钮）
    const publishBtnSelector = await this.exists('button:has-text("发布文章")', 2000)
      ? 'button:has-text("发布文章")'
      : this.selectors.publishButton;

    const hasPublishBtn = await this.exists(publishBtnSelector, 5000);
    if (!hasPublishBtn) {
      console.error('[ArticlePage] 未找到发布按钮');
      return false;
    }

    await this.click(publishBtnSelector);
    console.log('[ArticlePage] 已点击发布按钮，等待发布完成...');

    // 发布成功后会跳转到文章详情页 /p/xxxxx
    try {
      await this.page.waitForURL(/zhuanlan\.zhihu\.com\/p\/\d+/, { timeout: 20000 });
      const articleUrl = this.page.url();
      console.log(`[ArticlePage] 文章发布成功！地址: ${articleUrl}`);
      return true;
    } catch {
      console.warn('[ArticlePage] 无法通过 URL 确认发布状态，请手动检查浏览器');
      return false;
    }
  }

  /**
   * 完整流程：打开编辑页 → 填标题 → 填正文（含内联图片）→ 追加图片（可选）→ 设置封面（可选）
   *           → 添加话题（可选）→ 选择专栏（可选）→ 发布
   *
   * content 支持内联 [IMAGE:路径] 标记来指定图片插入位置，例如：
   *   "第一段文字\n[IMAGE:./Assets/图1.png]\n第二段文字"
   *
   * topics  - 文章话题标签数组，例如 ['教育', '职场']
   * column  - 要发布到的专栏名称；不填则不发布到专栏
   * bodyImagePaths 为额外追加到正文末尾的图片（兼容旧用法）
   */
  async writeAndPublish(options: {
    title: string;
    content: string;
    bodyImagePaths?: string[];
    coverImagePath?: string;
    topics?: string[];
    column?: string;
  }): Promise<boolean> {
    const { title, content, bodyImagePaths, coverImagePath, topics, column } = options;

    await this.navigate();

    await this.setTitle(title);
    await this.randomDelay(500, 1000);

    // 解析正文，判断是否有内联图片标记
    const segments = ArticlePage.parseContentSegments(content);
    const hasInlineImages = segments.some((s) => s.type === 'image');

    if (hasInlineImages) {
      console.log('[ArticlePage] 检测到内联图片标记，按位置分段插入...');
      await this.writeContentWithImages(segments);
    } else {
      // 纯文字正文，按长度选择输入方式
      if (content.length >= 200) {
        await this.pasteContent(content);
      } else {
        await this.typeContent(content);
      }
    }

    // 追加到末尾的图片（--image 参数，兼容旧用法）
    if (bodyImagePaths && bodyImagePaths.length > 0) {
      const inserted = await this.insertBodyImages(bodyImagePaths);
      if (!inserted) {
        console.warn('[ArticlePage] 追加图片插入失败，继续发布流程...');
      }
    }

    if (coverImagePath) {
      const coverSet = await this.setCoverImage(coverImagePath);
      if (!coverSet) {
        console.warn('[ArticlePage] 封面设置失败，继续发布流程...');
      }
    }

    // 话题和专栏设置（在封面之后，发布之前）
    if ((topics && topics.length > 0) || column) {
      await this.scrollToBottom();
      await this.randomDelay(500, 800);
    }

    if (topics && topics.length > 0) {
      await this.addTopics(topics);
    }

    if (column) {
      await this.setColumn(column);
    }

    return await this.publish();
  }
}
