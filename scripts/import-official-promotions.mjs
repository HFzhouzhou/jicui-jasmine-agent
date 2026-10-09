import { readFile, writeFile, mkdir, realpath } from 'node:fs/promises';
import { resolve, dirname, basename, join, relative, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

// Validate the whole reviewed promotion batch before publishing any file.
// Copy the validated bytes unchanged; UI cropping is an SVG viewport only.
const manifestPath = process.argv[2];
if (!manifestPath) throw new Error('Usage: node scripts/import-official-promotions.mjs <宣传图索引.json>');
const absolute = resolve(manifestPath);
const records = JSON.parse(await readFile(absolute, 'utf8'));
if (!Array.isArray(records)) throw new Error('宣传图索引.json must contain an array.');
const projectRoot = fileURLToPath(new URL('../', import.meta.url));
const outputDirectory = join(projectRoot, 'public/images/official');
const sourceDirectory = join(dirname(absolute), '宣传图');
const seenTitles = new Set();
const seenFiles = new Set();
const seenHashes = new Set();
const promotions = [];
const copies = [];

function imageInfo(data) {
  if (data.length >= 24 && data.subarray(0, 8).toString('hex') === '89504e470d0a1a0a') {
    return { width: data.readUInt32BE(16), height: data.readUInt32BE(20), extension: 'png' };
  }
  if (data.length >= 4 && data[0] === 0xff && data[1] === 0xd8) {
    let offset = 2;
    while (offset + 4 <= data.length) {
      if (data[offset] !== 0xff) break;
      while (offset < data.length && data[offset] === 0xff) offset++;
      const marker = data[offset++];
      if (marker === 0xda || marker === 0xd9) break;
      if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
      if (offset + 2 > data.length) break;
      const length = data.readUInt16BE(offset);
      if (length < 2 || offset + length > data.length) break;
      if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker) && length >= 8) {
        return { width: data.readUInt16BE(offset + 5), height: data.readUInt16BE(offset + 3), extension: 'jpg' };
      }
      offset += length;
    }
  }
  throw new Error('Unsupported or invalid PNG/JPEG image.');
}

function validateObservedAt(value) {
  if (value === undefined) return;
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(value) || !Number.isFinite(Date.parse(value))
      || new Date(`${value.slice(0, 10)}T00:00:00Z`).toISOString().slice(0, 10) !== value.slice(0, 10)) {
    throw new Error('observedAt must be a valid ISO date or timestamp.');
  }
}

for (const [index, record] of records.entries()) {
  if (!record || typeof record.title !== 'string' || !record.title.trim() || typeof record.subtitle !== 'string'
      || typeof record.file !== 'string' || basename(record.file) !== record.file || /[/\\\u0000-\u001f]/.test(record.file)
      || !/\.(png|jpe?g)$/i.test(record.file)) throw new Error(`Invalid promotion title, subtitle or file path at record ${index + 1}.`);
  const title = record.title.trim();
  if (record.showOnHome !== undefined && typeof record.showOnHome !== 'boolean') throw new Error(`Invalid showOnHome flag: ${title}`);
  const titleKey = title.normalize('NFC');
  if (seenTitles.has(titleKey)) throw new Error(`Duplicate promotion title: ${title}`);
  validateObservedAt(record.observedAt);
  const sourcePath = join(sourceDirectory, record.file);
  const actualDirectory = await realpath(sourceDirectory);
  const actualPath = await realpath(sourcePath);
  const withinSource = relative(actualDirectory, actualPath);
  if (withinSource === '..' || withinSource.startsWith(`..${process.platform === 'win32' ? '\\' : '/'}`) || isAbsolute(withinSource)) {
    throw new Error(`Promotion file resolves outside 宣传图/: ${record.file}`);
  }
  if (seenFiles.has(actualPath)) throw new Error(`Duplicate promotion file: ${record.file}`);
  const data = await readFile(actualPath);
  const { width, height, extension } = imageInfo(data);
  if (!Number.isInteger(record.width) || !Number.isInteger(record.height) || width < 1 || height < 1
      || record.width !== width || record.height !== height) throw new Error(`Declared and actual image dimensions differ: ${record.file}`);
  const crop = record.crop;
  if (!crop || !['x', 'y', 'width', 'height'].every(key => Number.isFinite(crop[key]))
      || crop.x < 0 || crop.y < 0 || crop.width <= 0 || crop.height <= 0 || crop.x + crop.width > width || crop.y + crop.height > height) {
    throw new Error(`Invalid promotion viewport: ${record.file}`);
  }
  const sha256 = createHash('sha256').update(data).digest('hex');
  if (seenHashes.has(sha256)) throw new Error(`Repeated promotion image bytes: ${record.file}`);
  seenTitles.add(titleKey); seenFiles.add(actualPath); seenHashes.add(sha256);
  const filename = `promo-${sha256.slice(0, 20)}.${extension}`;
  promotions.push({ title, subtitle: record.subtitle.trim(), showOnHome: record.showOnHome ?? true, src: `/images/official/${filename}`, width, height,
    crop: { x: crop.x, y: crop.y, width: crop.width, height: crop.height },
    ...(record.observedAt === undefined ? {} : { observedAt: record.observedAt }),
  });
  copies.push({ data, filename });
}

// An explicitly empty reviewed index produces an empty collection, never a fabricated placeholder.
await mkdir(outputDirectory, { recursive: true });
for (const copy of copies) await writeFile(join(outputDirectory, copy.filename), copy.data);
await writeFile(join(projectRoot, 'src/data/officialPromotions.ts'), `/** Reviewed brand promotion images. Source bytes are unchanged; poster prices never override the menu. */\nimport type { OfficialImage } from './officialImages';\nexport type OfficialPromotion = OfficialImage & { title: string; subtitle: string; showOnHome: boolean; observedAt?: string };\nexport const OFFICIAL_PROMOTIONS: OfficialPromotion[] = ${JSON.stringify(promotions, null, 2)};\n`);
console.log(`Imported ${promotions.length} reviewed promotion images.`);
