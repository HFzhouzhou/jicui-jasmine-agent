/** Non-drink products transcribed from the store's visible mini-program catalog. */
export const BRAND_COLLECTION_SOURCE = {
  source: '极萃东方茉莉微信小程序 · 门店点单目录',
  storeName: '中华茉莉园店',
  observedAt: '2026-10-09',
  scope: 'store-menu',
  priceKind: 'regular',
} as const;

export const BRAND_COLLECTION_CATEGORIES = ['东方茶礼', '媚媚花语（茉莉护肤）'] as const;

export interface BrandCollectionItem {
  id: string;
  name: string;
  price: number;
  category: typeof BRAND_COLLECTION_CATEGORIES[number];
  source: typeof BRAND_COLLECTION_SOURCE;
  /** Local evidence file names only; the private screenshots are not public web assets. */
  evidenceScreenshots: string[];
}

const gift = (id: string, name: string, price: number, ...evidenceScreenshots: string[]): BrandCollectionItem => ({id, name, price, category: '东方茶礼', source: BRAND_COLLECTION_SOURCE, evidenceScreenshots});
const fragrance = (id: string, name: string, price: number, ...evidenceScreenshots: string[]): BrandCollectionItem => ({id, name, price, category: '媚媚花语（茉莉护肤）', source: BRAND_COLLECTION_SOURCE, evidenceScreenshots});

/** Keep outside Drink, menu recommendation, and dietary filtering. No cosmetic claims are inferred. */
export const BRAND_COLLECTION: BrandCollectionItem[] = [
  gift('gift_01', '茉莉凝香', 88, '07-东方茶礼上.png'),
  gift('gift_02', '茉香韵组合', 30, '07-东方茶礼上.png'),
  gift('gift_03', '枣香型原味六堡茶（紫筐）', 78, '07-东方茶礼上.png'),
  gift('gift_04', '蜜香型原味六堡茶（橙筐）', 68, '07-东方茶礼上.png', '08-东方茶礼中.png'),
  gift('gift_05', '茉莉白茶小方片', 19.9, '07-东方茶礼上.png', '08-东方茶礼中.png'),
  gift('gift_06', '周顺来小香包', 15, '08-东方茶礼中.png'),
  gift('gift_07', '茉莉飘雪', 198, '08-东方茶礼中.png', '09-东方茶礼下.png'),
  gift('gift_08', '茉莉六堡茶（礼盒）', 368, '08-东方茶礼中.png', '09-东方茶礼下.png'),
  gift('gift_09', '朝朝暮暮', 68, '09-东方茶礼下.png', '10-东方茶礼续.png'),
  gift('gift_10', '茉香六堡', 39.9, '09-东方茶礼下.png', '10-东方茶礼续.png'),
  gift('gift_11', '茉莉香雪', 128, '10-东方茶礼续.png', '11-茶礼包装茶.png'),
  gift('gift_12', '茉莉香芽', 58, '10-东方茶礼续.png', '11-茶礼包装茶.png'),
  gift('gift_13', '茉莉曲毫（100g夹链袋）', 30, '10-东方茶礼续.png', '11-茶礼包装茶.png'),
  gift('gift_14', '冷泡茉莉花茶', 29.9, '11-茶礼包装茶.png', '12-茶礼包装茶续.png'),
  gift('gift_15', '茉莉香毫（100g夹链袋）', 30, '11-茶礼包装茶.png', '12-茶礼包装茶续.png'),
  gift('gift_16', '茉莉香螺（100g夹链袋）', 25, '12-茶礼包装茶续.png'),
  gift('gift_17', '茉莉花茶（100g夹链袋）', 25, '12-茶礼包装茶续.png', '13-茶礼花干.png'),
  gift('gift_18', '茉莉红玉螺', 98, '12-茶礼包装茶续.png', '13-茶礼花干.png'),
  gift('gift_19', '茉莉花干', 28, '13-茶礼花干.png', '14-茶礼散茶.png'),
  gift('gift_20', '周茉留香', 118, '13-茶礼花干.png', '14-茶礼散茶.png'),
  gift('gift_21', '周茉红韵', 78, '14-茶礼散茶.png'),
  gift('gift_22', '茉莉青茶', 68, '14-茶礼散茶.png'),
  gift('gift_23', '茉莉普洱茶', 68, '14-茶礼散茶.png', '15-茶礼末尾.png'),
  gift('gift_24', '茉莉红茶（100g夹链袋）', 25, '15-茶礼末尾.png'),
  gift('gift_25', '桂花乌龙', 68, '15-茶礼末尾.png'),
  gift('gift_26', '1886经典金罐', 169, '15-茶礼末尾.png'),
  fragrance('fragrance_01', '茉莉精油皂', 19.9, '06-茉莉护肤与香薰.png'),
  fragrance('fragrance_02', '茉莉说护手霜-天蓝色', 39.9, '06-茉莉护肤与香薰.png'),
  fragrance('fragrance_03', '盛夏香槟香薰', 68, '06-茉莉护肤与香薰.png'),
  fragrance('fragrance_04', '芳香如故香薰', 68, '06-茉莉护肤与香薰.png'),
  fragrance('fragrance_05', '初雪之夜香薰', 68, '06-茉莉护肤与香薰.png', '16-香氛护肤续.png'),
  fragrance('fragrance_06', '茉莉水润护手霜', 48, '16-香氛护肤续.png'),
  fragrance('fragrance_07', '茉莉清梦香水-绿盒', 68, '16-香氛护肤续.png'),
  fragrance('fragrance_08', '茉莉花开方形香包', 19.9, '16-香氛护肤续.png', '17-香氛护肤末尾.png'),
  fragrance('fragrance_09', '茉莉植萃液', 78, '16-香氛护肤续.png', '17-香氛护肤末尾.png'),
  fragrance('fragrance_10', '茉莉身体乳', 49.9, '17-香氛护肤末尾.png'),
];
