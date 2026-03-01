/**
 * 检查文章编辑页的 DOM 结构，用于找到正确的选择器
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
    const isLoggedIn = await loginPage.isLoggedIn();
    if (!isLoggedIn) {
      console.error('❌ 未登录');
      process.exit(1);
    }
    console.log('✅ 已登录');

    console.log('打开文章编辑页...');
    await page.goto('https://zhuanlan.zhihu.com/write', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    // 搜索所有含"封面"文字的元素
    const coverElements = await page.evaluate(() => {
      const all = Array.from(document.querySelectorAll('*'));
      return all
        .filter((el) => el.children.length === 0 && (el.textContent ?? '').includes('封面'))
        .map((el) => ({
          tag: el.tagName.toLowerCase(),
          text: (el.textContent ?? '').trim().slice(0, 60),
          class: (el as HTMLElement).className?.slice(0, 80) ?? '',
          role: el.getAttribute('role') ?? '',
          parentTag: el.parentElement?.tagName.toLowerCase() ?? '',
          parentClass: (el.parentElement as HTMLElement)?.className?.slice(0, 80) ?? '',
        }));
    });
    console.log('\n=== 含"封面"的元素 ===');
    for (const el of coverElements) console.log(JSON.stringify(el));

    // 截图
    await page.screenshot({ path: './screenshots/cover-area.png', fullPage: true });
    console.log('截图已保存 ./screenshots/cover-area.png');

    // 点击编辑器激活
    await page.click('.public-DraftEditor-content');
    await page.waitForTimeout(500);

    // 点击图片按钮，等待模态框
    console.log('\n点击工具栏图片按钮...');
    await page.click('button[aria-label="图片"]');
    await page.waitForTimeout(1500);

    // 输出 Modal 完整 HTML
    const modalHtml = await page.evaluate(() => {
      const modal = document.querySelector('.Modal-content');
      return modal ? modal.innerHTML.slice(0, 2000) : '未找到 Modal';
    });
    console.log('\n=== Modal HTML ===');
    console.log(modalHtml);

    // 找 Modal 内所有 file input
    const fileInputsInModal = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('.Modal-content input[type="file"], .Modal input[type="file"]'))
        .map((el) => ({
          class: (el as HTMLElement).className,
          accept: el.getAttribute('accept') ?? '',
          id: el.id,
          outerHTML: el.outerHTML.slice(0, 200),
        }));
    });
    console.log('\n=== Modal 内 File Inputs ===');
    for (const fi of fileInputsInModal) console.log(JSON.stringify(fi));

    await new Promise<void>(() => {});

    // 点击"上传图片" tab
    console.log('\n点击「上传图片」tab...');
    const uploadTabExists = await page.locator('.Modal-content button:has-text("上传图片")').count() > 0;
    if (uploadTabExists) {
      // 监听 filechooser
      const fcPromise = page.waitForEvent('filechooser', { timeout: 4000 }).catch(() => null);
      await page.click('.Modal-content button:has-text("上传图片")');
      const fc = await fcPromise;
      if (fc) {
        console.log('✅ 点击「上传图片」后触发了 filechooser！');
      } else {
        console.log('❌ 未触发 filechooser，查看 Modal 内容变化...');
        const afterHtml = await page.evaluate(() => {
          const modal = document.querySelector('.Modal-content');
          return modal ? modal.innerHTML.slice(0, 2000) : '';
        });
        console.log('\n=== 点击上传图片后 Modal HTML ===');
        console.log(afterHtml);

        // 找 Modal 内 file input
        const inputs = await page.evaluate(() => {
          return Array.from(document.querySelectorAll('input[type="file"]'))
            .map((el) => ({
              class: (el as HTMLElement).className,
              accept: el.getAttribute('accept') ?? '',
              outerHTML: el.outerHTML.slice(0, 200),
            }));
        });
        console.log('\n=== 点击后所有 File Inputs ===');
        for (const fi of inputs) console.log(JSON.stringify(fi));
      }
    }

    // 等待用户查看
    await new Promise<void>(() => {});
  } catch (error) {
    console.error('出错:', error);
    process.exit(1);
  } finally {
    await manager.close();
  }
}

main();
