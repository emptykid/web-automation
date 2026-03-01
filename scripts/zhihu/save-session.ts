/**
 * 保存登录会话脚本
 *
 * 用法：npm run save-session
 *
 * 该脚本会打开浏览器并导航到知乎登录页，
 * 等待你手动登录后，自动保存 Session 供后续脚本复用。
 */

import { BrowserManager } from '../../src/browser/BrowserManager';
import { LoginPage } from '../../src/pages/zhihu/LoginPage';

async function main() {
  const manager = new BrowserManager('zhihu');

  try {
    // 使用持久化上下文，登录状态会自动保存
    const context = await manager.launchPersistent();

    const loginPage = new LoginPage(context);
    await loginPage.navigate();

    // 检查是否已经登录
    const isLoggedIn = await loginPage.isLoggedIn();
    if (isLoggedIn) {
      console.log('✅ 已检测到登录状态，无需重新登录');
    } else {
      console.log('⚠️  请在浏览器中手动完成登录...');
      const success = await loginPage.waitForManualLogin(180000); // 等待 3 分钟

      if (success) {
        console.log('✅ 登录成功，Session 已自动保存到 .session 目录');
      } else {
        console.error('❌ 登录超时');
        process.exit(1);
      }
    }

    console.log('');
    console.log('💡 后续运行其他脚本时将自动使用已保存的登录状态');
    console.log('   按 Ctrl+C 关闭浏览器');

    // 保持浏览器打开，等待用户确认
    await new Promise((resolve) => setTimeout(resolve, 5000));

  } catch (error) {
    console.error('运行出错:', error);
    process.exit(1);
  } finally {
    await manager.close();
  }
}

main();
