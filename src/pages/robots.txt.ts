import type { APIRoute } from 'astro';
import { IS_INDEXABLE } from '../config/site';

// 对外站：允许收录（暂不指 sitemap，待 /sitemap.xml 落地后再加）
// 对内站：全站禁索引（家庭/儿童照片隐私护栏，属刻意选择而非疏漏）
export const GET: APIRoute = () => {
  const body = IS_INDEXABLE
    ? ['User-agent: *', 'Allow: /', ''].join('\n')
    : ['User-agent: *', 'Disallow: /', ''].join('\n');

  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
