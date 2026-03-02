/**
 * 知乎 - 评论回答
 *
 * 用法：npm run zhihu:comment -- --url "..." --content "评论内容" [--dry-run]
 *
 * 示例：
 *   npm run zhihu:comment -- \
 *     --url "https://www.zhihu.com/question/1929952636016268030/answer/2004676372434547404" \
 *     --content "非常有见地的回答！"
 *
 * 选项：
 *   --url      目标回答的完整 URL（必填）
 *   --content  评论内容（必填）
 *   --dry-run  打开页面并填写评论，但不点击发布
 */

import { BrowserManager } from '../../src/browser/BrowserManager';
import { LoginPage } from '../../src/pages/zhihu/LoginPage';
import { CommentPage } from '../../src/pages/zhihu/CommentPage';

function parseArgs() {
  const args = process.argv.slice(2);
  const hasFlags = args.some(a => a.startsWith('--'));
  if (args.length > 0 && !hasFlags) {
    console.error('❌ 参数格式错误：传递参数给脚本时必须加 -- 分隔符');
    console.error('   正确用法: npm run zhihu:comment -- --url "..." --content "..."');
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
    content: params['content'],
    dryRun: flags.has('dry-run'),
  };
}

async function main() {
  const { url, content, dryRun } = parseArgs();

  if (!url) {
    console.error('❌ 请提供回答 URL: --url "https://www.zhihu.com/question/.../answer/..."');
    process.exit(1);
  }
  if (!content) {
    console.error('❌ 请提供评论内容: --content "你的评论"');
    process.exit(1);
  }

  if (dryRun) {
    console.log('⚠️  DRY RUN 模式：打开页面并填写评论，但不实际发布');
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

    const commentPage = new CommentPage(context);
    commentPage.setPage(page);

    console.log(`🔗 目标回答: ${url}`);
    console.log(`💬 评论内容: ${content}\n`);

    if (dryRun) {
      await commentPage.navigate(url);
      await commentPage.openCommentSection();
      await commentPage.typeComment(content);
      console.log('\n[DRY RUN] 评论已填入，跳过发布步骤');
      console.log('浏览器保持打开 30s，请手动检查...');
      await new Promise(resolve => setTimeout(resolve, 30000));
    } else {
      const success = await commentPage.comment(url, content);
      if (success) {
        console.log('\n🎉 评论发布成功！');
      } else {
        console.error('\n❌ 评论发布失败，请手动检查浏览器状态');
        await new Promise(resolve => setTimeout(resolve, 30000));
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
