/**
 * 知乎回答发布脚本
 *
 * 用法：npm run answer -- --url "问题URL" --content "回答内容"
 *       npm run answer -- --keyword "搜索关键词" --content "回答内容"
 *
 * 示例：
 *   npm run answer -- --url "https://www.zhihu.com/question/123456" --content "这是我的回答"
 *   npm run answer -- --keyword "如何学习编程" --content "从基础开始..."
 *
 * 选项：
 *   --dry-run        只打开页面，不实际发布（用于预览）
 *   --image "文件名"  在回答中插入个人素材中的图片（支持模糊匹配）
 */

import { BrowserManager } from '../../src/browser/BrowserManager';
import { LoginPage } from '../../src/pages/zhihu/LoginPage';
import { SearchPage } from '../../src/pages/zhihu/SearchPage';
import { QuestionPage } from '../../src/pages/zhihu/QuestionPage';

function parseArgs() {
  const args = process.argv.slice(2);
  const params: Record<string, string> = {};
  const flags: Set<string> = new Set();

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
    imageName: params['image'],
    dryRun: flags.has('dry-run'),
  };
}

async function main() {
  const { questionUrl, keyword, content, imageName, dryRun } = parseArgs();

  if (!content) {
    console.error('❌ 请提供回答内容: --content "你的回答"');
    process.exit(1);
  }

  if (!questionUrl && !keyword) {
    console.error('❌ 请提供问题 URL (--url) 或搜索关键词 (--keyword)');
    process.exit(1);
  }

  if (dryRun) {
    console.log('⚠️  DRY RUN 模式：将打开页面但不实际发布');
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
      console.error('❌ 未登录！请先运行 npm run save-session 完成登录');
      process.exit(1);
    }

    console.log('✅ 已验证登录状态');

    let targetUrl: string | undefined = questionUrl;

    // 如果没有 URL，通过关键词搜索
    if (!targetUrl && keyword) {
      console.log(`\n🔍 搜索问题: "${keyword}"...`);
      const searchPage = new SearchPage(context);
      searchPage.setPage(page);
      targetUrl = (await searchPage.searchAndGetFirstQuestion(keyword)) ?? undefined;

      if (!targetUrl) {
        console.error(`❌ 未找到关于 "${keyword}" 的问题`);
        process.exit(1);
      }
    }

    console.log(`\n📖 打开问题: ${targetUrl}`);

    // 打开问题页面
    const questionPage = new QuestionPage(context);
    questionPage.setPage(page);
    await questionPage.navigate(targetUrl!);

    const title = await questionPage.getTitle();
    console.log(`📌 问题标题: ${title}`);

    if (dryRun) {
      console.log('\n[DRY RUN] 打开编辑器并输入内容（不发布）...');

      // 对于长文本使用粘贴方式，短文本使用打字方式
      const usePaste = content.length > 200;

      // 打开编辑器并输入内容，但不发布
      const opened = await questionPage.clickWriteAnswer();
      if (opened) {
        if (usePaste) {
          await questionPage.pasteAnswer(content);
        } else {
          await questionPage.typeAnswer(content);
        }
        if (imageName) {
          console.log(`\n[DRY RUN] 插入图片: "${imageName}"`);
          await questionPage.insertImageFromMaterials(imageName);
        }
        console.log('\n[DRY RUN] 内容已输入到编辑器，跳过发布步骤');
      } else {
        console.error('[DRY RUN] 无法打开编辑器');
      }

      // 保持浏览器打开供查看
      await new Promise((resolve) => setTimeout(resolve, 30000));
    } else {
      console.log(`\n✍️  开始撰写并发布回答...\n`);

      // 对于长文本使用粘贴方式，短文本使用打字方式
      const usePaste = content.length > 200;
      if (imageName) console.log(`🖼️  将插入图片: "${imageName}"`);
      const success = await questionPage.writeAndSubmitAnswer(content, usePaste, imageName);

      if (success) {
        console.log('\n🎉 回答发布成功！');
      } else {
        console.error('\n❌ 回答发布失败，请手动检查浏览器状态');
        // 保持浏览器打开供检查
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
