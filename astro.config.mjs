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
          // 对外站专属：商业获客页一律不入 .cc 产物（双站隔离铁律）
          injectRoute({ pattern: '/services', entrypoint: 'src/sites/com/services.astro' });
          injectRoute({ pattern: '/contact', entrypoint: 'src/sites/com/contact.astro' });
          injectRoute({ pattern: '/works', entrypoint: 'src/sites/com/works.astro' });
          injectRoute({ pattern: '/credentials', entrypoint: 'src/sites/com/credentials.astro' });
        } else {
          injectRoute({ pattern: '/family', entrypoint: 'src/sites/cc/family.astro' });
          injectRoute({ pattern: '/notes', entrypoint: 'src/sites/cc/notes.astro' });
          injectRoute({ pattern: '/library', entrypoint: 'src/sites/cc/library.astro' });
        }
      },
      'astro:build:done'({ dir }) {
        const outDir = fileURLToPath(dir);
        fs.writeFileSync(path.join(outDir, 'CNAME'), cname + '\n', 'utf8');
        // 双站隔离铁律 · 儿童照片隐私护栏：
        // public/ 会被原样拷入两个产物，故对外站(.com) 构建完成后强制剥离
        // 儿童/家庭正脸照（/images/family 目录 + scene 合影），确保 ccfudan.com 永不发布。
        if (isCom) {
          const familyDir = path.join(outDir, 'images', 'family');
          if (fs.existsSync(familyDir)) fs.rmSync(familyDir, { recursive: true, force: true });
          for (const f of ['scene-1.jpg', 'scene-2.jpg', 'scene-3.jpg', 'scene-4.jpg']) {
            const p = path.join(outDir, 'images', f);
            if (fs.existsSync(p)) fs.rmSync(p, { force: true });
          }
        }
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
