/** Manually observed in the brand's WeChat mini-program. No inferred recipe data. */
export interface CatalogObservation {
  id: string;
  name: string;
  price: number;
  category: string;
  startingPrice?: boolean;
  volume?: string;
  available?: boolean;
}

export interface OfficialCatalogBatch {
  batchId: string;
  source: string;
  storeName: string;
  observedAt: string;
  items: CatalogObservation[];
}

export const OFFICIAL_CATALOG: OfficialCatalogBatch = {
  batchId: 'zhonghua-jasmine-garden-2026-10-09-store-menu-24-v2',
  source: '极萃东方茉莉微信小程序 · 门店点单目录与商品详情（普通价，非会员价）',
  storeName: '中华茉莉园店',
  observedAt: '2026-10-09',
  items: [
    {id: 'p10', name: '东方茉莉白', price: 13, category: '招牌鲜奶茶', startingPrice: true, volume: '中杯500cc / 大杯650cc'},
    {id: 'm18', name: '六堡染赤霞', price: 16, category: '招牌鲜奶茶', startingPrice: true, volume: '中杯500cc / 大杯650cc'},
    {id: 'p01', name: '茉莉冷萃水', price: 4, category: '招牌鲜奶茶', volume: '截图所见：中杯500cc'},
    {id: 'o01', name: '茉莉烟雨龙井', price: 16, category: '招牌鲜奶茶', startingPrice: true, volume: '中杯500cc / 大杯650cc'},
    {id: 'c03', name: '芒芒椰椰', price: 16, category: '茉莉鲜果', volume: '截图所见：大杯650cc'},
    {id: 'c04', name: '鲜芒芒果香奶昔', price: 16, category: '茉莉鲜果'},
    {id: 'f17', name: '陈皮咸柠茶', price: 16, category: '柠檬系列', volume: '截图所见：大杯650cc'},
    {id: 'f09', name: '茉莉凤鸣香柠茶', price: 11, category: '柠檬系列'},
    {id: 'f13', name: '百香果柠檬茶', price: 13, category: '柠檬系列', volume: '截图所见：大杯650cc'},
    {id: 't01', name: '招牌·大宋茉莉抹茶', price: 16, category: '茉莉抹茶', startingPrice: true, volume: '中杯500cc / 大杯650cc'},
    {id: 'm09', name: '青酪茉莉白', price: 16, category: '茉莉茶酪', volume: '截图所见：中杯500cc'},
    {id: 'm12', name: '琥珀生酪黑茶', price: 17, category: '茉莉茶酪', volume: '截图所见：中杯500cc'},
    {id: 'p14', name: '萃.琥珀六堡', price: 13, category: '茉莉茶酪', volume: '截图所见：中杯500cc'},
    {id: 'p05', name: '极萃·茉莉毛峰', price: 10, category: '原叶纯茶', volume: '截图所见：纯茶700cc'},
    {id: 'p09', name: '极萃·茉莉龙井', price: 10, category: '原叶纯茶', volume: '截图所见：大杯650cc'},
    {id: 'p07', name: '极萃·茉莉六堡', price: 10, category: '原叶纯茶', volume: '截图所见：大杯650cc'},
    {id: 'k03', name: '宋韵茉莉拿铁', price: 16, category: '现磨咖啡', startingPrice: true, available: false},
    {id: 'k04', name: '茉莉鸳鸯拿铁', price: 16, category: '现磨咖啡', startingPrice: true, available: false},
    {id: 'k01', name: '茉莉美式', price: 12, category: '现磨咖啡', startingPrice: true, available: false},
    {id: 'k05', name: '生椰拿铁', price: 16, category: '现磨咖啡', startingPrice: true, available: false},
    {id: 'wx_coffee_amber_latte', name: '琥珀生酪拿铁', price: 17, category: '现磨咖啡', startingPrice: true, available: false},
    {id: 'i03', name: '茉莉圣代', price: 3, category: '茉莉冰淇淋（仅限堂食）', available: false},
    {id: 'i01', name: '茉莉脆筒冰淇淋', price: 3, category: '茉莉冰淇淋（仅限堂食）', available: false},
    {id: 'i02', name: '茉莉脆筒冰淇淋（5元/2个）', price: 5, category: '茉莉冰淇淋（仅限堂食）', available: false},
  ],
};
