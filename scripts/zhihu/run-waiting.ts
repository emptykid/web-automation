/**
 * 知乎「等你来答」问题列表脚本
 *
 * 用法：npm run waiting [-- --count 数量] [-- --type 分类]
 *
 * 示例：
 *   npm run waiting
 *   npm run waiting -- --count 5
 *   npm run waiting -- --type invite --count 10
 *
 * 分类（--type）：
 *   recommend  为你推荐（默认）
 *   invite     邀请回答
 *   new        最新问题
 *   hot        人气问题
 */

import { BrowserManager } from '../../src/browser/BrowserManager';
import { LoginPage } from '../../src/pages/zhihu/LoginPage';
import { WaitingPage, WaitingType } from '../../src/pages/zhihu/WaitingPage';

function parseArgs() {
  const args = process.argv.slice(2);
  const params: Record<string, string> = {};

  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--') && i + 1 < args.length && !args[i + 1].startsWith('--')) {
      params[args[i].slice(2)] = args[i + 1];
      i++;
    }
  }

  const validTypes: WaitingType[] = ['recommend', 'invite', 'new', 'hot'];
  const rawType = params['type'] ?? 'recommend';
  const type: WaitingType = validTypes.includes(rawType as WaitingType)
    ? (rawType as WaitingType)
    : 'recommend';

  return {
    count: parseInt(params['count'] ?? '10', 10),
    type,
  };
}

const TYPE_LABEL: Record<WaitingType, string> = {
  recommend: '为你推荐',
  invite: '邀请回答',
  new: '最新问题',
  hot: '人气问题',
};

async function main() {
  const { count, type } = parseArgs();
  console.log(`\n📋 获取「等你来答」列表 — ${TYPE_LABEL[type]}，最多 ${count} 条\n`);

  const manager = new BrowserManager('zhihu');

  try {
    const context = await manager.launchPersistent();
    const page = await context.newPage();

    const loginPage = new LoginPage(context);
    loginPage.setPage(page);
    await loginPage.open('https://www.zhihu.com');

    if (!(await loginPage.isLoggedIn())) {
      console.error('❌ 未登录！请先运行 npm run save-session 完成登录');
      process.exit(1);
    }
    console.log('✅ 已验证登录状态\n');

    const waitingPage = new WaitingPage(context);
    waitingPage.setPage(page);
    await waitingPage.navigate(type);

    const questions = await waitingPage.getQuestions(count);

    if (questions.length === 0) {
      console.log('😕 未获取到问题，请检查登录状态或稍后重试');
    } else {
      console.log(`共获取到 ${questions.length} 个问题：\n`);
      questions.forEach((q) => {
        console.log(`${q.index}. ${q.title}`);
        if (q.stats) console.log(`   📊 ${q.stats}`);
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
