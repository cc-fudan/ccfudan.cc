import { defineCollection, z } from 'astro:content';

const writing = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    excerpt: z.string(),
    tags: z.array(z.string()).default([]),
  }),
});

// 作品集：公众号推文同步集合
const works = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    excerpt: z.string(),
    account: z.string(), // 「cc的奶爸日记」或「cc的保险笔记」
    target: z.enum(['com', 'cc', 'both']).default('both'), // 站点归属：both=两站都出；cc=只在 .cc；com=只在 .com
    url: z.string().optional(),   // 公众号原文链接（有则优先跳外链）
    internal: z.string().optional(), // 站内全文 slug（/writing/xxx）
  }),
});

export const collections = { writing, works };
