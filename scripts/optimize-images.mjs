#!/usr/bin/env node
// 图片优化：长边限制 + JPEG 重编码 + 剥离全部元数据（EXIF / GPS / 设备 / 时间）
// 用法：node scripts/optimize-images.mjs <目录> [--max=1600] [--q=80] [--backup=备份目录]
//
// 注意（Windows 踩坑）：不要用 sharp(路径) 直接处理后再回写同一路径——
// libvips 会持有源文件句柄，回写会报 "UNKNOWN: unknown error, open <path>"。
// 正确做法：先把源文件读成 Buffer 交给 sharp（走内存），再用 临时文件 + rename 落盘。
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

sharp.cache(false);

const args = process.argv.slice(2);
const dirArg = args[0];
if (!dirArg) {
  console.error('用法: node scripts/optimize-images.mjs <目录> [--max=1600] [--q=80] [--backup=路径]');
  process.exit(1);
}
const opt = Object.fromEntries(
  args.slice(1).map((a) => {
    const i = a.indexOf('=');
    return i === -1 ? [a.replace(/^--/, ''), true] : [a.slice(2, i), a.slice(i + 1)];
  })
);
const max = Number(opt.max || 1600);
const q = Number(opt.q || 80);
const dir = path.resolve(dirArg);
const backup = opt.backup ? path.resolve(String(opt.backup)) : '';

if (backup) fs.mkdirSync(backup, { recursive: true });

function walk(d) {
  return fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(d, e.name);
    return e.isDirectory() ? walk(p) : [p];
  });
}

const targets = walk(dir).filter((f) => /\.jpe?g$/i.test(f));
let before = 0;
let after = 0;
const rows = [];

for (const f of targets) {
  const b = fs.statSync(f).size;
  try {
    const src = fs.readFileSync(f); // 先入内存，避免 libvips 持有文件句柄
    const buf = await sharp(src)
      .rotate()
      .resize(max, max, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: q, mozjpeg: true })
      .toBuffer();

    if (buf.length < b) {
      if (backup) {
        const dest = path.join(backup, path.relative(dir, f));
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        if (!fs.existsSync(dest)) fs.writeFileSync(dest, src);
      }
      const tmp = f + '.tmp';
      fs.writeFileSync(tmp, buf);
      fs.renameSync(tmp, f);
    }
    const a = fs.statSync(f).size;
    before += b;
    after += a;
    rows.push([path.relative(dir, f), (b / 1024).toFixed(0) + 'KB', (a / 1024).toFixed(0) + 'KB']);
  } catch (e) {
    rows.push([path.relative(dir, f), (b / 1024).toFixed(0) + 'KB', 'ERR: ' + String(e && e.message)]);
  }
}

console.log('文件 | 优化前 | 优化后');
for (const r of rows) console.log(r.join(' | '));
console.log(`\n合计 ${(before / 1048576).toFixed(2)}MB → ${(after / 1048576).toFixed(2)}MB`);
console.log(`备份目录：${backup || '（未启用）'}`);
