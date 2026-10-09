import { readFile, writeFile, stat, realpath } from 'node:fs/promises';
import { basename, join, resolve, relative, isAbsolute, sep } from 'node:path';
import { createHash } from 'node:crypto';
import { OFFICIAL_CATALOG } from '../server/data/official-catalog.ts';
import { BRAND_COLLECTION } from '../src/data/brandCollection.ts';

// Node.js 24 can strip the type-only syntax in the two catalog modules.
// This script only writes the archive HTML/JSON. It never changes image pixels.
const inputDirectory = process.argv[2];
if (!inputDirectory) throw new Error('Usage: node scripts/build-material-archive.mjs <官方小程序素材目录>');
const archiveDirectory = resolve(inputDirectory);
if (!(await stat(archiveDirectory)).isDirectory()) throw new Error('The material archive path must be a directory.');
const manifest = JSON.parse(await readFile(join(archiveDirectory, '商品截图索引.json'), 'utf8'));
if (!Array.isArray(manifest)) throw new Error('商品截图索引.json must contain an array.');

const canonicalName = name => name.replace('（5元-2个）', '（5元/2个）').trim();
const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const localUrl = relativePath => relativePath.split('/').map(encodeURIComponent).join('/');
const indexWarnings = [];
const promotionWarnings = [];
const DEFAULT_IMAGE_DATE = '2026-10-09';
function observedDate(value) {
  const date = value ?? DEFAULT_IMAGE_DATE;
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(date) || !Number.isFinite(Date.parse(date))
      || new Date(`${date.slice(0, 10)}T00:00:00Z`).toISOString().slice(0, 10) !== date.slice(0, 10)) throw new Error('图片 observedAt 不是有效的 ISO 日期或时间');
  return date;
}

function imageDimensions(data) {
  if (data.length >= 24 && data.subarray(0, 8).toString('hex') === '89504e470d0a1a0a') {
    return { width: data.readUInt32BE(16), height: data.readUInt32BE(20) };
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
        return { width: data.readUInt16BE(offset + 5), height: data.readUInt16BE(offset + 3) };
      }
      offset += length;
    }
  }
  throw new Error('无法识别 PNG/JPEG 截图尺寸');
}

const screenshotsByName = new Map();
for (const [index, record] of manifest.entries()) {
  if (!record || typeof record.name !== 'string' || !record.name.trim() || typeof record.file !== 'string'
      || basename(record.file) !== record.file || /[/\\\0]/.test(record.file) || !/\.(png|jpe?g)$/i.test(record.file)) {
    throw new Error(`截图索引第 ${index + 1} 项名称或文件路径无效。`);
  }
  const name = canonicalName(record.name);
  const relativePath = `商品详情/${record.file}`;
  const observedAt = observedDate(record.observedAt);
  let screenshot;
  try {
    const data = await readFile(join(archiveDirectory, relativePath));
    const dimensions = imageDimensions(data);
    if (dimensions.width !== 828 || dimensions.height !== 1560) throw new Error('不是预期的 828 × 1560 小程序窗口截图');
    const crop = record.crop;
    if (!crop || !['x', 'y', 'width', 'height'].every(key => Number.isFinite(crop[key]))
        || crop.x < 0 || crop.y < 0 || crop.width <= 0 || crop.height <= 0
        || crop.x + crop.width > dimensions.width || crop.y + crop.height > dimensions.height) {
      throw new Error('商品图显示区域无效');
    }
    screenshot = { status: 'available', relativePath, observedAt, ...dimensions, viewport: { x: crop.x, y: crop.y, width: crop.width, height: crop.height } };
  } catch (error) {
    const reason = error.code === 'ENOENT' ? '索引引用的截图文件不存在' : error.message;
    screenshot = { status: 'pending', relativePath, observedAt, reason };
    indexWarnings.push({ name, relativePath, reason });
  }
  const previous = screenshotsByName.get(name) ?? [];
  if (previous.some(item => item.relativePath === relativePath)) throw new Error(`截图索引存在重复文件记录：${record.file}`);
  screenshotsByName.set(name, [...previous, screenshot]);
}

