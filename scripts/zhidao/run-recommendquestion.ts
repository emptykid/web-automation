/**
 * 百度知道 - 获取「为我推荐」问题列表
 *
 * 用法：npm run zhidao:recommendquestion [-- --keyword "关键词"] [-- --count 20]
 *
 * 示例：
 *   npm run zhidao:recommendquestion
 *   npm run zhidao:recommendquestion -- --keyword "健康"
 *   npm run zhidao:recommendquestion -- --count 30
 *   npm run zhidao:recommendquestion -- --keyword "编程" --count 10
 */

import { BrowserManager } from '../../src/browser/BrowserManager';
import { LoginPage } from '../../src/pages/zhidao/LoginPage';
import { RecommendQuestionPage } from '../../src/pages/zhidao/RecommendQuestionPage';

function parseArgs() {
  const args = process.argv.slice(2);

  const hasFlags = args.some(a => a.startsWith('--'));
  if (args.length > 0 && !hasFlags) {
    console.error('❌ 参数格式错误：传递参数给脚本时必须加 -- 分隔符');
    console.error('   正确用法: npm run zhidao:recommendquestion -- --keyword "健康" --count 20');
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
    keyword: params['keyword'] ?? '',
    count: parseInt(params['count'] ?? '20', 10),
  };
}

async function main() {
  const { keyword, count } = parseArgs();

  const headerKeyword = keyword ? `，关键词筛选: "${keyword}"` : '';
  console.log(`\n📋 获取「为我推荐」问题列表${headerKeyword}，最多显示 ${count} 条\n`);

  const manager = new BrowserManager('zhidao');

  try {
    const context = await manager.launchPersistent();
    const page = await context.newPage();

    const loginPage = new LoginPage(context);
    loginPage.setPage(page);
    await loginPage.navigate();
    const isLoggedIn = await loginPage.isLoggedIn();

    if (!isLoggedIn) {
      console.warn('⚠️  未登录，部分内容可能受限。建议先运行 npm run zhidao:save-session');
    } else {
      console.log('✅ 已验证登录状态');
    }

    const recommendPage = new RecommendQuestionPage(context);
    recommendPage.setPage(page);
    await recommendPage.navigate();

    if (keyword) {
      await recommendPage.filterByKeyword(keyword);
    }

    const questions = await recommendPage.getQuestions(count);

    if (questions.length === 0) {
      console.log('😕 未获取到推荐问题');
    } else {
      console.log(`\n共获取到 ${questions.length} 个推荐问题：\n`);
      questions.forEach((q, i) => {
        console.log(`${i + 1}. ${q.title}`);
        console.log(`   🔗 ${q.url}\n`);
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
