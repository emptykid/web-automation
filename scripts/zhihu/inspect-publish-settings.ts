/**
 * 检查话题搜索下拉 & 专栏下拉的 DOM 结构
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

    // ── Step 1: 点击「发布到专栏」让完整发布设置面板出现 ──
    await page.locator('label:has-text("发布到专栏")').first().click();
    await page.waitForTimeout(1500);
    console.log('✅ 已点击「发布到专栏」');

    // ── Step 2: 先点击「添加话题」按钮，再在搜索框输入关键字 ──
    const addTopicBtn = 'button:has-text("添加话题")';
    await page.waitForSelector(addTopicBtn, { state: 'attached', timeout: 5000 });
    await page.locator(addTopicBtn).first().click();
    await page.waitForTimeout(800);

    const topicInput = 'input[aria-label="搜索话题"]';
    await page.waitForSelector(topicInput, { state: 'attached', timeout: 5000 });
    await page.locator(topicInput).fill('教育');
    await page.waitForTimeout(500);
    await page.locator(topicInput).press('a'); // trigger suggestions
    await page.waitForTimeout(1500);
    await page.screenshot({ path: './screenshots/topic-dropdown.png', fullPage: false });

    const topicDropdownHtml = await page.evaluate(() => {
      // 找 popover / listbox / dropdown 相关容器
      const candidates = ['[role="listbox"]', '.Popover-content', '[class*="TopicSuggest"]', '[class*="suggest"]', '[class*="Suggest"]', 'ul[class*="option"]'];
      for (const sel of candidates) {
        const el = document.querySelector(sel);
        if (el && el.textContent?.trim()) return `${sel}: ${el.outerHTML.slice(0, 2000)}`;
      }
      // 找所有出现的 option / li
      const items = Array.from(document.querySelectorAll('[role="option"], li')).slice(0, 10);
      return items.map(el => el.outerHTML.slice(0, 200)).join('\n') || '未找到下拉';
    });
    console.log('\n=== 话题搜索下拉 HTML ===');
    console.log(topicDropdownHtml);

    // ── Step 3: 点击专栏选择 combobox，看下拉结构 ──
    const columnCombo = '.ColumnSetting-ColumnSelector button[role="combobox"]';
    const hasColumnCombo = await page.locator(columnCombo).count() > 0;
    console.log(`\n专栏 combobox 是否存在: ${hasColumnCombo}`);
    if (hasColumnCombo) {
      await page.locator(columnCombo).click();
      await page.waitForTimeout(1500);
      await page.screenshot({ path: './screenshots/column-dropdown.png', fullPage: false });

      const colDropHtml = await page.evaluate(() => {
        const candidates = ['[role="listbox"]', '.Popover-content', '[class*="ColumnList"]'];
        for (const sel of candidates) {
          const el = document.querySelector(sel);
          if (el && el.textContent?.trim()) return `${sel}: ${el.outerHTML.slice(0, 3000)}`;
        }
        return Array.from(document.querySelectorAll('[role="option"]')).slice(0, 10).map(el => el.outerHTML.slice(0, 200)).join('\n') || '未找到专栏下拉';
      });
      console.log('\n=== 专栏下拉 HTML ===');
      console.log(colDropHtml);
    }

    await new Promise<void>(() => {});
  } catch (e) { console.error('出错:', e); process.exit(1); }
  finally { await manager.close(); }
}
main();
