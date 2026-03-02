/**
 * 知乎 - 在知乎提问
 *
 * 用法：npm run zhihu:ask -- --title "问题标题" [--content "问题说明"] [--dry-run]
 *
 * 示例：
 *   npm run zhihu:ask -- --title "如何看待 AI 对软件工程师职业的影响？"
 *   npm run zhihu:ask -- \
 *     --title "如何看待 AI 对软件工程师职业的影响？" \
 *     --content "随着 LLM 和代码生成工具的普及，软件工程师的核心竞争力会发生哪些转变？"
 *
 * 选项：
 *   --title    问题标题（必填）
 *   --content  问题说明/补充内容（选填）
 *   --dry-run  只打开页面并填写内容，不实际点击发布按钮
 */

import { BrowserManager } from '../../src/browser/BrowserManager';
import { LoginPage } from '../../src/pages/zhihu/LoginPage';
import { AskPage } from '../../src/pages/zhihu/AskPage';

function parseArgs() {
  const args = process.argv.slice(2);
  const hasFlags = args.some(a => a.startsWith('--'));
  if (args.length > 0 && !hasFlags) {
    console.error('❌ 参数格式错误：传递参数给脚本时必须加 -- 分隔符');
    console.error('   正确用法: npm run zhihu:ask -- --title "问题标题"');
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
    title: params['title'],
    content: params['content'],
    dryRun: flags.has('dry-run'),
  };
}

async function main() {
  const { title, content, dryRun } = parseArgs();

  if (!title) {
    console.error('❌ 请提供问题标题: --title "你的问题"');
    process.exit(1);
  }

  if (dryRun) {
    console.log('⚠️  DRY RUN 模式：将打开页面并填写内容，但不实际点击发布');
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

    const askPage = new AskPage(context);
    askPage.setPage(page);

    console.log(`❓ 问题标题: ${title}`);
    if (content) console.log(`📝 问题说明: ${content}`);

    if (dryRun) {
      console.log('\n[DRY RUN] 打开创作菜单并填写问题（不发布）...');
      await askPage.navigate();
      await askPage.openCreatorMenu();
      await askPage.clickAskMenuItem();
      await page.waitForTimeout(2000);
      // setTitle 内部会等待 3s，确保说明输入框出现
      await askPage.setTitle(title);
      if (content) {
        await askPage.setContent(content);
      }
      console.log('\n[DRY RUN] 内容已填入提问对话框，跳过发布步骤');
      console.log('浏览器保持打开 30s，请手动检查...');
      await new Promise(resolve => setTimeout(resolve, 30000));
    } else {
      console.log('\n🚀 开始提问流程...');
      const success = await askPage.ask(title, content);
      if (success) {
        console.log('\n🎉 问题发布成功！');
        console.log(`   问题URL: ${page.url()}`);
      } else {
        console.error('\n❌ 问题发布失败，请手动检查浏览器状态');
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
