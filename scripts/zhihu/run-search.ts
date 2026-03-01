/**
 * 知乎搜索脚本
 *
 * 用法：npm run search -- --keyword "你的关键词" [--count 10]
 *
 * 示例：
 *   npm run search -- --keyword "人工智能"
 *   npm run search -- --keyword "Playwright 自动化" --count 5
 */

import { BrowserManager } from '../../src/browser/BrowserManager';
import { SearchPage } from '../../src/pages/zhihu/SearchPage';
import { LoginPage } from '../../src/pages/zhihu/LoginPage';

// 解析命令行参数
function parseArgs() {
  const args = process.argv.slice(2);
  const params: Record<string, string> = {};

  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--') && i + 1 < args.length) {
      params[args[i].slice(2)] = args[i + 1];
      i++;
    }
  }

  return {
    keyword: params['keyword'] || '知乎自动化',
    count: parseInt(params['count'] || '10', 10),
  };
}

async function main() {
  const { keyword, count } = parseArgs();
  console.log(`\n🔍 搜索关键词: "${keyword}"，最多显示 ${count} 条结果\n`);

  const manager = new BrowserManager('zhihu');

  try {
    const context = await manager.launchPersistent();

    // 检查登录状态
    const loginPage = new LoginPage(context);
    const page = await context.newPage();
    loginPage.setPage(page);

    await loginPage.open('https://www.zhihu.com');
    const isLoggedIn = await loginPage.isLoggedIn();

    if (!isLoggedIn) {
      console.warn('⚠️  未登录，部分内容可能不可见。建议先运行 npm run save-session');
    }

    // 执行搜索
    const searchPage = new SearchPage(context);
    searchPage.setPage(page);

    await searchPage.search(keyword);
    const results = await searchPage.getResults(count);

    if (results.length === 0) {
      console.log('😕 未找到相关结果');
    } else {
      console.log(`\n📋 搜索结果 (共 ${results.length} 条):\n`);
      results.forEach((result, index) => {
        console.log(`${index + 1}. [${result.type}] ${result.title}`);
        console.log(`   🔗 ${result.url}\n`);
      });
    }

  } catch (error) {
    console.error('运行出错:', error);
    process.exit(1);
  } finally {
    await manager.close();
  }
}

main();
