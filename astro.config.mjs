import { defineConfig } from 'astro/config';

// 个人IP独立官网 · cc（明亚保险经纪人）
// GitHub Pages 部署：base 从 GITHUB_REPOSITORY 自动推导（project page 子路径）
const repo = process.env.GITHUB_REPOSITORY; // 形如 "owner/repo"
const [owner, name] = repo ? repo.split('/') : [null, null];
const base = name ? `/${name}/` : '/';
const site = owner ? `https://${owner}.github.io` : 'https://cc.example.com';

export default defineConfig({
  site,
  base,
  server: { host: true, port: 4321 },
  trailingSlash: 'ignore',
});