// Brand themes are a separate archive collection, never product images or price inputs.
let promotionManifest = [];
let promotionIndex = null;
try {
  promotionManifest = JSON.parse(await readFile(join(archiveDirectory, '宣传图索引.json'), 'utf8'));
  promotionIndex = '宣传图索引.json';
  if (!Array.isArray(promotionManifest)) throw new Error('宣传图索引.json must contain an array.');
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}
const promotions = [];
const promotionTitles = new Set();
const promotionFiles = new Set();
const promotionHashes = new Set();
for (const [index, record] of promotionManifest.entries()) {
  try {
    if (!record || typeof record.title !== 'string' || !record.title.trim() || typeof record.subtitle !== 'string'
        || typeof record.file !== 'string' || basename(record.file) !== record.file || /[/\\\u0000-\u001f]/.test(record.file)
        || !/\.(png|jpe?g)$/i.test(record.file)) throw new Error('宣传图名称、副标题或文件路径无效');
    const title = record.title.trim();
    const titleKey = title.normalize('NFC');
    if (promotionTitles.has(titleKey)) throw new Error('宣传图标题重复');
    const observedAt = observedDate(record.observedAt);
    const relativePath = `宣传图/${record.file}`;
    const sourceDirectory = await realpath(join(archiveDirectory, '宣传图'));
    const actualPath = await realpath(join(archiveDirectory, relativePath));
    const sourceRelativePath = relative(sourceDirectory, actualPath);
    if (sourceRelativePath === '..' || sourceRelativePath.startsWith(`..${sep}`) || isAbsolute(sourceRelativePath)) throw new Error('宣传图路径指向目录之外');
    if (promotionFiles.has(actualPath)) throw new Error('宣传图文件重复');
    const data = await readFile(actualPath);
    const dimensions = imageDimensions(data);
    if (!Number.isInteger(record.width) || !Number.isInteger(record.height) || dimensions.width < 1 || dimensions.height < 1
        || dimensions.width !== record.width || dimensions.height !== record.height) throw new Error('宣传图索引尺寸与实际图像不一致');
    const crop = record.crop;
    if (!crop || !['x', 'y', 'width', 'height'].every(key => Number.isFinite(crop[key]))
        || crop.x < 0 || crop.y < 0 || crop.width <= 0 || crop.height <= 0
        || crop.x + crop.width > dimensions.width || crop.y + crop.height > dimensions.height) throw new Error('宣传图显示区域无效');
    const sha256 = createHash('sha256').update(data).digest('hex');
    if (promotionHashes.has(sha256)) throw new Error('宣传图内容重复');
    promotionTitles.add(titleKey); promotionFiles.add(actualPath); promotionHashes.add(sha256);
    promotions.push({ title, subtitle: record.subtitle.trim(), kind: 'brand-promotion', observedAt,
      source: { name: '极萃东方茉莉微信小程序 · 品牌宣传', scope: 'brand-promotion' },
      relativePath, ...dimensions, viewport: { x: crop.x, y: crop.y, width: crop.width, height: crop.height },
      note: '品牌主题素材独立归档；海报价格不覆盖门店菜单普通价，不计入商品图片覆盖数量。',
    });
  } catch (error) {
    promotionWarnings.push({ index, title: record?.title ?? null, file: record?.file ?? null, reason: error.code === 'ENOENT' ? '索引引用的宣传图文件不存在' : error.message });
  }
}

