#!/usr/bin/env node
// 发布对外站到 ccfudan.com 仓库（方案 B：源码留在本仓库，产物推到独立仓库）
// 用法：node scripts/publish-com.mjs [--push]
//
// 做四件事：
//   1. 以 SITE_TARGET=com 构建
//   2. 把 dist 同步到发布目录（发布目录放在源码仓库之外：<工作区>/deploy/ccfudan.com）
//   3. 写入 .nojekyll（必须！否则 GitHub Pages 的 Jekyll 会吃掉 _astro 目录，CSS/JS 全 404）
//   4. 提交并推送到目标仓库的 main 分支
//
// 踩坑记录：spawnSync 里 shell:true 会把含空格的提交信息拆成多个参数（pathspec 报错）。
// 因此 git / node 调用一律不加 shell，只有 .cmd 形式的可执行文件才需要 shell。
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const publishDir = path.resolve(repoRoot, '..', 'deploy', 'ccfudan.com');
const remote = 'git@github.com:cc-fudan/ccfudan.com.git';
const branch = 'main';
const shouldPush = process.argv.includes('--push');

// 不发布到公网的文件（构建产物里的本地标记文件）
const EXCLUDE = new Set(['ccfudan-source.ccfudan']);

function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { stdio: 'inherit', cwd: opts.cwd || repoRoot, ...opts });
  if (r.status !== 0) {
    console.error(`\n[!] 命令失败: ${cmd} ${args.join(' ')} (exit ${r.status})`);
    process.exit(r.status ?? 1);
  }
  return r;
}

function git(args, cwd = publishDir) {
  return run('git', args, { cwd });
}

function gitOut(args, cwd = publishDir) {
  const r = spawnSync('git', args, { cwd, encoding: 'utf8' });
  return (r.stdout || '').trim();
}

// 1. 构建
console.log('\n[1/4] 构建对外站（SITE_TARGET=com）');
run('node', [path.join(repoRoot, 'scripts', 'build.mjs'), 'com']);

const dist = path.join(repoRoot, 'dist');
if (!fs.existsSync(path.join(dist, 'index.html'))) {
  console.error('[!] 构建产物缺失：dist/index.html 不存在');
  process.exit(1);
}
if (!fs.existsSync(path.join(dist, 'CNAME'))) {
  console.error('[!] dist/CNAME 缺失——自定义域名文件必须存在，构建钩子可能未生效');
  process.exit(1);
}

// 2. 同步到发布目录（保留 .git，其余清空重建）
console.log(`\n[2/4] 同步产物 → ${publishDir}`);
fs.mkdirSync(publishDir, { recursive: true });
for (const name of fs.readdirSync(publishDir)) {
  if (name === '.git') continue;
  fs.rmSync(path.join(publishDir, name), { recursive: true, force: true });
}
fs.cpSync(dist, publishDir, {
  recursive: true,
  filter: (src) => !EXCLUDE.has(path.basename(src)),
});

// 3. .nojekyll
fs.writeFileSync(path.join(publishDir, '.nojekyll'), '');
console.log('[3/4] 已写入 .nojekyll');

// 4. 提交并推送
if (!fs.existsSync(path.join(publishDir, '.git'))) {
  console.log('[4/4] 初始化发布仓库');
  git(['init', '-b', branch]);
  git(['symbolic-ref', 'HEAD', `refs/heads/${branch}`]);
}

const userName = gitOut(['config', 'user.name'], repoRoot) || 'cc-fudan';
const userEmail = gitOut(['config', 'user.email'], repoRoot) || 'cc-fudan@users.noreply.github.com';

git(['add', '-A']);
if (!gitOut(['status', '--porcelain'])) {
  console.log('[4/4] 无变更，跳过提交');
} else {
  const stamp = new Date().toISOString().slice(0, 16).replace('T', ' ');
  git(['-c', `user.name=${userName}`, '-c', `user.email=${userEmail}`, 'commit', '-m', `publish ccfudan.com ${stamp}`]);
}

if (shouldPush) {
  if (!gitOut(['remote']).split(/\s+/).includes('origin')) git(['remote', 'add', 'origin', remote]);
  git(['push', '-u', 'origin', `${branch}:${branch}`, '--force']);
  console.log('\n[✓] 已推送到 ' + remote);
} else {
  console.log('\n[✓] 已准备好提交，未推送（加 --push 才会推送）');
}
