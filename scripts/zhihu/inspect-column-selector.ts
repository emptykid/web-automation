/**
 * 专门检查「专栏收录」combobox 的 DOM 位置和精确选择器
 */
import { BrowserManager } from '../../src/browser/BrowserManager';
import { LoginPage } from '../../src/pages/zhihu/LoginPage';

async function main() {
  const manager = new BrowserManager('zhihu');
  try {
    const context = await manager.launchPersistent();
    const page = await context.newPage();
    const loginPage = new LoginPage(context);
    loginPage.setPage(page);
    await loginPage.open('https://www.zhihu.com');
    if (!(await loginPage.isLoggedIn())) { console.error('❌ 未登录'); process.exit(1); }
    console.log('✅ 已登录');

    await page.goto('https://zhuanlan.zhihu.com/write', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.public-DraftEditor-content', { timeout: 15000 });
    await page.waitForTimeout(2000);

    // 1. 点击「发布到专栏」
    await page.locator('label:has-text("发布到专栏")').first().click();
    await page.waitForTimeout(2000);
    console.log('✅ 已点击「发布到专栏」');

    // 2. 输出整个 ColumnSetting 父容器的完整 HTML
    const colSectionHtml = await page.evaluate(() => {
      // 找到 ColumnSetting-ColumnSelector 的父元素
      const selector = document.querySelector('.ColumnSetting-ColumnSelector');
      if (!selector) return '未找到 .ColumnSetting-ColumnSelector';
      const parent = selector.parentElement;
      return parent ? parent.outerHTML.slice(0, 3000) : selector.outerHTML.slice(0, 3000);
    });
    console.log('\n=== ColumnSetting 父容器 HTML ===');
    console.log(colSectionHtml);

    // 3. 列出所有 button[role="combobox"] 及其 closest 带 class 的祖先
    const comboboxes = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('button[role="combobox"]')).map((el) => {
        const e = el as HTMLElement;
        // 找最近带 class 的父元素
        let ancestor = e.parentElement;
        const ancestors: string[] = [];
        for (let i = 0; i < 5 && ancestor; i++) {
          if (ancestor.className) ancestors.push(`${ancestor.tagName.toLowerCase()}.${(ancestor.className as string).split(' ')[0]}`);
          ancestor = ancestor.parentElement;
        }
        return {
          id: e.id,
          text: e.textContent?.trim().slice(0, 30),
          class: (e.className as string).slice(0, 60),
          ancestors: ancestors.join(' > '),
          outerHTML: e.outerHTML.slice(0, 200),
        };
      });
    });
    console.log('\n=== 所有 button[role="combobox"] ===');
    for (const cb of comboboxes) console.log(JSON.stringify(cb));

    // 4. 尝试找到「专栏收录」标签并定位其对应的 combobox
    const columnComboInfo = await page.evaluate(() => {
      // 找到包含「专栏收录」文本的容器
      const colLabel = Array.from(document.querySelectorAll('label, div')).find(
        (el) => el.textContent?.trim().startsWith('专栏收录') && el.children.length <= 3
      );
      if (!colLabel) return '未找到「专栏收录」标签';
      const container = colLabel.parentElement;
      if (!container) return '未找到父容器';
      // 在父容器里找 combobox
      const combo = container.querySelector('button[role="combobox"]');
      if (combo) return `找到！selector 建议: ${(container as HTMLElement).tagName.toLowerCase()}.${((container as HTMLElement).className as string).split(' ')[0]} button[role="combobox"] | outerHTML: ${combo.outerHTML.slice(0, 200)}`;
      // 往上再找一层
      const grandParent = container.parentElement;
      if (!grandParent) return '未找到祖父容器';
      const combo2 = grandParent.querySelector('button[role="combobox"]');
      if (combo2) return `在祖父容器找到！class: ${(grandParent as HTMLElement).className?.slice(0, 60)} | outerHTML: ${combo2.outerHTML.slice(0, 200)}`;
      return `未在容器内找到 combobox，容器 HTML: ${container.outerHTML.slice(0, 500)}`;
    });
    console.log('\n=== 「专栏收录」对应的 combobox ===');
    console.log(columnComboInfo);

    await new Promise<void>(() => {});
  } catch (e) { console.error('出错:', e); process.exit(1); }
  finally { await manager.close(); }
}
main();
