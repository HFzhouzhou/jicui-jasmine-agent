// ---- plugin:jasmine_lady_drink_recommendation_1 ----
// ============================================================
// 插件 jasmine_lady_drink_recommendation_1 (茉莉娘子茶饮推荐插件) 的类型定义
// 由 get_plugin_ai_json 自动生成
// ============================================================

export interface JasmineLadyDrinkRecommendationOneInput {
  /** 用户的茶饮需求，包括心情、口味、场景或自由文本描述，支持多轮对话追问调整内容 */
  user_demand: string;
}

/**
 * capabilityClient.load('jasmine_lady_drink_recommendation_1').callStream<JasmineLadyDrinkRecommendationOneOutput>('textGenerate', input)
 * 每个 chunk 就是下面这个扁平对象，字段名与 JasmineLadyDrinkRecommendationOneOutput 一致，外面没有 data / choices / message 包装：
 *   {"content":"示例文本","response":"示例文本"}
 * 返回值可能是 AsyncIterable<chunk>，也可能是 { output: AsyncIterable<chunk> }，取流前先归一化。
 * 逐段累加：
 *   for await (const chunk of stream) { result += chunk.content ?? ''; }
 */
export interface JasmineLadyDrinkRecommendationOneOutput {
  /** [object Object] */
  content: string;
  /** [object Object] */
  response?: string;
}
// ---- end:jasmine_lady_drink_recommendation_1 ----