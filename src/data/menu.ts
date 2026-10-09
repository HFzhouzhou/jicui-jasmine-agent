// EXPORTS: IDrinkItem, MOCK_MENU, MENU_CATEGORIES

export interface IDrinkItem {
  id: string;
  name: string;
  nameEn: string;
  price: number;
  volume: string;
  category: string;
  tags: string[];
  description: string;
}

export const MENU_CATEGORIES = [
  '全部',
  '纯茶原叶',
  '鲜奶茶·轻乳茶',
  '果茶',
  '椰椰·奶昔',
  '咖啡·拿铁',
  '抹茶',
  '烧仙草',
  '果蔬能量瓶',
  '冰淇淋·小食',
  '其他特色',
];

export const MOCK_MENU: IDrinkItem[] = [
  // 纯茶·原叶
  { id: 'p01', name: '茉莉冷萃水', nameEn: 'Jasmine Cold Brew', price: 4, volume: '500ml', category: '纯茶原叶', tags: ['零卡', '清爽', '冷萃', '平价'], description: '横州茉莉花冷萃而成，零卡清爽，夏日解暑首选。' },
  { id: 'p02', name: '釜煮·茉莉精品红茶', nameEn: 'Pot-Brewed Jasmine Black Tea', price: 9, volume: '标准杯', category: '纯茶原叶', tags: ['温润', '红茶', '釜煮'], description: '传统釜煮工艺，茉莉花香融入温润红茶。' },
  { id: 'p03', name: '釜煮·茉莉普洱', nameEn: 'Pot-Brewed Jasmine Pu\'er', price: 9, volume: '标准杯', category: '纯茶原叶', tags: ['醇厚', '去腻', '普洱'], description: '茉莉窨制普洱生茶，醇厚回甘，饭后解腻佳品。' },
  { id: 'p04', name: '釜煮·茉莉六堡', nameEn: 'Pot-Brewed Jasmine Liubao', price: 9, volume: '标准杯', category: '纯茶原叶', tags: ['陈香', '六堡', '暖胃'], description: '广西六堡黑茶遇横州茉莉，陈香绵长，温润暖胃。' },
  { id: 'p05', name: '极萃·茉莉毛峰', nameEn: 'Jasmine Maofeng Supreme', price: 10, volume: '700ml', category: '纯茶原叶', tags: ['清雅', '毛峰', '大容量'], description: '茉莉毛峰清雅高扬，700ml 大容量畅饮。' },
  { id: 'p06', name: '极萃·金俊眉雪', nameEn: 'Jin Jun Mei Snow Supreme', price: 10, volume: '标准杯', category: '纯茶原叶', tags: ['金骏眉', '蜜香'], description: '金骏眉蜜香馥郁，茶汤如金汤映雪。' },
  { id: 'p07', name: '极萃·茉莉六堡', nameEn: 'Jasmine Liubao Supreme', price: 10, volume: '650ml', category: '纯茶原叶', tags: ['六堡黑茶', '陈香'], description: '六堡黑茶陈香与茉莉花香交融，回味悠长。' },
  { id: 'p08', name: '极萃·兰香单丛', nameEn: 'Orchid Dancong Supreme', price: 10, volume: '700ml', category: '纯茶原叶', tags: ['单丛', '兰花香'], description: '凤凰单丛的兰花香与茉莉花香交织，层次丰富。' },
  { id: 'p09', name: '极萃·茉莉龙井', nameEn: 'Jasmine Longjing Supreme', price: 10, volume: '650ml', category: '纯茶原叶', tags: ['龙井', '豆香'], description: '西湖龙井豆香与茉莉花香相遇，清新雅致。' },
  { id: 'p10', name: '东方茉莉白', nameEn: 'Oriental Jasmine White', price: 13, volume: '500-650ml', category: '纯茶原叶', tags: ['招牌', '茉莉白茶', '清香'], description: '招牌茉莉白茶，汤色清亮，花香入茶骨，清香雅韵。' },
  { id: 'p11', name: '东方胭脂红', nameEn: 'Oriental Rouge Red', price: 13, volume: '500-650ml', category: '纯茶原叶', tags: ['胭脂红茶', '明艳'], description: '胭脂红茶明艳动人，茉莉香气萦绕其间。' },
  { id: 'p12', name: '萃·青酪茉莉', nameEn: 'Jasmine Green Cheese', price: 13, volume: '500ml', category: '纯茶原叶', tags: ['茉莉', '轻酪', '微乳'], description: '茉莉清茶覆一层轻酪奶盖，微乳感恰到好处。' },
  { id: 'p13', name: '萃·青酪红茶', nameEn: 'Black Tea Green Cheese', price: 13, volume: '500ml', category: '纯茶原叶', tags: ['红茶', '轻酪'], description: '红茶底配轻酪奶盖，茶香奶香两相宜。' },
  { id: 'p14', name: '萃·琥珀六堡', nameEn: 'Amber Liubao Cheese', price: 13, volume: '500ml', category: '纯茶原叶', tags: ['六堡', '轻酪'], description: '琥珀色六堡茶汤配轻酪，醇厚丝滑。' },
  { id: 'p15', name: '东方茉莉白「联名款」', nameEn: 'Oriental Jasmine White - Collab', price: 14, volume: '标准杯', category: '纯茶原叶', tags: ['联名', '招牌', '颜值款'], description: '联名限定款东方茉莉白，收藏级包装。' },
  { id: 'p16', name: '东方胭脂红「联名款」', nameEn: 'Oriental Rouge Red - Collab', price: 14, volume: '标准杯', category: '纯茶原叶', tags: ['联名', '红茶', '颜值款'], description: '联名限定款东方胭脂红，独具收藏意义。' },

  // 鲜奶茶·轻乳茶·酪
  { id: 'm01', name: '老盐鸭屎鲜乳茶', nameEn: 'Old Salt Duck Shit Fresh Milk Tea', price: 15, volume: '标准杯', category: '鲜奶茶·轻乳茶', tags: ['鸭屎香', '老盐', '微咸'], description: '鸭屎香单丛茶底配鲜牛乳，老盐点缀微咸风味。' },
  { id: 'm02', name: '老盐鸭屎香鲜乳茶', nameEn: 'Old Salt Ya Shi Xiang Milk Tea', price: 15, volume: '标准杯', category: '鲜奶茶·轻乳茶', tags: ['鸭屎香', '老盐', '奶香'], description: '经典鸭屎香鲜乳茶，老盐提味层次丰富。' },
  { id: 'm03', name: '茉莉六堡鲜奶茶', nameEn: 'Jasmine Liubao Fresh Milk Tea', price: 16, volume: '标准杯', category: '鲜奶茶·轻乳茶', tags: ['六堡茶底', '鲜奶'], description: '六堡黑茶陈香配鲜牛乳，醇厚温润。' },
  { id: 'm04', name: '茉莉红茶黑糖珍珠小黄姜', nameEn: 'Jasmine Black Tea Brown Sugar Pearl Ginger', price: 16, volume: '标准杯', category: '鲜奶茶·轻乳茶', tags: ['黑糖珍珠', '小黄姜', '暖身'], description: '茉莉红茶底配黑糖珍珠与小黄姜，暖身暖心。' },
  { id: 'm05', name: '茉莉黑茶黑糖珍珠小黄姜', nameEn: 'Jasmine Dark Tea Brown Sugar Pearl Ginger', price: 18, volume: '标准杯', category: '鲜奶茶·轻乳茶', tags: ['黑茶', '暖身', '顶饱'], description: '黑茶底配黑糖珍珠小黄姜，料足顶饱，冬日暖饮。' },
  { id: 'm06', name: '茉莉柠檬轻乳茶', nameEn: 'Jasmine Lemon Light Milk Tea', price: 15, volume: '标准杯', category: '鲜奶茶·轻乳茶', tags: ['柠檬', '轻乳', '清爽奶香'], description: '茉莉清茶遇柠檬与轻乳，清爽奶香不腻口。' },
  { id: 'm07', name: '茉莉西瓜轻乳茶', nameEn: 'Jasmine Watermelon Light Milk Tea', price: 16, volume: '标准杯', category: '鲜奶茶·轻乳茶', tags: ['西瓜', '果香', '轻乳'], description: '夏日西瓜果香融合轻乳茶，清甜解暑。' },
  { id: 'm08', name: '青酪龙井白', nameEn: 'Longjing White Green Cheese', price: 17, volume: '500ml', category: '鲜奶茶·轻乳茶', tags: ['龙井', '酪', '清雅'], description: '龙井茶底配青酪芝士，清雅丝滑。' },
  { id: 'm09', name: '青酪茉莉白', nameEn: 'Jasmine White Green Cheese', price: 16, volume: '500ml', category: '鲜奶茶·轻乳茶', tags: ['茉莉', '酪'], description: '茉莉白茶底覆青酪，花香奶香交织。' },
  { id: 'm10', name: '兰雪凝月白', nameEn: 'Orchid Snow Moonlight White', price: 15, volume: '标准杯', category: '鲜奶茶·轻乳茶', tags: ['奶香如雪', '颜值高', '颜值款'], description: '奶沫如雪似月，颜值与口感并存的诗意之作。' },
  { id: 'm11', name: '茉莉香奈奈', nameEn: 'Jasmine Chantilly', price: 16, volume: '标准杯', category: '鲜奶茶·轻乳茶', tags: ['香甜', '女生喜爱'], description: '茉莉花香与香甜奶沫，女生最爱。' },
  { id: 'm12', name: '琥珀生酪黑茶', nameEn: 'Amber Raw Cheese Dark Tea', price: 17, volume: '500ml', category: '鲜奶茶·轻乳茶', tags: ['厚酪', '黑茶'], description: '琥珀色黑茶汤底配厚酪，浓郁满足。' },
  { id: 'm13', name: '琥珀生酪胭脂红', nameEn: 'Amber Raw Cheese Rouge Red', price: 15, volume: '标准杯', category: '鲜奶茶·轻乳茶', tags: ['胭脂红', '生酪', '颜值款'], description: '胭脂红茶底配生酪，红润气色。' },
  { id: 'm14', name: '荔枝椰椰酪', nameEn: 'Lychee Coconut Cheese', price: 19, volume: '标准杯', category: '鲜奶茶·轻乳茶', tags: ['荔枝', '椰', '酪', '浓郁'], description: '荔枝清甜配椰乳与芝士酪，三重浓郁。' },
  { id: 'm15', name: '茉莉碎玉酪', nameEn: 'Jasmine Jade Shard Cheese', price: 17, volume: '标准杯', category: '鲜奶茶·轻乳茶', tags: ['茉莉', '酪'], description: '茉莉茶底配碎玉般的奶冻与酪，口感丰富。' },
  { id: 'm16', name: '青岚碎玉酪', nameEn: 'Misty Jade Shard Cheese', price: 17, volume: '标准杯', category: '鲜奶茶·轻乳茶', tags: ['绿茶', '酪'], description: '青岚绿茶底配碎玉奶冻，清新鲜活。' },
  { id: 'm17', name: '苦咖碎玉酪', nameEn: 'Bitter Coffee Jade Shard Cheese', price: 20, volume: '标准杯', category: '鲜奶茶·轻乳茶', tags: ['咖啡', '酪', '苦甜'], description: '意式咖啡苦香配甜酪，苦甜交织。' },
  { id: 'm18', name: '六堡染赤霞', nameEn: 'Liubao Rouge Sunset', price: 16, volume: '标准杯', category: '鲜奶茶·轻乳茶', tags: ['六堡', '分层颜值', '颜值款'], description: '六堡黑茶与牛乳分层如赤霞染天，视觉味觉双重享受。' },

  // 果茶
  { id: 'f01', name: '柠珀黄皮茶', nameEn: 'Amber Wampee Lemon Tea', price: 15, volume: '标准杯', category: '果茶', tags: ['黄皮', '岭南果', '微甘'], description: '岭南特产黄皮果配柠檬茶，微甘回味。' },
  { id: 'f02', name: '盐津黄皮露', nameEn: 'Salted Wampee Nectar', price: 16, volume: '标准杯', category: '果茶', tags: ['黄皮', '盐津', '开胃'], description: '盐津黄皮清爽开胃，夏日解暑圣品。' },
  { id: 'f03', name: '金玉黄皮果蔬浆', nameEn: 'Golden Jade Wampee Smoothie', price: 19, volume: '标准杯', category: '果茶', tags: ['黄皮果蔬', '浓浆'], description: '黄皮果蔬浓浆，金玉满堂般的浓郁口感。' },
  { id: 'f04', name: '茉莉荔枝白', nameEn: 'Jasmine Lychee White', price: 15, volume: '标准杯', category: '果茶', tags: ['荔枝', '清甜', '夏日'], description: '茉莉白茶底配鲜荔枝，清甜夏日滋味。' },
  { id: 'f05', name: '苍梧荔枝红', nameEn: 'Cangwu Lychee Red', price: 15, volume: '标准杯', category: '果茶', tags: ['荔枝', '红茶底'], description: '苍梧荔枝遇红茶底，果香茶韵。' },
  { id: 'f06', name: '梅隐芭乐柠茶', nameEn: 'Plum Guava Lemon Tea', price: 17, volume: '标准杯', category: '果茶', tags: ['芭乐', '柠檬', '话梅'], description: '芭乐清甜遇柠檬酸爽，话梅提味层次丰富。' },
  { id: 'f07', name: '水牛乳芭乐冰酥', nameEn: 'Buffalo Milk Guava Ice Slush', price: 19, volume: '标准杯', category: '果茶', tags: ['芭乐冰沙', '水牛乳', '颜值款'], description: '水牛乳配芭乐冰沙，绵密香甜。' },
  { id: 'f08', name: '茉莉巨无霸鲜果茶', nameEn: 'Jasmine Mega Fruit Tea', price: 16, volume: '1000ml', category: '果茶', tags: ['超大杯', '多鲜果', '分享装'], description: '1000ml 超大杯，多种鲜果汇聚，分享快乐。' },
  { id: 'f09', name: '茉莉凤鸣香柠茶', nameEn: 'Jasmine Phoenix Lemon Tea', price: 11, volume: '标准杯', category: '果茶', tags: ['平价', '香柠', '解腻'], description: '平价之选，香柠解腻，茉莉留香。' },
  { id: 'f10', name: '霸气凤梨百香果', nameEn: 'Pineapple Passion Fruit Blast', price: 14, volume: '标准杯', category: '果茶', tags: ['凤梨', '百香果', '酸甜'], description: '凤梨与百香果霸气相遇，酸甜浓郁。' },
  { id: 'f11', name: '老盐柠檬茶', nameEn: 'Old Salt Lemon Tea', price: 13, volume: '650ml', category: '果茶', tags: ['老盐', '补盐', '解暑'], description: '老盐柠檬水，夏日补盐解暑必备。' },
  { id: 'f12', name: '鸭屎霸香柠檬茶', nameEn: 'Duck Shit Lemon Tea Supreme', price: 13, volume: '标准杯', category: '果茶', tags: ['鸭屎香', '柠檬', '茶感强'], description: '鸭屎香单丛茶底配柠檬，茶感强劲回甘。' },
  { id: 'f13', name: '百香果柠檬茶', nameEn: 'Passion Fruit Lemon Tea', price: 13, volume: '650ml', category: '果茶', tags: ['百香果', '柠檬'], description: '百香果与柠檬的经典组合，酸甜开胃。' },
  { id: 'f14', name: '凤梨咸柠茶', nameEn: 'Pineapple Salted Lemon Tea', price: 14, volume: '650ml', category: '果茶', tags: ['凤梨', '咸柠'], description: '凤梨香甜配咸柠，咸甜交织层次丰富。' },
  { id: 'f15', name: '冰鲜柠檬水', nameEn: 'Iced Fresh Lemonade', price: 7, volume: '650ml', category: '果茶', tags: ['极致平价', '清爽'], description: '7 元极致平价，清爽柠檬水，夏日必点。' },
  { id: 'f16', name: '话梅柠檬水', nameEn: 'Preserved Plum Lemonade', price: 8, volume: '650ml', category: '果茶', tags: ['话梅', '生津'], description: '话梅生津止渴，配柠檬更添风味。' },
  { id: 'f17', name: '陈皮咸柠茶', nameEn: 'Citrus Peel Salted Lemon Tea', price: 16, volume: '650ml', category: '果茶', tags: ['陈皮', '理气养生'], description: '新会陈皮配咸柠檬，理气养生之选。' },
  { id: 'f18', name: '山野芭乐茉莉', nameEn: 'Wild Guava Jasmine', price: 20, volume: '标准杯', category: '果茶', tags: ['芭乐', '茉莉', '山野鲜果'], description: '山野芭乐的自然清甜与茉莉花香交融。' },
  { id: 'f19', name: '海棠金穗·菠萝芭乐', nameEn: 'Begonia Gold - Pineapple Guava', price: 19, volume: '标准杯', category: '果茶', tags: ['菠萝芭乐', '金秋限定', '颜值款'], description: '金秋限定款，菠萝与芭乐共谱丰收乐章。' },

  // 椰椰·奶昔
  { id: 'c01', name: '柠檬椰椰', nameEn: 'Lemon Coconut Delight', price: 15, volume: '650ml', category: '椰椰·奶昔', tags: ['柠檬', '椰乳'], description: '清新柠檬配醇香椰乳，夏日清爽。' },
  { id: 'c02', name: '西瓜椰椰', nameEn: 'Watermelon Coconut Delight', price: 16, volume: '650ml', category: '椰椰·奶昔', tags: ['西瓜', '椰乳', '颜值款'], description: '西瓜清甜遇椰乳绵密，双重享受。' },
  { id: 'c03', name: '芒芒椰椰', nameEn: 'Mango Coconut Delight', price: 16, volume: '650ml', category: '椰椰·奶昔', tags: ['芒果', '椰乳'], description: '芒果香甜配椰乳丝滑，经典搭配。' },
  { id: 'c04', name: '鲜芒芒果香奶昔', nameEn: 'Fresh Mango Frappe', price: 16, volume: '标准杯', category: '椰椰·奶昔', tags: ['芒果奶昔', '绵密'], description: '鲜芒果打制绵密奶昔，一口夏天。' },
  { id: 'c05', name: '甜嘻嘻西瓜奶昔', nameEn: 'Sweetie Watermelon Frappe', price: 16, volume: '标准杯', category: '椰椰·奶昔', tags: ['西瓜奶昔', '甜', '颜值款'], description: '甜嘻嘻的西瓜奶昔，少女心满满。' },

  // 咖啡·拿铁
  { id: 'k01', name: '茉莉美式', nameEn: 'Jasmine Americano', price: 12, volume: '标准杯', category: '咖啡·拿铁', tags: ['茉莉花香', '低卡提神', '平价'], description: '茉莉花香融入意式美式，低卡提神平价之选。' },
  { id: 'k02', name: '话梅美式', nameEn: 'Plum Americano', price: 13, volume: '标准杯', category: '咖啡·拿铁', tags: ['话梅', '生津提神'], description: '话梅酸甜与美式咖啡碰撞，生津提神。' },
  { id: 'k03', name: '宋韵茉莉拿铁', nameEn: 'Song Dynasty Jasmine Latte', price: 16, volume: '标准杯', category: '咖啡·拿铁', tags: ['茉莉拿铁', '宋韵文化感'], description: '宋韵风雅与茉莉拿铁的完美结合，文化感十足。' },
  { id: 'k04', name: '茉莉鸳鸯拿铁', nameEn: 'Jasmine Yuanyang Latte', price: 16, volume: '标准杯', category: '咖啡·拿铁', tags: ['茶+咖啡', '双重提神'], description: '茉莉茶与咖啡鸳鸯配，双重提神功效。' },
  { id: 'k05', name: '生椰拿铁', nameEn: 'Coconut Latte', price: 16, volume: '标准杯', category: '咖啡·拿铁', tags: ['椰香拿铁', '丝滑'], description: '厚椰乳配意式浓缩，丝滑椰香拿铁。' },
  { id: 'k06', name: '姜姜拿铁', nameEn: 'Ginger Latte', price: 17, volume: '标准杯', category: '咖啡·拿铁', tags: ['姜味', '暖身提神'], description: '小黄姜配咖啡拿铁，暖身又提神。' },
  { id: 'k07', name: '抹茶咖啡拿铁', nameEn: 'Matcha Coffee Latte', price: 16, volume: '500ml', category: '咖啡·拿铁', tags: ['抹茶', '咖啡'], description: '日式抹茶与意式咖啡的东西方融合。' },
  { id: 'k08', name: '抹茶生椰拿铁', nameEn: 'Matcha Coconut Latte', price: 16, volume: '500ml', category: '咖啡·拿铁', tags: ['抹茶', '生椰', '颜值款'], description: '抹茶清香配生椰拿铁，层次丰富。' },
  { id: 'k09', name: '抹茶牛乳拿铁', nameEn: 'Matcha Milk Latte', price: 16, volume: '500ml', category: '咖啡·拿铁', tags: ['抹茶', '牛乳', '颜值款'], description: '日式抹茶配鲜牛乳，抹茶控必点。' },
  { id: 'k10', name: '抹茶珍珠生椰', nameEn: 'Matcha Pearl Coconut', price: 15, volume: '500ml', category: '咖啡·拿铁', tags: ['抹茶', '珍珠', '生椰', '颜值款'], description: '抹茶生椰加 Q 弹珍珠，口感升级。' },
  { id: 'k11', name: '抹茶珍珠牛乳', nameEn: 'Matcha Pearl Milk', price: 16, volume: '500ml', category: '咖啡·拿铁', tags: ['抹茶', '珍珠', '牛乳'], description: '抹茶牛乳配珍珠，经典网红款。' },

  // 抹茶
  { id: 't01', name: '招牌·大宋茉莉抹茶', nameEn: 'Signature Song Dynasty Jasmine Matcha', price: 16, volume: '标准杯', category: '抹茶', tags: ['宋韵抹茶', '茉莉', '招牌'], description: '宋韵点茶技艺，茉莉花香融入抹茶，招牌之作。' },

  // 烧仙草
  { id: 's01', name: '招牌烧仙草', nameEn: 'Signature Grass Jelly', price: 16, volume: '标准杯', category: '烧仙草', tags: ['多料', '经典'], description: '招牌烧仙草，芋圆、红豆、珍珠多料汇聚。' },
  { id: 's02', name: '茉莉烧仙草', nameEn: 'Jasmine Grass Jelly', price: 17, volume: '650ml', category: '烧仙草', tags: ['茉莉风味', '料足'], description: '茉莉茶底烧仙草，料足味美，650ml 大满足。' },
  { id: 's03', name: '佛跳墙烧仙草', nameEn: 'Buddha Jumps Over Wall Grass Jelly', price: 16, volume: '标准杯', category: '烧仙草', tags: ['豪华多料', '名字有记忆点'], description: '豪华多料烧仙草，料多如佛跳墙般丰盛。' },
  { id: 's04', name: '姜茶烧仙草', nameEn: 'Ginger Tea Grass Jelly', price: 17, volume: '标准杯', category: '烧仙草', tags: ['姜茶底', '暖身'], description: '姜茶汤底烧仙草，冬日暖身甜品。' },

  // 其他特色
  { id: 'o01', name: '茉莉烟雨龙井', nameEn: 'Jasmine Misty Rain Longjing', price: 16, volume: '标准杯', category: '其他特色', tags: ['烟雨意境', '龙井', '颜值', '颜值款'], description: '烟雨蒙蒙的江南意境，龙井与茉莉的诗意邂逅。' },
  { id: 'o02', name: '茉莉烟雨龙井「联名款」', nameEn: 'Jasmine Misty Rain Longjing - Collab', price: 17, volume: '标准杯', category: '其他特色', tags: ['联名', '限定', '颜值款'], description: '联名限定款茉莉烟雨龙井，诗意收藏。' },

  // 果蔬能量瓶
  { id: 'v01', name: '姜柠菠萝能量瓶', nameEn: 'Ginger Lemon Pineapple Energy Bottle', price: 20, volume: '标准瓶', category: '果蔬能量瓶', tags: ['姜', '菠萝', '能量补充'], description: '小黄姜配柠檬菠萝，补充能量活力满满。' },
  { id: 'v02', name: '羽衣甘蓝纤体瓶', nameEn: 'Kale Slimming Bottle', price: 20, volume: '标准瓶', category: '果蔬能量瓶', tags: ['羽衣甘蓝', '纤体低卡', '健身'], description: '羽衣甘蓝为主的绿色能量，纤体低卡健身首选。' },
  { id: 'v03', name: '超A胡萝卜活力瓶', nameEn: 'Vitamin A Carrot Vitality Bottle', price: 20, volume: '标准瓶', category: '果蔬能量瓶', tags: ['胡萝卜', '维A活力'], description: '胡萝卜富含维A，活力养颜。' },
  { id: 'v04', name: '红菜头美颜瓶', nameEn: 'Beetroot Beauty Bottle', price: 20, volume: '标准瓶', category: '果蔬能量瓶', tags: ['红菜头', '美颜气色'], description: '红菜头补气血，美颜好气色。' },

  // 冰淇淋小食
  { id: 'i01', name: '茉莉脆筒冰淇淋', nameEn: 'Jasmine Cone Ice Cream', price: 3, volume: '单支', category: '冰淇淋·小食', tags: ['平价', '茉莉花香'], description: '3 元茉莉花香脆筒，平价小确幸。' },
  { id: 'i02', name: '茉莉脆筒冰淇淋（5元/2个）', nameEn: 'Jasmine Cone - 2 for 5', price: 5, volume: '2支', category: '冰淇淋·小食', tags: ['优惠装', '茉莉花香'], description: '5 元 2 支超值装，分享甜蜜。' },
  { id: 'i03', name: '茉莉圣代', nameEn: 'Jasmine Sundae', price: 3, volume: '1杯', category: '冰淇淋·小食', tags: ['平价', '圣代'], description: '茉莉花香圣代，3 元轻松拥有。' },
];
