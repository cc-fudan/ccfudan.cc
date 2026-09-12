#!/usr/bin/env node
// 跨平台构建入口：node scripts/build.mjs [com|cc]
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const target = process.argv[2] === 'com' ? 'com' : 'cc';
const bin = path.join('node_modules', '.bin', process.platform === 'win32' ? 'astro.cmd' : 'astro');

console.log(`\n[cc-site] 构建目标 SITE_TARGET=${target} （${target === 'com' ? 'ccfudan.com 对外站' : 'ccfudan.cc 对内站'}）\n`);

const r = spawnSync(bin, ['build'], {
  stdio: 'inherit',
  shell: process.platform === 'win32',
  env: { ...process.env, SITE_TARGET: target },
});

process.exit(r.status ?? 1);
