/**
 * 百度知道 - 回答问题
 *
 * 用法：npm run zhidao:answer -- --url "问题URL" --content "回答内容"
 *       npm run zhidao:answer -- --keyword "搜索关键词" --content "回答内容"
 *
 * 示例：
 *   npm run zhidao:answer -- \
 *     --url "https://zhidao.baidu.com/question/145679429430052885.html" \
 *     --content "这是我的回答内容"
 *
 * 选项：
 *   --dry-run   只打开页面并填写内容，不实际提交
 */

import { BrowserManager } from '../../src/browser/BrowserManager';
import { LoginPage } from '../../src/pages/zhidao/LoginPage';
import { SearchPage } from '../../src/pages/zhidao/SearchPage';
import { QuestionPage } from '../../src/pages/zhidao/QuestionPage';

function parseArgs() {
  const args = process.argv.slice(2);
  const hasFlags = args.some(a => a.startsWith('--'));
  if (args.length > 0 && !hasFlags) {
    console.error('❌ 参数格式错误：传递参数给脚本时必须加 -- 分隔符');
    console.error('   正确用法: npm run zhidao:answer -- --url "问题URL" --content "回答内容"');
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
    questionUrl: params['url'],
    keyword: params['keyword'],
    content: params['content'],
    dryRun: flags.has('dry-run'),
  };
}

async function main() {
  const { questionUrl, keyword, content, dryRun } = parseArgs();

  if (!content) {
    console.error('❌ 请提供回答内容: --content "你的回答"');
    process.exit(1);
  }
  if (!questionUrl && !keyword) {
    console.error('❌ 请提供问题 URL (--url) 或搜索关键词 (--keyword)');
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

    let targetUrl = questionUrl;

    // 通过关键词搜索获取 URL
    if (!targetUrl && keyword) {
      console.log(`\n🔍 搜索问题: "${keyword}"...`);
      const searchPage = new SearchPage(context);
      searchPage.setPage(page);
      targetUrl = (await searchPage.searchAndGetFirstQuestion(keyword)) ?? '';

      if (!targetUrl) {
        console.error(`❌ 未找到关于 "${keyword}" 的问题`);
        process.exit(1);
      }
    }

    console.log(`\n📖 打开问题: ${targetUrl}`);

    const questionPage = new QuestionPage(context);
    questionPage.setPage(page);
    await questionPage.navigate(targetUrl!);

    const title = await questionPage.getTitle();
    console.log(`📌 问题标题: ${title}`);

    if (dryRun) {
      console.log('\n[DRY RUN] 点击「我来回答」并输入内容（不提交）...');
      const clicked = await questionPage.clickAnswerButton();
      if (clicked) {
        await questionPage.typeAnswer(content);
        console.log('\n[DRY RUN] 内容已填入编辑器，跳过提交步骤');
      } else {
        console.error('[DRY RUN] 无法打开回答编辑器');
      }
      await new Promise((resolve) => setTimeout(resolve, 30000));
    } else {
      console.log('\n✍️  开始撰写并提交回答...');
      const success = await questionPage.writeAndSubmitAnswer(content);
      if (success) {
        console.log('\n🎉 回答提交成功！');
      } else {
        console.error('\n❌ 回答提交失败，请手动检查浏览器状态');
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
