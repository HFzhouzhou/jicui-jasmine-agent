import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
import { resolve, dirname, basename, join } from 'node:path';
import { createHash } from 'node:crypto';

// Import only the reviewed product screenshots listed in the explicit manifest.
// Original pixels remain intact; the UI uses an SVG viewport to show the product region.
const manifestPath = process.argv[2];
if (!manifestPath) throw new Error('Provide the reviewed 商品截图索引.json path.');
const absolute = resolve(manifestPath);
const records = JSON.parse(await readFile(absolute, 'utf8'));
const output = resolve('public/images/official');
const images = {};
const copies = [];
const hashes = new Set();
const audit = [];
for (const record of records) {
  if (!record.name || basename(record.file) !== record.file || !/\.(png|jpe?g)$/.test(record.file)) throw new Error('Invalid screenshot record.');
  const source = join(dirname(absolute), '商品详情', record.file);
  const data = await readFile(source);
  let width, height, extension;
  if (data.subarray(0, 8).toString('hex') === '89504e470d0a1a0a') {
    width = data.readUInt32BE(16); height = data.readUInt32BE(20); extension = 'png';
  } else if (data[0] === 0xff && data[1] === 0xd8) {
    extension = 'jpg';
    let offset = 2;
    while (offset + 8 < data.length) {
      if (data[offset] !== 0xff) throw new Error('Invalid JPEG marker');
      while (data[offset] === 0xff) offset++;
      const marker = data[offset++];
      if (marker === 0xda || marker === 0xd9) break;
      const length = data.readUInt16BE(offset);
      if ([0xc0, 0xc1, 0xc2, 0xc3].includes(marker)) {height = data.readUInt16BE(offset + 3); width = data.readUInt16BE(offset + 5); break;}
      if (length < 2) break;
      offset += length;
    }
  } else throw new Error(`Unsupported screenshot: ${record.file}`);
  // Reject unrelated windows before they can accidentally become website assets.
  if (width !== 828 || height !== 1560) throw new Error(`Unexpected screenshot dimensions: ${record.file}`);
  const crop = record.crop;
  if (!crop || !['x', 'y', 'width', 'height'].every(key => Number.isFinite(crop[key])) || crop.x < 0 || crop.y < 0 || crop.width < 1 || crop.height < 1 || crop.x + crop.width > width || crop.y + crop.height > height) throw new Error(`Invalid product viewport: ${record.file}`);
  const sha256 = createHash('sha256').update(data).digest('hex');
  if (hashes.has(sha256)) throw new Error(`Repeated screenshot pixels; manually review ${record.file}`);
  hashes.add(sha256);
  const file = `wx-${createHash('sha256').update(record.name).digest('hex').slice(0, 12)}.${extension}`;
  const name = record.name.replace('（5元-2个）', '（5元/2个）');
  if (images[name]) throw new Error(`Duplicate product: ${name}`);
  const observedAt = record.observedAt ?? '2026-10-09';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(observedAt)) throw new Error(`Invalid source date: ${record.file}`);
  images[name] = { src: `/images/official/${file}`, width, height, crop, observedAt };
  copies.push({source, target: join(output, file)});
  audit.push({name, file: record.file, width, height, format: extension, bytes: data.length, sha256, crop, observedAt});
}
// Validate the entire reviewed batch before publishing any of its source images.
await mkdir(output, { recursive: true });
for (const copy of copies) await copyFile(copy.source, copy.target);
await writeFile(resolve('src/data/officialImages.ts'), `/** Official mini-program product images. Source dates are retained per asset; original pixels are unchanged. */\nexport type OfficialImage = { src: string; width: number; height: number; observedAt?: string; crop: { x: number; y: number; width: number; height: number } };\nexport const OFFICIAL_IMAGES: Record<string, OfficialImage> = ${JSON.stringify(images, null, 2)};\nexport const hasOfficialImage = (name: string): boolean => Boolean(OFFICIAL_IMAGES[name]);\n`);
await writeFile(join(dirname(absolute), '截图质量核对.json'), JSON.stringify({source: '中华茉莉园店小程序', observedDates: [...new Set(audit.map(image => image.observedAt))].sort(), checks: ['原生窗口尺寸828×1560', '实际图片格式', '裁切视口边界', '文件内容无重复'], note: '图文对应关系由采集时人工视觉核对；自动检查不代替视觉核验。', count: audit.length, images: audit}, null, 2));
console.log(`Imported ${Object.keys(images).length} reviewed product screenshots.`);
