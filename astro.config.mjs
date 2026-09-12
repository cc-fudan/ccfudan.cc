import { defineConfig } from 'astro/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// 个人 IP 官网 · 单仓库双构建
// ---------------------------------------------------------------------------
// SITE_TARGET=com → 对外站 https://ccfudan.com（输出 dist/，CNAME=ccfudan.com）
// SITE_TARGET=cc  → 对内站 https://ccfudan.cc （输出 dist/，CNAME=ccfudan.cc）
// 默认 cc（保持 push main 时对外站/对内站旧行为不变）。
const target = process.env.SITE_TARGET === 'com' ? 'com' : 'cc';
const isCom = target === 'com';
const site = isCom ? 'https://ccfudan.com' : 'https://ccfudan.cc';
const cname = isCom ? 'ccfudan.com' : 'ccfudan.cc';

/**
 * 站点目标集成：
 * 1) 按目标注入专属路由（对外站 /credentials，对内站 /family）
 * 2) 构建完成后写入对应域名的 CNAME
 */
function siteTarget() {
  return {
    name: 'cc-site-target',
    hooks: {
      'astro:config:setup'({ injectRoute }) {
        if (isCom) {
          injectRoute({ pattern: '/credentials', entrypoint: 'src/sites/com/credentials.astro' });
        } else {
          injectRoute({ pattern: '/family', entrypoint: 'src/sites/cc/family.astro' });
        }
      },
      'astro:build:done'({ dir }) {
        const outDir = fileURLToPath(dir);
        fs.writeFileSync(path.join(outDir, 'CNAME'), cname + '\n', 'utf8');
      },
    },
  };
}

export default defineConfig({
  site,
  base: '/',
  server: { host: true, port: 4321, allowedHosts: true },
  vite: { server: { allowedHosts: true } },
  trailingSlash: 'ignore',
  integrations: [siteTarget()],
});
