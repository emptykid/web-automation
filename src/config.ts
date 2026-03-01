import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '..', '.env') });

export const config = {
  // 知乎账号
  zhihu: {
    username: process.env.ZHIHU_USERNAME || '',
    password: process.env.ZHIHU_PASSWORD || '',
    baseUrl: 'https://www.zhihu.com',
  },

  // 百度知道
  zhidao: {
    baseUrl: 'https://zhidao.baidu.com',
  },

  // 浏览器配置
  browser: {
    // 使用系统已安装的 Chrome，避免重新下载
    channel: 'chrome' as const,
    headless: process.env.HEADLESS === 'true',
    slowMo: parseInt(process.env.SLOW_MO || '100', 10),
    // Session 持久化存储路径（按站点隔离，避免并发冲突）
    sessionDir: (site: string) =>
      process.env[`${site.toUpperCase()}_SESSION_DIR`] ||
      path.join(__dirname, '..', '.session', site),
    // 视口大小
    viewport: { width: 1280, height: 800 },
  },

  // 超时配置（毫秒）
  timeout: {
    navigation: 30000,
    element: 10000,
    action: 5000,
  },
};
