/**
 * 百度知道提问页 DOM 探查脚本
 *
 * 用法：npm run zhidao:inspect-ask
 *
 * 打开提问页，打印所有可见的输入框、按钮信息，方便确认正确的选择器。
 */

import { BrowserManager } from '../../src/browser/BrowserManager';
import { LoginPage } from '../../src/pages/zhidao/LoginPage';

const ASK_URL = 'https://zhidao.baidu.com/new?word=&entry=common_header';

async function main() {
  const manager = new BrowserManager('zhidao');

  try {
    const context = await manager.launchPersistent();
    const page = await context.newPage();

    const loginPage = new LoginPage(context);
    loginPage.setPage(page);
    await loginPage.navigate();
    const isLoggedIn = await loginPage.isLoggedIn();
    if (!isLoggedIn) {
      console.warn('⚠️  未登录，建议先运行 npm run zhidao:save-session');
    }

    console.log(`\n打开提问页: ${ASK_URL}`);
    await page.goto(ASK_URL, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);

    // 打印所有 input / textarea / contenteditable 元素
    const fields = await page.evaluate(() => {
      const results: { tag: string; type: string; name: string; id: string; placeholder: string; class: string; visible: boolean }[] = [];

      const elements = document.querySelectorAll('input, textarea, [contenteditable]');
      elements.forEach(el => {
        const htmlEl = el as HTMLElement;
        const style = window.getComputedStyle(htmlEl);
        const rect = htmlEl.getBoundingClientRect();
        const visible = style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;

        results.push({
          tag: el.tagName.toLowerCase(),
          type: (el as HTMLInputElement).type ?? '',
          name: (el as HTMLInputElement).name ?? '',
          id: el.id ?? '',
          placeholder: (el as HTMLInputElement).placeholder ?? el.getAttribute('placeholder') ?? '',
          class: el.className ?? '',
          visible,
        });
      });

      return results;
    });

    console.log('\n=== 页面上的输入元素 ===\n');
    fields.forEach((f, i) => {
      console.log(`[${i + 1}] <${f.tag}>`);
      if (f.type)        console.log(`     type:        ${f.type}`);
      if (f.id)          console.log(`     id:          #${f.id}`);
      if (f.name)        console.log(`     name:        ${f.name}`);
      if (f.placeholder) console.log(`     placeholder: ${f.placeholder}`);
      if (f.class)       console.log(`     class:       .${f.class.replace(/\s+/g, '.')}`);
      console.log(`     visible:     ${f.visible}`);
    });

    // 打印所有按钮
    const buttons = await page.evaluate(() => {
      const btns: { tag: string; type: string; text: string; class: string }[] = [];
      document.querySelectorAll('button, input[type="submit"], input[type="button"]').forEach(el => {
        btns.push({
          tag: el.tagName.toLowerCase(),
          type: (el as HTMLInputElement).type ?? '',
          text: el.textContent?.trim() ?? (el as HTMLInputElement).value ?? '',
          class: el.className ?? '',
        });
      });
      return btns;
    });

    console.log('\n=== 页面上的按钮 ===\n');
    buttons.forEach((b, i) => {
      console.log(`[${i + 1}] <${b.tag}> "${b.text}"  class: .${b.class.replace(/\s+/g, '.')}`);
    });

    console.log('\n浏览器保持打开 60s，可手动检查页面...\n');
    await page.waitForTimeout(60000);

  } catch (error) {
    console.error('运行出错:', error);
    process.exit(1);
  } finally {
    await manager.close();
  }
}

main();
