/**
 * 知乎 - 赞同回答
 *
 * 用法：npm run zhihu:upvote -- --url "..." [--dry-run]
 *
 * 示例：
 *   npm run zhihu:upvote -- \
 *     --url "https://www.zhihu.com/question/1979609139266213083/answer/2001327186213360634"
 *
 * 选项：
 *   --url      目标回答的完整 URL（必填）
 *   --dry-run  打开页面但不实际点击赞同
 */

import { BrowserManager } from '../../src/browser/BrowserManager';
import { LoginPage } from '../../src/pages/zhihu/LoginPage';
import { UpvotePage } from '../../src/pages/zhihu/UpvotePage';

function parseArgs() {
  const args = process.argv.slice(2);
  const hasFlags = args.some(a => a.startsWith('--'));
  if (args.length > 0 && !hasFlags) {
    console.error('❌ 参数格式错误：传递参数给脚本时必须加 -- 分隔符');
    console.error('   正确用法: npm run zhihu:upvote -- --url "..."');
    process.exit(1);
  }

  const params: Record<string, string> = {};
  const flags = new Set<string>();

  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      const key = args[i].slice(2);
      if (i + 1 < args.length && !args[i + 1].startsWith('--')) {
        params[key] = args[i + 1];
        i++;
      } else {
        flags.add(key);
      }
    }
  }

  return {
    url: params['url'],
    dryRun: flags.has('dry-run'),
  };
}

async function main() {
  const { url, dryRun } = parseArgs();

  if (!url) {
    console.error('❌ 请提供回答 URL: --url "https://www.zhihu.com/question/.../answer/..."');
    process.exit(1);
  }

  if (dryRun) {
    console.log('⚠️  DRY RUN 模式：打开页面但不实际点击赞同');
  }

  const manager = new BrowserManager('zhihu');

  try {
    const context = await manager.launchPersistent();
    const page = await context.newPage();

    const loginPage = new LoginPage(context);
    loginPage.setPage(page);
    await loginPage.open('https://www.zhihu.com');
    const isLoggedIn = await loginPage.isLoggedIn();

    if (!isLoggedIn) {
      console.error('❌ 未登录！请先运行 npm run zhihu:save-session 完成登录');
      process.exit(1);
    }
    console.log('✅ 已验证登录状态\n');

    const upvotePage = new UpvotePage(context);
    upvotePage.setPage(page);

    console.log(`🔗 目标回答: ${url}\n`);

    if (dryRun) {
      await upvotePage.navigate(url);
      console.log('\n[DRY RUN] 已打开回答页，跳过赞同操作');
      console.log('浏览器保持打开 30s，请手动检查...');
      await new Promise(resolve => setTimeout(resolve, 30000));
      return;
    }

    const result = await upvotePage.upvoteAnswer(url);
    if (result) {
      console.log('\n👍 赞同成功！');
    } else {
      console.log('\nℹ️  该回答已赞同，无需重复操作');
    }

  } catch (error) {
    console.error('运行出错:', error);
    process.exit(1);
  } finally {
    await manager.close();
  }
}

main();