const catalogItems = [
  ...OFFICIAL_CATALOG.items.map(item => ({
    id: item.id, name: item.name, kind: 'drink', category: item.category,
    price: { amount: item.price, currency: 'CNY', kind: 'regular', startingPrice: item.startingPrice === true },
    source: { name: OFFICIAL_CATALOG.source, storeName: OFFICIAL_CATALOG.storeName, observedAt: OFFICIAL_CATALOG.observedAt, scope: 'store-menu' },
    observedAvailability: { status: item.available === false ? 'sold_out' : 'available', label: item.available === false ? '采集时售罄' : '采集时可选', realtime: false },
    verifiedVolume: item.volume ?? null,
  })),
  ...BRAND_COLLECTION.map(item => ({
    id: item.id, name: item.name, kind: 'brand-product', category: item.category,
    price: { amount: item.price, currency: 'CNY', kind: 'regular', startingPrice: false },
    source: { name: item.source.source, storeName: item.source.storeName, observedAt: item.source.observedAt, scope: item.source.scope },
    observedAvailability: { status: 'unknown', label: '售卖状态待确认', realtime: false },
    verifiedVolume: null,
  })),
];
if (new Set(catalogItems.map(item => item.id)).size !== catalogItems.length || new Set(catalogItems.map(item => item.name)).size !== catalogItems.length) {
  throw new Error('目录存在重复商品 ID 或名称，无法明确关联截图。');
}
const catalogNames = new Set(catalogItems.map(item => item.name));
const products = catalogItems.map(item => {
  const screenshots = screenshotsByName.get(item.name) ?? [];
  return { ...item, screenshotStatus: screenshots.some(image => image.status === 'available') ? 'available' : 'pending', screenshots, screenshotNote: screenshots.some(image => image.status === 'available') ? '小程序窗口截图，按 viewport 显示商品区域；原截图保留不变。' : '商品详情截图待补；未将其他商品或示意图冒充本商品图。' };
});
const archive = {
  schemaVersion: 2,
  generatedAt: new Date().toISOString(),
  screenshotIndex: '商品截图索引.json',
  promotionIndex,
  source: { storeName: OFFICIAL_CATALOG.storeName, observedAt: OFFICIAL_CATALOG.observedAt, scope: 'store-menu', realtime: false },
  notes: [
    '商品详情图为 828 × 1560 小程序窗口截图，宣传图另按各自索引与实际文件记录尺寸；均非原始设计稿。显示时仅改变 SVG 视窗，未编辑原截图。',
    '名称、分类、普通价及起价来自本次门店目录快照；并非实时库存，也不能代表其他门店。',
    '茶饮状态记录采集时所见，非饮品的当前售卖状态未知。完整配料、规格及功效不由图片推断。',
    '素材覆盖以生成时读取的商品截图索引为准；新增截图后需重新运行归档脚本。',
    '截图日期按各自索引 observedAt 保存，旧条目未填写时默认为 2026-10-09；菜单资料的核对日期独立保留。',
    '宣传图只作为独立品牌主题资料，其中海报价格不能覆盖门店菜单普通价，也不计入商品图片覆盖数量。',
  ],
  summary: {
    products: products.length,
    drinks: products.filter(item => item.kind === 'drink').length,
    brandProducts: products.filter(item => item.kind === 'brand-product').length,
    withProductScreenshot: products.filter(item => item.screenshotStatus === 'available').length,
    awaitingProductScreenshot: products.filter(item => item.screenshotStatus === 'pending').length,
    indexedScreenshots: manifest.length,
    promotionalImages: promotions.length,
    indexedPromotions: promotionManifest.length,
  },
  products,
  promotions,
  indexWarnings,
  promotionWarnings,
  unmatchedScreenshots: [...screenshotsByName.entries()].filter(([name]) => !catalogNames.has(name)).map(([name, screenshots]) => ({ name, screenshots })),
};
const categories = [...new Set(products.map(item => item.category))];
const countByCategory = category => products.filter(item => item.category === category).length;

function productCard(product) {
  const image = product.screenshots.find(item => item.status === 'available');
  const picture = image
    ? `<a class="picture" href="${escapeHtml(localUrl(image.relativePath))}" target="_blank" rel="noopener" aria-label="查看${escapeHtml(product.name)}的完整原截图"><svg xmlns="http://www.w3.org/2000/svg" viewBox="${image.viewport.x} ${image.viewport.y} ${image.viewport.width} ${image.viewport.height}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="${escapeHtml(product.name)}的官方商品图区域"><defs><clipPath id="image-${escapeHtml(product.id)}"><rect x="${image.viewport.x}" y="${image.viewport.y}" width="${image.viewport.width}" height="${image.viewport.height}" /></clipPath></defs><image href="${escapeHtml(localUrl(image.relativePath))}" x="0" y="0" width="${image.width}" height="${image.height}" clip-path="url(#image-${escapeHtml(product.id)})" /></svg><span class="image-label">官方小程序截图 ↗</span></a>`
    : '<div class="picture pending-picture"><span class="flower" aria-hidden="true">✳</span><span>商品截图待补</span><small>JICUI JASMINE</small></div>';
  const imageLinks = product.screenshots.filter(item => item.status === 'available').map((item, index) => `<a href="${escapeHtml(localUrl(item.relativePath))}" target="_blank" rel="noopener">${index === 0 ? '查看完整原截图' : `原截图 ${index + 1}`} ↗ <span>${escapeHtml(item.observedAt)}</span></a>`).join('');
  return `<article class="product" data-name="${escapeHtml(product.name)}" data-category="${escapeHtml(product.category)}" data-image="${product.screenshotStatus}">${picture}<div class="card-body"><p class="category">${escapeHtml(product.category)}</p><h2>${escapeHtml(product.name)}</h2><p class="price"><small>¥</small>${product.price.amount}${product.price.startingPrice ? '<span>起</span>' : ''}</p><p class="price-note">门店普通参考价${product.price.startingPrice ? ' · 随规格变动' : ''}</p><p class="availability ${product.observedAvailability.status}">${product.observedAvailability.label}</p><p class="source">${escapeHtml(product.source.storeName)}<br>${escapeHtml(product.source.observedAt)} · 门店目录快照</p><div class="links">${imageLinks || '<span>暂无可用商品详情截图</span>'}</div></div></article>`;
}

