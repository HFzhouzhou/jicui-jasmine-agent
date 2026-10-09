# 界面设计与素材记录

更新日期：2026-10-10。

## 视觉方向

以东方茶饮工作室为主题，使用纸白、深茶绿、嫩叶绿与暖杏色；宋体标题搭配简洁正文。首页采用摄影主视觉与非对称排版，茶谱优先采用小程序中的真实商品图，对话页采用双栏选茶工作区。

## 手机布局

- 依据可用屏幕宽度自动切换布局，支持手机横竖屏与桌面窗口变化。
- 小于 768px 显示手机底部导航，预留安全区；编辑输入框时收起底部导航。
- 小于 1024px 以“聊聊口味 / 我的茶单”切换代替桌面双栏，有结果后自动展示茶单。
- 手机茶谱使用紧凑双列、可横向滑动的分类按钮；详情弹层内部可滚动。
- 手机输入字号至少 16px，主要操作区域至少 44px；支持减少动态效果的系统偏好。

## 图像素材

- `public/images/jasmine-studio.png`：使用内置 imagegen 工具生成的主视觉原图。
- `public/images/jasmine-studio.jpg`：同一图像的网页压缩版本，约 410KB，首页实际加载该文件。
- `src/data/officialImages.ts`：经人工核对的官方商品截图索引，原图保持不变，网页用 SVG 视窗和裁切路径展示商品画面。
- `src/components/DrinkArtwork.tsx`：有官方商品截图时展示对应商品；尚无截图时使用明确标为示意的 SVG 品类插画。
- `OfficialProductImageDialog`：茶礼、香氛的官方图片可放大查看；手机弹窗内部滚动，关闭按钮保持可用。

首页生成摄影与品类插画是氛围示意；商品图片的具体来源与核对证据保存在 README、素材索引和维护资料中。商品价格、采集门店与日期来自核对后的目录，不能据宣传图价格覆盖目录普通价。

## 顾客文案与资料来源

- 顾客图片角标使用“图片仅供参考”等简洁提示，不展示“小程序截图”“是截的图”或其他素材制作过程文案。
- 来源证据、窗口截图方式、原图链接及补图进度属于维护资料，不占用商品图片角标。简化顾客文案时继续保留这些记录。
- 60 款商品图已齐，顾客页面已收起“已核对”、采集日期、“非实时库存”等过程标签。保留“图片仅供参考”“价格与售卖情况以门店为准”等自然提示，不把维护流程写成顾客操作步骤。
- 隐藏过程标签不等于完成接口接入。未经实际接入与验证，不标注“官方接口已连接”“实时库存”或“已向门店下单”；必要的配料、规格和饮用限制说明仍以真实资料为依据。

## 当前完成范围

现有 60 款门店商品已全部关联图片（24 款茶饮、26 款茶礼、10 款护肤香氛）。旧 45 张图片采集于 2026-10-09，新增 15 张与 3 张宣传图采集于 2026-10-10。首页展示龙井、黄皮两张茶饮主题图，加盟横幅只保存在离线档案。菜单资料仍基于 2026-10-09 中华茉莉园店快照，图片齐备不等于配方核准或业务接口接通。

品牌官方数据接口、实时库存、官方小程序入口的配置与跳转、门店订单和支付均未接入。当前提供独立浏览、选茶与参考茶单功能。过程提示已按用户要求收起，维护文档继续记录实际接入状态。

### 主视觉生成提示词

> Use case: product-mockup. Asset type: website hero photograph for a refined contemporary Chinese jasmine tea brand. Create one premium editorial still-life photograph, portrait 3:4 composition. A single tall clear slightly tapered glass of golden pale-green iced jasmine tea, chunky translucent ice, tiny condensation, standing slightly right of center on a warm ivory travertine plinth. Beside the glass a slender fresh jasmine branch with several small ivory white blossoms and glossy green leaves rests across the lower foreground, with a few loose tea leaves. Quiet warm pale sage background, soft architectural window shadow diagonally crossing the scene. Morning sunlight from upper left, realistic caustics, exquisite tactile stone and glass, luxury skincare campaign level art direction, analogue editorial photography, harmonious restrained tones of cream, olive, fresh leaf green and translucent golden tea. The glass is large and beautiful, occupying middle 60% height, plenty of breathing room, whole glass visible, no cropping the subject. No hands, no people, no branding or label, no writing or letters, no graphic overlays, no watermark. This is an atmospheric tea illustration, not a representation of a specific real shop product.

本次使用内置工具，不使用 CLI 或其他模型服务生成主视觉。
