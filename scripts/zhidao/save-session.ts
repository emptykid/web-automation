/**
 * 百度知道 - 保存登录会话
 *
 * 用法：npm run zhidao:save-session
 *
 * 打开浏览器并导航到百度登录页，等待手动登录后自动保存 Session。
 */

import { BrowserManager } from '../../src/browser/BrowserManager';
import { LoginPage } from '../../src/pages/zhidao/LoginPage';

async function main() {
  const manager = new BrowserManager('zhidao');

  try {
    const context = await manager.launchPersistent();

    const loginPage = new LoginPage(context);
    const page = await context.newPage();
    loginPage.setPage(page);

    // 先检查是否已经登录
    await loginPage.navigate();
    const isLoggedIn = await loginPage.isLoggedIn();

    if (isLoggedIn) {
      console.log('✅ 已检测到百度知道登录状态，无需重新登录');
    } else {
      console.log('⚠️  未登录，正在打开百度登录页...');
      await loginPage.navigateToLogin();
      console.log('📌 请在浏览器中完成百度账号登录（支持扫码、短信验证码等）');

      const success = await loginPage.waitForManualLogin(180000);

      if (success) {
        console.log('✅ 登录成功，Session 已自动保存到 .session 目录');
      } else {
        console.error('❌ 登录超时，请重试');
        process.exit(1);
      }
    }

    console.log('');
    console.log('💡 后续运行其他 zhidao: 指令时将自动使用已保存的登录状态');
    console.log('   按 Ctrl+C 关闭浏览器');

    await new Promise((resolve) => setTimeout(resolve, 5000));

  } catch (error) {
    console.error('运行出错:', error);
    process.exit(1);
  } finally {
    await manager.close();
  }
}

main();
