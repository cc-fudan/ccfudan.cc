// 单仓库双构建 · 站点目标配置层
// ---------------------------------------------------------------------------
// 用法：
//   npm run build:com   → 对外站（https://ccfudan.com，公开可索引）
//   npm run build:cc    → 对内站（https://ccfudan.cc，noindex + robots 禁索引）
// 说明：所有页面/组件读取本文件，不再各自硬编码域名与导航。

export type SiteTarget = 'com' | 'cc';

export const SITE_TARGET: SiteTarget = process.env.SITE_TARGET === 'com' ? 'com' : 'cc';

/** true = 对外站（.com）；false = 对内站（.cc） */
export const IS_COM = SITE_TARGET === 'com';

/** 是否允许搜索引擎收录。对内站一律 noindex（儿童照片隐私护栏）。 */
export const IS_INDEXABLE = IS_COM;

export const SITE_URL = IS_COM ? 'https://ccfudan.com' : 'https://ccfudan.cc';

/** 站点角色，用于 Header 副标题 */
export const SITE_ROLE = IS_COM ? '独立咨询顾问' : '家庭与生活记录';

/** 站点主标题 */
export const SITE_NAME = IS_COM ? 'cc · 程成' : 'cc 的家';

/**
 * 主导航。
 * 铁律：对外站不出现「生活」入口；对内站不出现「资质」等商业入口。
 */
export const NAV: { href: string; label: string }[] = IS_COM
  ? [
      { href: '/', label: '首页' },
      { href: '/about', label: '关于我' },
      { href: '/services', label: '顾问服务' },
      { href: '/works', label: '作品集' },
      { href: '/credentials', label: '资质' },
      { href: '/contact', label: '联系预约' },
    ]
  : [
      { href: '/', label: '首页' },
      { href: '/about', label: '关于我' },
      { href: '/services', label: '顾问服务' },
      { href: '/works', label: '作品集' },
      { href: '/family', label: '生活' },
      { href: '/contact', label: '联系预约' },
    ];

/**
 * 对外站是否展示家庭照片（关于我页的 4 张「一些瞬间」）。
 * 默认 false —— 双站隔离铁律：.com 不出现儿童正脸。
 * 若 cc 看图确认这 4 张无儿童正脸（可作真实感背书），再改为 true。
 */
export const SHOW_FAMILY_ON_COM = false;

/** 跨站互链（Footer 轻链接）：两站之间只放一个链接，不互嵌内容 */
export const CROSS_LINK = IS_COM
  ? { href: 'https://ccfudan.cc', label: '家庭与生活记录' }
  : { href: 'https://ccfudan.com', label: '对外站 · 顾问业务' };