function promotionCard(promotion, index) {
  const viewport = promotion.viewport;
  return `<article class="promotion"><a class="promotion-image" href="${escapeHtml(localUrl(promotion.relativePath))}" target="_blank" rel="noopener" aria-label="查看${escapeHtml(promotion.title)}完整宣传原图"><svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewport.x} ${viewport.y} ${viewport.width} ${viewport.height}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="${escapeHtml(promotion.title)}品牌主题图"><defs><clipPath id="promotion-${index}"><rect x="${viewport.x}" y="${viewport.y}" width="${viewport.width}" height="${viewport.height}" /></clipPath></defs><image href="${escapeHtml(localUrl(promotion.relativePath))}" x="0" y="0" width="${promotion.width}" height="${promotion.height}" clip-path="url(#promotion-${index})" /></svg></a><div class="card-body"><p class="category">独立品牌主题 · ${escapeHtml(promotion.observedAt)}</p><h2>${escapeHtml(promotion.title)}</h2><p class="promotion-subtitle">${escapeHtml(promotion.subtitle)}</p><a class="promotion-link" href="${escapeHtml(localUrl(promotion.relativePath))}" target="_blank" rel="noopener">查看完整宣传原图 ↗</a></div></article>`;
}
const promotionSection = promotions.length ? `<section class="promotion-section" aria-label="独立品牌主题素材"><div class="section-title"><h2>品牌主题素材</h2><span>${promotions.length} 张宣传图 · 独立归档</span></div><p class="promotion-note">以下宣传图作为品牌主题参考，不参与商品搜索和商品图片覆盖统计。海报中的活动价或展示价不替代目录普通价。</p><div class="promotion-grid">${promotions.map(promotionCard).join('')}</div></section>` : '';

