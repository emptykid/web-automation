/**
 * 百度知道 - 发起提问
 *
 * 用法：npm run zhidao:ask -- --title "提问标题" [--description "提问说明"] [--anonymous] [--dry-run]
 *
 * 示例：
 *   npm run zhidao:ask -- --title "如何快速提高打字速度？"
 *   npm run zhidao:ask -- \
 *     --title "如何快速提高打字速度？" \
 *     --description "我目前每分钟只能打40个字，想提升到100个字以上，有什么好的练习方法吗？"
 *   npm run zhidao:ask -- --title "如何快速提高打字速度？" --anonymous
 *
 * 选项：
 *   --anonymous  勾选匿名提问
 *   --dry-run    只打开页面并填写内容，不实际提交
 */

import { BrowserManager } from '../../src/browser/BrowserManager';
import { LoginPage } from '../../src/pages/zhidao/LoginPage';
import { AskPage } from '../../src/pages/zhidao/AskPage';

function parseArgs() {
  const args = process.argv.slice(2);
  const hasFlags = args.some(a => a.startsWith('--'));
  if (args.length > 0 && !hasFlags) {
    console.error('❌ 参数格式错误：传递参数给脚本时必须加 -- 分隔符');
    console.error('   正确用法: npm run zhidao:ask -- --title "提问标题"');
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
    description: params['description'],
    anonymous: flags.has('anonymous'),
    dryRun: flags.has('dry-run'),
  };
}

async function main() {
  const { title, description, anonymous, dryRun } = parseArgs();

  if (!title) {
    console.error('❌ 请提供提问标题: --title "你的问题"');
    process.exit(1);
  }

  if (dryRun) {
    console.log('⚠️  DRY RUN 模式：将打开页面并填写内容，但不实际提交');
  }

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
      console.error('❌ 未登录！请先运行 npm run zhidao:save-session 完成登录');
      process.exit(1);
    }
    console.log('✅ 已验证登录状态');

    const askPage = new AskPage(context);
    askPage.setPage(page);

    console.log(`\n❓ 提问标题: ${title}`);
    if (description) console.log(`📝 问题说明: ${description}`);
    if (anonymous)   console.log(`🕵️  匿名提问: 是`);

    if (dryRun) {
      console.log('\n[DRY RUN] 打开提问页并填写内容（不提交）...');
      await askPage.navigate();
      await askPage.setTitle(title);
      if (description) {
        await askPage.setDescription(description);
      }
      if (anonymous) {
        await askPage.setAnonymous(true);
      }
      console.log('\n[DRY RUN] 内容已填入提问页，跳过提交步骤');
      await new Promise((resolve) => setTimeout(resolve, 30000));
    } else {
      console.log('\n🚀 提交提问...');
      const success = await askPage.ask(title, description, anonymous ? true : undefined);
      if (success) {
        console.log('\n🎉 提问提交成功！');
        console.log(`   问题URL: ${page.url()}`);
      } else {
        console.error('\n❌ 提问提交失败，请手动检查浏览器状态');
        await new Promise((resolve) => setTimeout(resolve, 30000));
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
