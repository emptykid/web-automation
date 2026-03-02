/**
 * 知乎 - 关注 / 取消关注用户
 *
 * 用法：npm run zhihu:follow -- --user "cai-jonathan" [--unfollow] [--dry-run]
 *
 * 示例：
 *   npm run zhihu:follow -- --user "cai-jonathan"            # 关注
 *   npm run zhihu:follow -- --user "cai-jonathan" --unfollow # 取消关注
 *
 * 选项：
 *   --user     目标用户的知乎 URL ID（必填），即 zhihu.com/people/{user} 中的部分
 *   --unfollow 取消关注（默认为关注）
 *   --dry-run  打开用户主页但不实际点击按钮
 */

import { BrowserManager } from '../../src/browser/BrowserManager';
import { LoginPage } from '../../src/pages/zhihu/LoginPage';
import { FollowPage } from '../../src/pages/zhihu/FollowPage';

function parseArgs() {
  const args = process.argv.slice(2);
  const hasFlags = args.some(a => a.startsWith('--'));
  if (args.length > 0 && !hasFlags) {
    console.error('❌ 参数格式错误：传递参数给脚本时必须加 -- 分隔符');
    console.error('   正确用法: npm run zhihu:follow -- --user "cai-jonathan"');
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
    user: params['user'],
    unfollow: flags.has('unfollow'),
    dryRun: flags.has('dry-run'),
  };
}

async function main() {
  const { user, unfollow, dryRun } = parseArgs();

  if (!user) {
    console.error('❌ 请提供目标用户: --user "cai-jonathan"');
    process.exit(1);
  }

  const action = unfollow ? '取消关注' : '关注';
  if (dryRun) {
    console.log(`⚠️  DRY RUN 模式：打开用户主页但不实际点击${action}按钮`);
  }

  const manager = new BrowserManager('zhihu');

  try {
    const context = await manager.launchPersistent();
    const page = await context.newPage();

    // 检查登录状态
    const loginPage = new LoginPage(context);
    loginPage.setPage(page);
    await loginPage.open('https://www.zhihu.com');
    const isLoggedIn = await loginPage.isLoggedIn();

    if (!isLoggedIn) {
      console.error('❌ 未登录！请先运行 npm run zhihu:save-session 完成登录');
      process.exit(1);
    }
    console.log('✅ 已验证登录状态\n');

    const followPage = new FollowPage(context);
    followPage.setPage(page);

    console.log(`👤 目标用户: https://www.zhihu.com/people/${user}  操作: ${action}`);
    await followPage.navigate(user);

    if (dryRun) {
      console.log(`\n[DRY RUN] 已打开用户主页，跳过${action}操作`);
      console.log('浏览器保持打开 30s，请手动检查...');
      await new Promise(resolve => setTimeout(resolve, 30000));
      return;
    }

    if (unfollow) {
      const result = await followPage.unfollow();
      if (result) {
        console.log(`\n🎉 已成功取消关注 ${user}！`);
      } else {
        console.log(`\nℹ️  未关注 ${user}，无需取消`);
      }
    } else {
      const result = await followPage.follow();
      if (result) {
        console.log(`\n🎉 已成功关注 ${user}！`);
      } else {
        console.log(`\nℹ️  ${user} 已在关注列表中，无需重复关注`);
      }
    }

  } catch (error) {
    console.error('运行出错:', error);
    process.exit(1);
  } finally {
    await manager.close();
  }
}

main();
