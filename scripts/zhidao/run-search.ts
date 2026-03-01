/**
 * 百度知道 - 搜索问题
 *
 * 用法：npm run zhidao:search -- --keyword "关键词" [--count 10]
 *
 * 示例：
 *   npm run zhidao:search -- --keyword "打字练习"
 *   npm run zhidao:search -- --keyword "如何学习编程" --count 5
 */

import { BrowserManager } from '../../src/browser/BrowserManager';
import { LoginPage } from '../../src/pages/zhidao/LoginPage';
import { SearchPage } from '../../src/pages/zhidao/SearchPage';

function parseArgs() {
  const args = process.argv.slice(2);

  // 检测是否漏写了 -- 分隔符（所有参数都是无 -- 前缀的位置参数）
  const hasFlags = args.some(a => a.startsWith('--'));
  if (args.length > 0 && !hasFlags) {
    console.error('❌ 参数格式错误：传递参数给脚本时必须加 -- 分隔符');
    console.error('   正确用法: npm run zhidao:search -- --keyword "打字练习" --count 10');
    process.exit(1);
  }

  const params: Record<string, string> = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--') && i + 1 < args.length) {
      params[args[i].slice(2)] = args[i + 1];
      i++;
    }
  }

  return {
    keyword: params['keyword'] || '打字练习',
    count: parseInt(params['count'] || '10', 10),
  };
}

async function main() {
  const { keyword, count } = parseArgs();
  console.log(`\n🔍 搜索关键词: "${keyword}"，最多显示 ${count} 条结果\n`);

  const manager = new BrowserManager('zhidao');

  try {
    const context = await manager.launchPersistent();
    const page = await context.newPage();

    // 检查登录状态
    const loginPage = new LoginPage(context);
    loginPage.setPage(page);
    await loginPage.navigate();
    const isLoggedIn = await loginPage.isLoggedIn();

    if (!isLoggedIn) {
      console.warn('⚠️  未登录，部分内容可能受限。建议先运行 npm run zhidao:save-session');
    } else {
      console.log('✅ 已验证登录状态');
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
        console.log(`${index + 1}. ${result.title}`);
        if (result.excerpt) {
          console.log(`   💬 ${result.excerpt.slice(0, 60)}${result.excerpt.length > 60 ? '...' : ''}`);
        }
        if (result.answerCount) {
          console.log(`   📊 ${result.answerCount}`);
        }
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
