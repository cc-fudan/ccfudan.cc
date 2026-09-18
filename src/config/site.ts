// 单仓库双构建 · 站点目标配置层（单一事实源 SSO）
// ---------------------------------------------------------------------------
// 用法：
//   npm run build:com   → 对外站（https://ccfudan.com，公开可索引）
//   npm run build:cc    → 对内站（https://ccfudan.cc，noindex + robots 禁索引）
// 说明：所有页面/组件读取本文件，不再各自硬编码域名、导航与首页文案。
//
// 双站隔离铁律：
//   ① 对外站(.com) 不出现「生活/家庭照」入口；对内站(.cc) 不出现「资质/商业获客」入口
//   ② 港险低调红线：.com 不出现「保诚」「港险代理」，统一改写「香港身份与跨境规划」
//   ③ .cc 的 /family（吉光片羽）永久 noindex

export type SiteTarget = 'com' | 'cc';

export const SITE_TARGET: SiteTarget = process.env.SITE_TARGET === 'com' ? 'com' : 'cc';

/** true = 对外站（.com）；false = 对内站（.cc） */
export const IS_COM = SITE_TARGET === 'com';

/** 是否允许搜索引擎收录。对内站一律 noindex（儿童照片隐私护栏）。 */
export const IS_INDEXABLE = IS_COM;

export const SITE_URL = IS_COM ? 'https://ccfudan.com' : 'https://ccfudan.cc';

/** 站点角色，用于 Header 副标题 */
export const SITE_ROLE = IS_COM ? '独立咨询顾问' : '格物致知 · 修身齐家';

/** 站点主标题 */
export const SITE_NAME = IS_COM ? 'cc · 程成' : '3C得九';

// ── .com 首页核心文案（P4-2 / P5 决策） ────────────────────────────────────────
/** .com 首页主标题：用「非保险」钩子降低客户防御 */
export const H1_COM = '如果你不想聊保险，我也略懂点法律和哲学';
/** .com 首页竖杠副标：转型期家庭的一次性想清楚 */
export const SUB_COM = '转型期家庭的一次性想清楚：保障 · 契约 · 身份';

/**
 * .com 首页核心卡片（P4-3 第3卡=身份与跨境规划；P5-2-b 第4卡=案例与口碑）。
 * 前两张来自顾问服务，后两张分别落到 /services 与 /credentials。
 */
export const HOME_CARDS_COM: {
  title: string;
  desc: string;
  href: string;
  points: string[];
}[] = [
  {
    title: '家庭保障规划',
    desc: '从收入断点、责任缺口到医疗与现金流，把「万一」先想透。',
    href: '/services',
    points: ['先问「你怕什么」，再定方案', '全市场横向对比，独立选品', '投保只是开始，理赔陪跑到底'],
  },
  {
    title: '法律与契约',
    desc: '法考 A 证视角下的合同、继承与家庭契约梳理。',
    href: '/services',
    points: ['法律职业资格（A 证）加持', '把保险放进家庭资产全盘看', '独立第二意见，不和稀泥'],
  },
  {
    title: '身份与跨境规划',
    desc: '香港身份与跨境结构的「第二步」该怎么走，先想清再办。',
    href: '/services',
    points: ['高才通全流程亲历经验', '跨境身份与教育衔接思路', '跨境安排的合规边界提示'],
  },
  {
    title: '案例与口碑',
    desc: '去战果化的真实服务记录，看我们怎么陪家庭想清楚。',
    href: '/credentials',
    points: ['真实服务过程，不堆战果', '客户视角的「被安排好」', '长期陪跑，不是一锤子买卖'],
  },
];

// ── .cc 首页核心文案（P2 / P3 / P4-1 决策） ────────────────────────────────
/** .cc 站点一句话主张 */
export const CC_TAGLINE = '格物致知 · 修身齐家';
/** .cc 首页户型图 hero 副标 */
export const CC_HERO_SUB = '一个人的书房、茶室、工作室、运动与客厅';

/**
 * .cc 首页「户型图」房间（P3-5：5 房，空房不画）。
 * 顺序即首页列表顺序；各房仅在有内容时渲染（空数组不渲染）。
 */
export const CC_ROOMS: {
  key: string;
  name: string;
  desc: string;
  href: string;
}[] = [
  {
    key: 'study',
    name: '书房',
    desc: '读书、写作、佛学与哲学的私人角落。',
    href: '/notes',
  },
  {
    key: 'teahouse',
    name: '茶室',
    desc: '待客与独处时，把事情慢慢想明白的地方。',
    href: '/notes',
  },
  {
    key: 'studio',
    name: '工作室',
    desc: '保险、法律与跨境规划的工作台。',
    href: '/about',
  },
  {
    key: 'sport',
    name: '运动',
    desc: '身体是修行的道场，先动起来。',
    href: '/notes',
  },
  {
    key: 'living',
    name: '客厅',
    desc: '一家人吃饭、说话、长大的地方。',
    href: '/family',
  },
];

/**
 * 主导航（P2 信息架构决策）。
 * 对外站：首页 / 服务 / 资质案例 / 关于我 / 联系预约（无「生活」入口）
 * 对内站：首页 / 人生随笔 / 音书影路 / 关于我 / 家·吉光片羽（无「资质」入口）
 */
export const NAV: { href: string; label: string }[] = IS_COM
  ? [
      { href: '/', label: '首页' },
      { href: '/services', label: '服务' },
      { href: '/credentials', label: '资质案例' },
      { href: '/works', label: '文章' },
      { href: '/about', label: '关于我' },
      { href: '/contact', label: '联系预约' },
    ]
  : [
      { href: '/', label: '首页' },
      { href: '/notes', label: '人生随笔' },
      { href: '/library', label: '音书影路' },
      { href: '/about', label: '关于我' },
      { href: '/family', label: '家·吉光片羽' },
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
