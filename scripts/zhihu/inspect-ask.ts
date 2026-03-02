/**
 * 知乎提问页 DOM 探查脚本
 *
 * 用法：npm run zhihu:inspect-ask
 *
 * 操作流程：
 * 1. 打开知乎首页，点击顶部 button#Popover2-toggle（创作按钮）
 * 2. 在下拉菜单中点击「提问题」
 * 3. 探测弹出的提问对话框 DOM 结构：输入框、按钮等
 * 4. 保持浏览器打开 60s 供手动检查
 */

import { BrowserManager } from '../../src/browser/BrowserManager';
import { LoginPage } from '../../src/pages/zhihu/LoginPage';

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

    await page.waitForTimeout(2000);

    // ── Step 1：探测顶部创作按钮 ──────────────────────────────────────────
    console.log('=== Step 1：探测创作按钮 ===\n');

    const creatorBtnInfo = await page.evaluate(() => {
      const candidates = [
        'button#Popover2-toggle',
        'button[id^="Popover"][id$="-toggle"]',
        '.AppHeader-createButton',
        'button.AppHeader-CreateButton',
        '[data-za-detail-view-element_name="CreateButton"]',
      ];

      const result: { selector: string; found: boolean; text: string; id: string; class: string }[] = [];
      for (const sel of candidates) {
        const el = document.querySelector(sel) as HTMLElement | null;
        result.push({
          selector: sel,
          found: !!el,
          text: el?.textContent?.trim().slice(0, 60) ?? '',
          id: el?.id ?? '',
          class: el?.className ?? '',
        });
      }
      return result;
    });

    console.log('创作按钮候选：');
    creatorBtnInfo.forEach(info => {
      console.log(`  ${info.found ? '✅' : '❌'} ${info.selector}`);
      if (info.found) {
        console.log(`     text: "${info.text}"`);
        console.log(`     id: "${info.id}"`);
        console.log(`     class: "${info.class}"`);
      }
    });

    // ── Step 2：点击创作按钮，探测下拉菜单 ──────────────────────────────
    console.log('\n=== Step 2：点击创作按钮，探测下拉菜单 ===\n');

    let clicked = false;
    const btnSelectors = [
      'button#Popover2-toggle',
      'button[id^="Popover"][id$="-toggle"]',
      '.AppHeader-createButton button',
    ];

    for (const sel of btnSelectors) {
      try {
        await page.waitForSelector(sel, { timeout: 5000 });
        await page.click(sel);
        console.log(`✅ 已点击: ${sel}`);
        clicked = true;
        break;
      } catch {
        console.log(`❌ 未找到或点击失败: ${sel}`);
      }
    }

    if (!clicked) {
      console.warn('⚠️  所有候选按钮均未找到，请手动检查页面\n');
    }

    await page.waitForTimeout(1500);

    // 探测下拉菜单内容
    const dropdownInfo = await page.evaluate(() => {
      const popoverSelectors = [
        '[class*="Popover"]',
        '[class*="dropdown"]',
        '[class*="Menu"]',
        '[role="menu"]',
        '[role="listbox"]',
        '.AppHeader-menu',
      ];

      const result: { selector: string; count: number; items: string[] }[] = [];
      for (const sel of popoverSelectors) {
        const els = document.querySelectorAll(sel);
        if (els.length > 0) {
          const items: string[] = [];
          els.forEach(el => {
            const text = (el as HTMLElement).textContent?.trim().slice(0, 80);
            if (text) items.push(text);
          });
          result.push({ selector: sel, count: els.length, items: items.slice(0, 5) });
        }
      }

      // 查找含"提问"的可点击元素
      const allClickable = Array.from(document.querySelectorAll('a, button, [role="menuitem"], li'))
        .filter(el => (el as HTMLElement).textContent?.includes('提问'))
        .map(el => ({
          tag: el.tagName.toLowerCase(),
          text: (el as HTMLElement).textContent?.trim().slice(0, 60) ?? '',
          class: el.className ?? '',
          href: (el as HTMLAnchorElement).href ?? '',
          role: el.getAttribute('role') ?? '',
        }));

      return { popoverSelectors: result, askButtons: allClickable };
    });

    console.log('下拉菜单候选容器：');
    dropdownInfo.popoverSelectors.forEach(info => {
      console.log(`  [${info.selector}] → ${info.count} 个元素`);
      info.items.forEach(item => console.log(`    - "${item.slice(0, 60)}"`));
    });

    console.log('\n含"提问"的可点击元素：');
    dropdownInfo.askButtons.forEach((btn, i) => {
      console.log(`  [${i + 1}] <${btn.tag}> "${btn.text}"`);
      console.log(`       class: "${btn.class}"`);
      if (btn.href) console.log(`       href: "${btn.href}"`);
      if (btn.role) console.log(`       role: "${btn.role}"`);
    });

    // ── Step 3：点击「提问题」，探测弹出对话框 ───────────────────────────
    console.log('\n=== Step 3：点击「提问题」，探测弹出对话框 ===\n');

    const askItemSelectors = [
      'button:has-text("提问题")',
      'a:has-text("提问题")',
      '[role="menuitem"]:has-text("提问题")',
      'li:has-text("提问题")',
    ];

    let askClicked = false;
    for (const sel of askItemSelectors) {
      try {
        await page.waitForSelector(sel, { timeout: 3000 });
        await page.click(sel);
        console.log(`✅ 已点击「提问题」: ${sel}`);
        askClicked = true;
        break;
      } catch {
        // continue
      }
    }

    if (!askClicked) {
      console.warn('⚠️  未找到「提问题」菜单项，请手动点击后查看控制台输出\n');
    }

    await page.waitForTimeout(2000);

    // 探测弹出对话框的输入元素（对话框刚出现时）
    const snapshotInputs = async (label: string) => {
      const info = await page.evaluate(() => {
        const dialogSelectors = [
          '[role="dialog"]',
          '[class*="Modal"]',
          '[class*="modal"]',
          '[class*="Dialog"]',
          '[class*="AskModal"]',
          '[class*="QuestionModal"]',
          '.Modal-enter-done',
        ];

        const dialogs: { selector: string; found: boolean; html: string }[] = [];
        for (const sel of dialogSelectors) {
          const el = document.querySelector(sel) as HTMLElement | null;
          dialogs.push({
            selector: sel,
            found: !!el,
            html: el?.innerHTML.slice(0, 800) ?? '',
          });
        }

        const inputs = Array.from(document.querySelectorAll('input, textarea, [contenteditable="true"]')).map((el, idx) => {
          const htmlEl = el as HTMLElement;
          const rect = htmlEl.getBoundingClientRect();
          const style = window.getComputedStyle(htmlEl);
          const visible = style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
          // 构建一个简单的 CSS 路径
          const parents: string[] = [];
          let cur: Element | null = el.parentElement;
          for (let i = 0; i < 4 && cur; i++, cur = cur.parentElement) {
            const p = cur.tagName.toLowerCase() + (cur.id ? `#${cur.id}` : cur.className ? `.${cur.className.trim().split(/\s+/)[0]}` : '');
            parents.unshift(p);
          }
          return {
            idx,
            tag: el.tagName.toLowerCase(),
            type: (el as HTMLInputElement).type ?? '',
            id: el.id ?? '',
            name: (el as HTMLInputElement).name ?? '',
            placeholder: (el as HTMLInputElement).placeholder ?? el.getAttribute('placeholder') ?? '',
            class: el.className ?? '',
            contenteditable: el.getAttribute('contenteditable') ?? '',
            visible,
            top: Math.round(rect.top),
            left: Math.round(rect.left),
            width: Math.round(rect.width),
            height: Math.round(rect.height),
            parentPath: parents.join(' > '),
          };
        });

        const buttons = Array.from(document.querySelectorAll('button, input[type="submit"]')).map(el => ({
          tag: el.tagName.toLowerCase(),
          text: (el as HTMLElement).textContent?.trim().slice(0, 60) ?? '',
          class: el.className ?? '',
          type: (el as HTMLButtonElement).type ?? '',
          disabled: (el as HTMLButtonElement).disabled,
        }));

        return { dialogs, inputs, buttons };
      });

      console.log(`\n${'─'.repeat(60)}`);
      console.log(`📸 快照：${label}`);
      console.log(`${'─'.repeat(60)}`);

      console.log('\n[对话框容器]');
      info.dialogs.forEach(d => {
        if (d.found) {
          console.log(`  ✅ ${d.selector}`);
          console.log(`     innerHTML 前 600 字符：\n${d.html.slice(0, 600)}\n`);
        }
      });

      console.log('\n[所有可见输入元素]');
      info.inputs
        .filter(f => f.visible)
        .forEach(f => {
          console.log(`  [idx=${f.idx}] <${f.tag}> @ (top:${f.top}, left:${f.left}, ${f.width}×${f.height})`);
          if (f.type)            console.log(`    type:            ${f.type}`);
          if (f.id)              console.log(`    id:              #${f.id}`);
          if (f.name)            console.log(`    name:            ${f.name}`);
          if (f.placeholder)     console.log(`    placeholder:     "${f.placeholder}"`);
          if (f.contenteditable) console.log(`    contenteditable: ${f.contenteditable}`);
          if (f.class)           console.log(`    class:           .${f.class.replace(/\s+/g, '.')}`);
          console.log(`    parentPath:      ${f.parentPath}`);
        });

      console.log('\n[所有按钮]');
      info.buttons
        .filter(b => b.text)
        .forEach((b, i) => {
          console.log(`  [${i + 1}] "${b.text}"  type:${b.type}  disabled:${b.disabled}  class:.${b.class.replace(/\s+/g, '.')}`);
        });
    };

    // 初始快照（对话框刚出现，标题框为空）
    await snapshotInputs('对话框初始状态（未填写标题）');

    // ── Step 4：填入测试标题，等待 3s，再快照 ─────────────────────────
    console.log('\n=== Step 4：填入测试标题，等待 3s，再探查说明输入框 ===\n');

    const TEST_TITLE = '【inspect 测试】这是一条自动化探查标题，请忽略';
    const titleCandidates = [
      'textarea[placeholder*="问题"]',
      '[role="dialog"] textarea',
      '[role="dialog"] [contenteditable="true"]',
      '.Modal textarea',
      'textarea',
    ];

    let titleFilled = false;
    for (const sel of titleCandidates) {
      try {
        await page.waitForSelector(sel, { timeout: 5000 });
        const el = page.locator(sel).first();
        const tag = await el.evaluate(n => n.tagName.toLowerCase());
        if (tag === 'textarea' || tag === 'input') {
          await el.click();
          await page.waitForTimeout(300);
          await el.fill(TEST_TITLE);
        } else {
          await el.click();
          await page.waitForTimeout(300);
          await page.keyboard.press('Meta+a');
          await page.keyboard.type(TEST_TITLE, { delay: 20 });
        }
        console.log(`✅ 测试标题已填入: ${sel}`);
        titleFilled = true;
        break;
      } catch {
        // continue
      }
    }

    if (!titleFilled) {
      console.warn('⚠️  未能填入测试标题');
    }

    console.log('⏳ 等待 3s，等待说明输入框出现...');
    await page.waitForTimeout(3000);

    // 填入标题后的快照
    await snapshotInputs('填入标题后 3s（说明输入框应已出现）');

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
