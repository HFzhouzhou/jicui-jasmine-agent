/** Reviewed brand promotion images. Source bytes are unchanged; poster prices never override the menu. */
import type { OfficialImage } from './officialImages';
export type OfficialPromotion = OfficialImage & { title: string; subtitle: string; showOnHome: boolean; observedAt?: string };
export const OFFICIAL_PROMOTIONS: OfficialPromotion[] = [
  {
    "title": "茉莉龙井 东方花茗",
    "subtitle": "西湖龙井茶香 × 横州五窨茉莉",
    "showOnHome": true,
    "src": "/images/official/promo-26c7cf1e8f2d039192fc.jpg",
    "width": 828,
    "height": 1560,
    "crop": {
      "x": 0,
      "y": 280,
      "width": 828,
      "height": 535
    },
    "observedAt": "2026-10-10"
  },
  {
    "title": "极萃东方茉莉",
    "subtitle": "加盟茉莉合伙人",
    "showOnHome": false,
    "src": "/images/official/promo-ecf7aeb0d28ff81f021a.jpg",
    "width": 828,
    "height": 1560,
    "crop": {
      "x": 41,
      "y": 1098,
      "width": 747,
      "height": 230
    },
    "observedAt": "2026-10-10"
  },
  {
    "title": "黄皮茉莉 清心养夏",
    "subtitle": "贵港鸡心黄皮 × 横州六窨茉莉",
    "showOnHome": true,
    "src": "/images/official/promo-ff1b36a908d51e784a12.jpg",
    "width": 828,
    "height": 1560,
    "crop": {
      "x": 0,
      "y": 164,
      "width": 828,
      "height": 651
    },
    "observedAt": "2026-10-10"
  }
];
