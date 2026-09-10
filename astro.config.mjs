import { defineConfig } from 'astro/config';

// 个人IP独立官网 · cc（独立咨询顾问）
// 自定义域名 ccfudan.cc → GitHub Pages 根路径部署
const site = 'https://ccfudan.cc';

export default defineConfig({
  site,
  base: '/',
  server: { host: true, port: 4321, allowedHosts: true },
  vite: { server: { allowedHosts: true } },
  trailingSlash: 'ignore',
});
