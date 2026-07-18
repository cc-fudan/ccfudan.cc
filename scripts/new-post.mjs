// 文章脚手架：一条命令生成带当天日期的 Markdown 骨架
// 用法: npm run new "文章标题"
import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const title = process.argv.slice(2).join(' ').trim();
if (!title) {
  console.error('用法: npm run new "文章标题"');
  process.exit(1);
}

const today = new Date();
const date = today.toISOString().slice(0, 10); // YYYY-MM-DD
// 文件名 = 日期 + 标题（去非法字符），中文 slug 在 Astro 中可用（URL 会自动编码）
const safe = title.replace(/[\\/:*?"<>|]/g, '').replace(/\s+/g, '-').slice(0, 60);
const filename = `${date}-${safe}.md`;

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dir = join(root, 'src', 'content', 'writing');
if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

const content = `---
title: ${title}
date: ${date}
excerpt: TODO 在这里写一句话摘要（会显示在文章列表，建议 30 字内）
tags: ["标签1", "标签2"]
---

在这里写正文，支持标准 Markdown：

## 小标题
- 列表项一
- 列表项二

> 引用一句话，强调你的观点

**加粗重点**、[链接文字](https://example.com)

写完把上面的 \`excerpt\` 和 \`tags\` 也填好，然后执行 \`npm run build\` 即可发布。
`;

const target = join(dir, filename);
if (existsSync(target)) {
  console.error(`⚠️ 已存在: ${filename}，未覆盖。`);
  process.exit(1);
}
writeFileSync(target, content, 'utf8');
console.log(`✅ 已创建文章骨架:`);
console.log(`   ${target}`);
console.log(`\n下一步:`);
console.log(`   1. 打开上面的文件，填好 excerpt / tags / 正文`);
console.log(`   2. npm run build   （重新构建）`);
console.log(`   3. 重新部署到公网`);