const html = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="color-scheme" content="light">
<title>极萃东方茉莉 · 官方小程序素材总览</title>
<style>
:root{--paper:#f7f7ef;--green:#253b2d;--muted:#78816e;--line:#253b2d1a;--leaf:#dce6bd}*{box-sizing:border-box}body{margin:0;background:var(--paper);color:var(--green);font-family:-apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif}a{color:inherit;text-underline-offset:4px}button,input,select{font:inherit}header,main,footer{max-width:1280px;margin:auto;padding-left:32px;padding-right:32px}header{padding-top:54px}.eyebrow{font-size:10px;letter-spacing:.22em;color:var(--muted)}h1{margin:20px 0 18px;font:400 clamp(28px,4vw,48px)/1.4 "Songti SC",SimSun,serif;letter-spacing:.03em}.intro{max-width:900px;font-size:13px;line-height:1.95;color:var(--muted)}.stats{display:flex;flex-wrap:wrap;gap:8px;margin:24px 0}.stats span{border:1px solid var(--line);border-radius:30px;padding:10px 15px;font-size:11px}.stats b{font-size:14px;margin-right:4px}.source-note{padding:17px 20px;border-radius:18px;background:#eceee2;font-size:12px;line-height:1.9;margin:24px 0 28px}.filters{display:flex;gap:12px;flex-wrap:wrap;align-items:center;padding-bottom:20px;border-bottom:1px solid var(--line)}input[type=search],select{min-height:46px;border:1px solid var(--line);border-radius:24px;background:#fff;padding:10px 16px;color:var(--green);max-width:100%;font-size:14px}input[type=search]{flex:1;min-width:180px}select{max-width:280px}input:focus-visible,select:focus-visible,a:focus-visible{outline:2px solid #6f8c54;outline-offset:3px}.only-pending{display:flex;align-items:center;gap:7px;min-height:44px;font-size:12px;white-space:nowrap}.only-pending input{accent-color:var(--green);width:16px;height:16px}.results{display:flex;justify-content:space-between;gap:16px;align-items:center;margin:18px 0;font-size:12px;color:var(--muted)}.results a{white-space:nowrap}.grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:20px}.product{overflow:hidden;border-radius:24px;background:white;min-width:0}.product[hidden]{display:none}.picture{position:relative;display:flex;align-items:center;justify-content:center;aspect-ratio:1.03;overflow:hidden;background:#efeee5;text-decoration:none}.picture svg{display:block;width:100%;height:100%;overflow:hidden}.image-label{position:absolute;bottom:12px;right:12px;border-radius:18px;background:#ffffffd9;padding:6px 9px;font-size:9px;color:#66745f}.pending-picture{flex-direction:column;gap:10px;color:#8a957c;font-size:12px;background:linear-gradient(145deg,#ecefdf,#eee8dc)}.pending-picture:before{content:"";position:absolute;inset:16px;border:1px solid #78816e26;border-radius:16px}.pending-picture .flower{font-size:48px;font-weight:200;color:#879b72}.pending-picture small{font-size:8px;letter-spacing:.16em}.card-body{padding:20px}.category{margin:0 0 10px;font-size:10px;line-height:1.8;color:var(--muted)}h2{margin:0;min-height:2.9em;font:400 21px/1.45 "Songti SC",SimSun,serif;overflow-wrap:anywhere}.price{font-size:25px;margin:17px 0 5px;font-variant-numeric:tabular-nums}.price small{font-size:13px;margin-right:3px}.price span{font-size:11px;margin-left:5px}.price-note{font-size:10px;color:var(--muted);margin:0;line-height:1.8}.availability{display:inline-block;font-size:10px;line-height:1.5;background:#e9eedb;padding:5px 9px;border-radius:12px;margin:12px 0 0}.sold_out{background:#eee6d3;color:#826f4c}.unknown{background:#eff0eb;color:var(--muted)}.source{font-size:10px;color:var(--muted);line-height:1.9;margin:13px 0 0}.links{margin-top:14px;padding-top:13px;border-top:1px solid var(--line);display:flex;flex-wrap:wrap;gap:10px;font-size:10px}.links span{color:#9c9f91}.empty{padding:70px 20px;text-align:center;color:var(--muted);font-size:14px}footer{margin-top:40px;padding-top:24px;padding-bottom:40px;border-top:1px solid var(--line);font-size:11px;line-height:1.9;color:var(--muted)}noscript{display:block;background:#eee6d3;border-radius:15px;padding:14px;margin-bottom:20px;font-size:12px}@media(max-width:1000px){.grid{grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}}@media(max-width:700px){header,main,footer{padding-left:20px;padding-right:20px}header{padding-top:30px}.grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.card-body{padding:14px}h2{font-size:18px;min-height:4.35em}.image-label{font-size:8px;bottom:8px;right:7px;padding:4px 6px}.filters{gap:8px}input[type=search]{width:100%;flex-basis:100%;font-size:16px}select{font-size:16px;min-width:0;flex:1}.stats{gap:6px}.stats span{padding:8px 11px}.source-note{padding:14px;font-size:11px}.intro{font-size:12px}}@media(max-width:360px){header,main,footer{padding-left:14px;padding-right:14px}.card-body{padding:11px}h2{font-size:16px}.category{font-size:9px}.image-label{font-size:7px}.only-pending{font-size:11px}}
.promotion-section{margin:12px 0 38px;padding-bottom:32px;border-bottom:1px solid var(--line)}.section-title{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:10px}.section-title h2{min-height:0;font-size:29px}.section-title span,.promotion-note{font-size:12px;line-height:1.9;color:var(--muted)}.promotion-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:20px;margin-top:20px}.promotion{overflow:hidden;border-radius:24px;background:#fff}.promotion-image{display:block;aspect-ratio:1.15;background:#eeeee4;overflow:hidden}.promotion-image svg{display:block;width:100%;height:100%;overflow:hidden}.promotion h2{min-height:0;font-size:23px}.promotion-subtitle{font-size:12px;color:var(--muted);line-height:1.8;white-space:pre-wrap}.promotion-link{font-size:11px}.links a span{display:block;margin-top:3px;font-size:9px;color:var(--muted)}@media(max-width:700px){.promotion-grid{grid-template-columns:1fr;gap:16px}.section-title h2{font-size:25px}.promotion-section{margin-bottom:25px}.promotion .card-body{padding:18px}}
</style>
</head>
<body>
<header><p class="eyebrow">JICUI JASMINE · SOURCE COLLECTION</p><h1>极萃东方茉莉<br>官方小程序素材总览</h1><p class="intro">把商品资料与出处放在一起，方便核对、查找和后续设计使用。此页面可以直接在本地打开，不依赖服务器或外部资源。</p><div class="stats"><span><b>${archive.summary.products}</b>款目录商品</span><span><b>${archive.summary.withProductScreenshot}</b>款已关联商品截图</span><span><b>${archive.summary.awaitingProductScreenshot}</b>款截图待补</span><span><b>${archive.summary.promotionalImages}</b>张品牌主题图（独立）</span><span>${escapeHtml(OFFICIAL_CATALOG.observedAt)} · ${escapeHtml(OFFICIAL_CATALOG.storeName)}</span></div><div class="source-note">商品图为 <strong>828 × 1560 小程序窗口截图</strong>，宣传图另按各自索引记录尺寸，不是原始设计稿。卡片仅通过 SVG 视窗显示截图中的商品图区域，原截图未被编辑；点击图片可查看完整原图。图片采集日期分别保留，旧条目未注明时按 2026-10-09 记录。名称、分类、普通价及起价来自门店目录快照，<strong>并非实时库存</strong>。非饮品售卖状态未知，完整配料、规格和功效不由图片推断。</div></header>
<main>${promotionSection}<noscript>未启用 JavaScript，仍可浏览全部卡片和打开原截图；搜索与筛选需要启用 JavaScript。</noscript><div class="filters"><input id="search" type="search" placeholder="搜索商品名称或分类…" aria-label="搜索商品名称或分类"><select id="category" aria-label="筛选商品分类"><option value="">全部分类 · ${products.length}</option>${categories.map(category => `<option value="${escapeHtml(category)}">${escapeHtml(category)} · ${countByCategory(category)}</option>`).join('')}</select><label class="only-pending"><input id="pending" type="checkbox">只看待补图</label></div><div class="results"><p id="count" aria-live="polite">显示 ${products.length} 款商品</p><a href="${localUrl('商品资料.json')}" download>下载商品资料 JSON ↗</a></div><section class="grid" aria-label="商品素材目录">${products.map(productCard).join('\n')}</section><p id="empty" class="empty" hidden>没有找到匹配的商品，试试其他名称或分类。</p></main>
<footer>商品素材覆盖以本次读取的“商品截图索引.json”为准；品牌主题图使用可选的“宣传图索引.json”独立归档。新增截图后重新运行归档脚本，即可更新本页及“商品资料.json”。<br>茶饮 ${archive.summary.drinks} 款；茶礼、护肤与香氛 ${archive.summary.brandProducts} 款。原交付包中未在本店核对的其他记录不列入此素材目录。${indexWarnings.length ? `<br>有 ${indexWarnings.length} 条截图记录待修复，具体原因见商品资料 JSON 的 indexWarnings。` : ''}${promotionWarnings.length ? `<br>有 ${promotionWarnings.length} 条宣传图索引未通过核对，见商品资料 JSON 的 promotionWarnings。` : ''}${archive.unmatchedScreenshots.length ? `<br>有 ${archive.unmatchedScreenshots.length} 个索引名称尚未匹配目录，见商品资料 JSON 的 unmatchedScreenshots。` : ''}</footer>
<script>
const search = document.getElementById('search');
const category = document.getElementById('category');
const pending = document.getElementById('pending');
const cards = [...document.querySelectorAll('.product')];
function filterProducts() {
  const query = search.value.trim().toLocaleLowerCase();
  let visible = 0;
  for (const card of cards) {
    const matches = (!query || (card.dataset.name + ' ' + card.dataset.category).toLocaleLowerCase().includes(query)) && (!category.value || card.dataset.category === category.value) && (!pending.checked || card.dataset.image === 'pending');
    card.hidden = !matches;
    if (matches) visible++;
  }
  document.getElementById('count').textContent = '显示 ' + visible + ' / ' + cards.length + ' 款商品';
  document.getElementById('empty').hidden = visible !== 0;
}
search.addEventListener('input', filterProducts);
category.addEventListener('change', filterProducts);
pending.addEventListener('change', filterProducts);
filterProducts();
</script>
</body></html>
`;
await writeFile(join(archiveDirectory, '商品资料.json'), `${JSON.stringify(archive, null, 2)}\n`);
await writeFile(join(archiveDirectory, '素材总览.html'), html);
console.log(JSON.stringify({ directory: archiveDirectory, ...archive.summary, indexWarnings: indexWarnings.length, promotionWarnings: promotionWarnings.length, unmatchedScreenshots: archive.unmatchedScreenshots.length }, null, 2));
