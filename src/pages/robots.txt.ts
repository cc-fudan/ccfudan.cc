import type { APIRoute } from 'astro';
import { IS_INDEXABLE } from '../config/site';

// 对外站(.com)：允许收录（暂不指 sitemap，待 /sitemap.xml 落地后再加）
// 对内站(.cc)：同样 Allow:/ —— 不靠 robots Disallow 拦爬，
//   收录抑制统一交给 BaseLayout 输出的 <meta name="robots" content="noindex">（P2 铁律）。
//   这样做的好处：家庭站可被直接链接访问（分享给亲友），只是不进搜索索引。
export const GET: APIRoute = () => {
  const body = ['User-agent: *', 'Allow: /', ''].join('\n');

  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
