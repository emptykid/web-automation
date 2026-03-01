/**
 * 知乎专栏文章发布脚本
 *
 * 基本用法：
 *   npm run article -- --title "标题" --content "正文"
 *
 * 在正文指定位置插入图片（推荐）：
 *   在 --content 里用 [IMAGE:路径] 标记图片位置，例如：
 *   npm run article -- \
 *     --title "标题" \
 *     --content "第一段文字
 * [IMAGE:./Assets/图1.png]
 * 第二段文字" \
 *     --cover "./Assets/封面.png"
 *
 * 添加话题并发布到专栏：
 *   npm run article -- \
 *     --title "标题" --content "正文" \
 *     --topic "教育" --topic "职场" \
 *     --column "我的专栏名"
 *
 * 在正文末尾追加图片（兼容旧用法）：
 *   npm run article -- --title "标题" --content "正文" --image "./图1.png" --image "./图2.png"
 *
 * 选项：
 *   --title   "标题"    文章标题（必填）
 *   --content "正文"    文章正文，支持 [IMAGE:路径] 内联标记（必填）
 *   --image   "路径"    追加到正文末尾的图片（可多次使用，不指定位置）
 *   --cover   "路径"    本地封面图片路径（可选）
 *   --topic   "话题"    文章话题标签（可多次使用，例如 --topic "教育" --topic "职场"）
 *   --column  "专栏名"  要发布到的专栏名称（可选，不填则发布到个人主页）
 *   --dry-run           只填入内容不发布，浏览器保持打开供预览
 */

import { BrowserManager } from '../../src/browser/BrowserManager';
import { LoginPage } from '../../src/pages/zhihu/LoginPage';
import { ArticlePage } from '../../src/pages/zhihu/ArticlePage';
import type { ContentSegment } from '../../src/pages/zhihu/ArticlePage';

function parseArgs() {
  const args = process.argv.slice(2);
  const params: Record<string, string> = {};
  // 支持多值的参数 key
  const multiParams: Record<string, string[]> = { image: [], topic: [] };
  const flags: Set<string> = new Set();

  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      const key = args[i].slice(2);
      if (i + 1 < args.length && !args[i + 1].startsWith('--')) {
        const value = args[i + 1];
        i++;
        if (key in multiParams) {
          multiParams[key].push(value);
        } else {
          params[key] = value;
        }
      } else {
        flags.add(key);
      }
    }
  }

  return {
    title: params['title'],
    content: params['content'],
    bodyImagePaths: multiParams['image'],
    coverImagePath: params['cover'],
    topics: multiParams['topic'],
    column: params['column'],
    dryRun: flags.has('dry-run'),
  };
}

async function main() {
  const { title, content, bodyImagePaths, coverImagePath, topics, column, dryRun } = parseArgs();

  if (!title) {
    console.error('❌ 请提供文章标题: --title "你的标题"');
    process.exit(1);
  }

  if (!content) {
    console.error('❌ 请提供文章正文: --content "你的正文"');
    process.exit(1);
  }

  if (dryRun) {
    console.log('⚠️  DRY RUN 模式：将打开页面并填入内容，但不实际发布');
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

    const articlePage = new ArticlePage(context);
    articlePage.setPage(page);

    if (dryRun) {
      console.log('\n[DRY RUN] 打开编辑器并填入内容（不发布）...');

      await articlePage.navigate();
      await articlePage.setTitle(title);

      // 解析内联图片标记，决定走分段插入还是简单粘贴
      const segments: ContentSegment[] = ArticlePage.parseContentSegments(content);
      const hasInlineImages = segments.some((s) => s.type === 'image');

      if (hasInlineImages) {
        console.log(`[DRY RUN] 检测到 [IMAGE:] 标记，按位置分段插入...`);
        await articlePage.writeContentWithImages(segments);
      } else if (content.length >= 200) {
        await articlePage.pasteContent(content);
      } else {
        await articlePage.typeContent(content);
      }

      if (bodyImagePaths && bodyImagePaths.length > 0) {
        console.log(`\n[DRY RUN] 追加正文图片: ${bodyImagePaths.join(', ')}`);
        await articlePage.insertBodyImages(bodyImagePaths);
      }

      if (coverImagePath) {
        console.log(`\n[DRY RUN] 设置封面图片: "${coverImagePath}"`);
        await articlePage.setCoverImage(coverImagePath);
      }

      if (topics && topics.length > 0) {
        console.log(`\n[DRY RUN] 添加话题: ${topics.join(', ')}`);
        await articlePage.addTopics(topics);
      }

      if (column) {
        console.log(`\n[DRY RUN] 发布到专栏: "${column}"`);
        await articlePage.setColumn(column);
      }

      console.log('\n[DRY RUN] 内容已填入编辑器，跳过发布步骤');
      console.log('ℹ️  浏览器保持打开，按 Ctrl+C 结束...');
      await new Promise<void>(() => {});
    } else {
      console.log(`\n📝 开始撰写并发布文章...`);
      console.log(`   标题: ${title}`);
      console.log(`   正文: ${content.slice(0, 50)}${content.length > 50 ? '...' : ''}`);
      if (bodyImagePaths && bodyImagePaths.length > 0) {
        console.log(`   正文图片: ${bodyImagePaths.join(', ')}`);
      }
      if (coverImagePath) {
        console.log(`   封面: ${coverImagePath}`);
      }
      if (topics && topics.length > 0) {
        console.log(`   话题: ${topics.join(', ')}`);
      }
      if (column) {
        console.log(`   专栏: ${column}`);
      }
      console.log();

      const success = await articlePage.writeAndPublish({
        title,
        content,
        bodyImagePaths: bodyImagePaths && bodyImagePaths.length > 0 ? bodyImagePaths : undefined,
        coverImagePath,
        topics: topics && topics.length > 0 ? topics : undefined,
        column,
      });

      if (success) {
        console.log('\n🎉 文章发布成功！');
      } else {
        console.error('\n❌ 文章发布失败，请手动检查浏览器状态');
        console.log('ℹ️  浏览器将保持打开 30 秒供检查...');
        await new Promise((resolve) => setTimeout(resolve, 30000));
      }
    }
  } catch (error) {
    console.error('运行出错:', error);
    process.exit(1);
  } finally {
    if (!dryRun) {
      await manager.close();
    }
  }
}

main();
