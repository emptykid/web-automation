/**
 * 临时脚本：探测 /question/waiting 页面的 DOM 结构
 * 运行一次后可删除
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
    console.log('✅ 已登录\n');

    console.log('导航到 /question/waiting ...');
    await page.goto('https://www.zhihu.com/question/waiting', {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });
    await page.waitForTimeout(3000);

    // 输出页面标题
    console.log('页面标题:', await page.title());
    console.log('当前 URL:', page.url(), '\n');

    // 枚举可能的列表容器
    const structure = await page.evaluate(() => {
      const selectors = [
        '[class*="WaitingQuestion"]',
        '[class*="waiting"]',
        '[class*="QuestionItem"]',
        '[class*="FeedItem"]',
        '[class*="Card"]',
        'main li',
        'main [role="listitem"]',
        'main [role="list"] > div',
      ];

      const result: Record<string, { count: number; sample: string }> = {};
      for (const sel of selectors) {
        const els = document.querySelectorAll(sel);
        if (els.length > 0) {
          const first = els[0] as HTMLElement;
          result[sel] = {
            count: els.length,
            sample: first.innerHTML.slice(0, 400),
          };
        }
      }

      // 也抓一下所有 a 标签中含 /question/ 的
      const questionLinks = Array.from(document.querySelectorAll('a[href*="/question/"]'))
        .slice(0, 5)
        .map((a) => ({
          text: (a as HTMLElement).textContent?.trim().slice(0, 80),
          href: (a as HTMLAnchorElement).href,
          parentClass: (a.parentElement as HTMLElement)?.className,
        }));

      return { selectors: result, questionLinks };
    });

    console.log('=== 选择器匹配结果 ===');
    for (const [sel, info] of Object.entries(structure.selectors)) {
      console.log(`\n[${sel}] → ${info.count} 个元素`);
      console.log('  sample:', info.sample.slice(0, 200));
    }

    console.log('\n=== 问题链接样本 ===');
    structure.questionLinks.forEach((l, i) => {
      console.log(`${i + 1}. ${l.text}`);
      console.log(`   href: ${l.href}`);
      console.log(`   parent class: ${l.parentClass}`);
    });

    await page.waitForTimeout(5000);
  } finally {
    await manager.close();
  }
}

main();
