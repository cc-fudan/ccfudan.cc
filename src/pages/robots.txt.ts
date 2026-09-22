import type { APIRoute } from 'astro';
import { IS_INDEXABLE } from '../config/site';

// robots.txt 按站点分流（单一事实源：src/config/site.ts 的 IS_INDEXABLE）：
//   · 对外站(.com, IS_INDEXABLE=true)：Allow:/ —— 必须可被搜索引擎收录，否则获客站没有自然流量。
//   · 对内站(.cc, IS_INDEXABLE=false)：Disallow:/ —— 含儿童照片的家庭站，直接用 robots 拦爬，
//     比仅依赖页面级 noindex 更稳妥（noindex 仍保留在 BaseLayout 作为双保险）。
export const GET: APIRoute = () => {
  const body = IS_INDEXABLE
    ? ['User-agent: *', 'Allow: /', ''].join('\n')
    : ['User-agent: *', 'Disallow: /', ''].join('\n');

  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
