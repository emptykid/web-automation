/**
 * 知乎评论区 DOM 探查脚本
 *
 * 用法：npm run zhihu:inspect-comment
 *
 * 探查流程：
 * 1. 打开指定回答页，找到该回答对应的「评论」入口按钮
 * 2. 点击展开评论列表
 * 3. 探查评论输入框和发布按钮的选择器
 */

import { BrowserManager } from '../../src/browser/BrowserManager';
import { LoginPage } from '../../src/pages/zhihu/LoginPage';

const TARGET_URL = 'https://www.zhihu.com/question/1929952636016268030/answer/2004676372434547404';

async function main() {
  const manager = new BrowserManager('zhihu');

  try {
    const context = await manager.launchPersistent();
    const page = await context.newPage();

    const loginPage = new LoginPage(context);
    loginPage.setPage(page);
    await loginPage.open('https://www.zhihu.com');
    const isLoggedIn = await loginPage.isLoggedIn();
    if (!isLoggedIn) {
      console.warn('⚠️  未登录，建议先运行 npm run zhihu:save-session');
    } else {
      console.log('✅ 已登录\n');
    }

    console.log(`打开回答页: ${TARGET_URL}`);
    await page.goto(TARGET_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(3000);

    // ── Step 1：探查该回答的评论入口按钮 ────────────────────────────────
    console.log('\n=== Step 1：探查评论入口按钮 ===\n');

    const commentBtnInfo = await page.evaluate(() => {
      const candidates = [
        '[class*="ContentItem-action"] button[aria-label*="评论"]',
        'button[aria-label*="评论"]',
        'button:has-text("评论")',
        '[class*="CommentButton"]',
        '[class*="comment"]',
        'button[class*="ContentItem"]',
      ];

      // 找含"评论"文字的按钮
      const allBtns = Array.from(document.querySelectorAll('button')).filter(b => {
        const text = b.textContent?.trim() ?? '';
        return text.includes('评论') || b.getAttribute('aria-label')?.includes('评论');
      });

      return allBtns.map(b => ({
        text: b.textContent?.trim().slice(0, 60) ?? '',
        ariaLabel: b.getAttribute('aria-label') ?? '',
        class: b.className ?? '',
        id: b.id ?? '',
        parentClass: (b.parentElement as HTMLElement)?.className ?? '',
        grandParentClass: (b.parentElement?.parentElement as HTMLElement)?.className ?? '',
        dataZa: b.getAttribute('data-za-detail-view-element_name') ?? '',
      }));
    });

    console.log(`含"评论"的按钮（共 ${commentBtnInfo.length} 个）：`);
    commentBtnInfo.forEach((b, i) => {
      console.log(`\n  [${i + 1}] "${b.text}"`);
      if (b.ariaLabel)      console.log(`       aria-label:   "${b.ariaLabel}"`);
      if (b.id)             console.log(`       id:            #${b.id}`);
      console.log(`       class:         .${b.class.replace(/\s+/g, '.')}`);
      console.log(`       parentClass:   .${b.parentClass.replace(/\s+/g, '.')}`);
    });

    // ── Step 2：点击评论按钮，展开评论列表 ──────────────────────────────
    console.log('\n=== Step 2：点击评论按钮，展开评论列表 ===\n');

    // 找该回答下的评论按钮（通常是 "X 条评论" 或 "添加评论"）
    // 尝试通过 URL 中的 answer ID 定位对应回答块
    const answerIdMatch = TARGET_URL.match(/\/answer\/(\d+)/);
    const answerId = answerIdMatch?.[1] ?? '';
    console.log(`回答 ID: ${answerId}`);

    const commentBtnSelectors = [
      `[data-answer-id="${answerId}"] button[aria-label*="评论"]`,
      `[id*="${answerId}"] button[aria-label*="评论"]`,
      `button[aria-label*="评论"]`,
      `button:has-text("条评论")`,
      `button:has-text("添加评论")`,
    ];

    let clickedSel = '';
    for (const sel of commentBtnSelectors) {
      try {
        await page.waitForSelector(sel, { timeout: 3000 });
        const btns = page.locator(sel);
        const count = await btns.count();
        console.log(`  [${sel}] → ${count} 个匹配`);
        if (count > 0) {
          await btns.first().click();
          console.log(`  ✅ 已点击: ${sel}`);
          clickedSel = sel;
          break;
        }
      } catch {
        console.log(`  ❌ 未找到: ${sel}`);
      }
    }

    if (!clickedSel) {
      console.warn('⚠️  未能自动点击评论按钮，请手动点击后继续观察输出');
    }

    await page.waitForTimeout(2000);

    // ── Step 3：探查展开后的评论区结构 ──────────────────────────────────
    console.log('\n=== Step 3：探查评论区输入框和发布按钮 ===\n');

    const commentAreaInfo = await page.evaluate(() => {
      // 评论容器
      const containerCandidates = [
        '[class*="CommentList"]',
        '[class*="Comments"]',
        '[class*="comment-list"]',
        '[class*="CommentV2"]',
      ];
      const containers: { sel: string; count: number; html: string }[] = [];
      for (const sel of containerCandidates) {
        const els = document.querySelectorAll(sel);
        if (els.length > 0) {
          containers.push({
            sel,
            count: els.length,
            html: (els[0] as HTMLElement).innerHTML.slice(0, 500),
          });
        }
      }

      // 所有可见输入元素
      const inputs = Array.from(document.querySelectorAll(
        'input, textarea, [contenteditable="true"], [contenteditable="plaintext-only"]'
      )).map((el, idx) => {
        const htmlEl = el as HTMLElement;
        const rect = htmlEl.getBoundingClientRect();
        const style = window.getComputedStyle(htmlEl);
        const visible = style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
        const parents: string[] = [];
        let cur: Element | null = el.parentElement;
        for (let i = 0; i < 5 && cur; i++, cur = cur.parentElement) {
          parents.unshift(cur.tagName.toLowerCase() + (cur.className ? `.${cur.className.trim().split(/\s+/)[0]}` : ''));
        }
        return {
          idx,
          tag: el.tagName.toLowerCase(),
          type: (el as HTMLInputElement).type ?? '',
          id: el.id ?? '',
          placeholder: (el as HTMLInputElement).placeholder ?? el.getAttribute('placeholder') ?? '',
          class: el.className ?? '',
          contenteditable: el.getAttribute('contenteditable') ?? '',
          visible,
          top: Math.round(rect.top),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
          parentPath: parents.join(' > '),
        };
      });

      // 含"发布"/"评论"的按钮
      const buttons = Array.from(document.querySelectorAll('button')).filter(b => {
        const t = b.textContent?.trim() ?? '';
        return t === '发布' || t === '评论' || t === '发表' || t.includes('发布评论');
      }).map(b => ({
        text: b.textContent?.trim() ?? '',
        class: b.className ?? '',
        type: (b as HTMLButtonElement).type ?? '',
        disabled: (b as HTMLButtonElement).disabled,
        parentClass: (b.parentElement as HTMLElement)?.className ?? '',
      }));

      return { containers, inputs, buttons };
    });

    console.log('[评论区容器]');
    commentAreaInfo.containers.forEach(c => {
      console.log(`  [${c.sel}] → ${c.count} 个`);
      console.log(`    html前300: ${c.html.slice(0, 300)}`);
    });

    console.log('\n[所有可见输入元素]');
    commentAreaInfo.inputs
      .filter(f => f.visible)
      .forEach(f => {
        console.log(`  [idx=${f.idx}] <${f.tag}> @ top:${f.top} ${f.width}×${f.height}`);
        if (f.type)            console.log(`    type:            ${f.type}`);
        if (f.id)              console.log(`    id:              #${f.id}`);
        if (f.placeholder)     console.log(`    placeholder:     "${f.placeholder}"`);
        if (f.contenteditable) console.log(`    contenteditable: ${f.contenteditable}`);
        if (f.class)           console.log(`    class:           .${f.class.replace(/\s+/g, '.')}`);
        console.log(`    parentPath:      ${f.parentPath}`);
      });

    console.log('\n[发布/评论按钮]');
    commentAreaInfo.buttons.forEach((b, i) => {
      console.log(`  [${i + 1}] "${b.text}"  disabled:${b.disabled}  type:${b.type}`);
      console.log(`       class:       .${b.class.replace(/\s+/g, '.')}`);
      console.log(`       parentClass: .${b.parentClass.replace(/\s+/g, '.')}`);
    });

    console.log('\n浏览器保持打开 60s，可手动检查页面...\n');
    await page.waitForTimeout(60000);

  } catch (error) {
    console.error('运行出错:', error);
    process.exit(1);
  } finally {
    await manager.close();
  }
}

main();
