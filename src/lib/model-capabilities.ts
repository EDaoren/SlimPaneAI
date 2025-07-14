/**
 * 模型能力检测工具
 * 用于判断不同模型支持的功能
 */

/**
 * 检测模型是否支持思考过程（reasoning）
 * @param modelId 模型ID，如 "o3", "o4-mini" 等
 * @returns 是否支持思考过程
 *
 * 注意：o1模型不支持思考过程暴露，OpenAI明确表示不会把原始链式思考暴露给用户
 * reasoning.summary 只对 o3/o4-mini 开放，暂时不支持 o1
 */
export function supportsReasoning(modelId?: string): boolean {
  if (!modelId) return false;

  const modelLower = modelId.toLowerCase();

  // 支持思考过程的模型列表（不包括o1系列）
  const reasoningModels = [
    'o3',
    'o4-mini',
    'gemini-2.5-pro', // Gemini 2.5 Pro 支持思考过程
    // 未来可能支持的模型可以在这里添加
  ];

  return reasoningModels.some(model => modelLower.includes(model));
}

/**
 * 检测模型是否支持流式思考过程
 * @param modelId 模型ID
 * @returns 是否支持流式思考过程
 *
 * 注意：o1模型不支持思考过程暴露，因此也不支持流式思考过程
 */
export function supportsStreamingReasoning(modelId?: string): boolean {
  if (!modelId) return false;

  const modelLower = modelId.toLowerCase();

  // 目前支持流式思考过程的模型（不包括o1系列）
  const streamingReasoningModels = [
    'o3',
    'o4-mini',
    'gemini-2.5-pro', // Gemini 2.5 Pro 支持流式思考过程
  ];

  return streamingReasoningModels.some(model => modelLower.includes(model));
}

/**
 * 获取模型的显示名称
 * @param modelId 模型ID
 * @returns 模型的友好显示名称
 */
export function getModelDisplayName(modelId?: string): string {
  if (!modelId) return 'Unknown Model';
  
  const displayNames: Record<string, string> = {
    'gpt-4o-mini': 'GPT-4o Mini',
    'gpt-4o': 'GPT-4o',
    'o1-preview': 'o1-preview',
    'o1-mini': 'o1-mini',
    'claude-3-sonnet': 'Claude 3 Sonnet',
    'claude-3-haiku': 'Claude 3 Haiku',
    'gemini-pro': 'Gemini Pro',
    'gemini-2.5-pro': 'Gemini 2.5 Pro',
  };
  
  return displayNames[modelId] || modelId;
}
