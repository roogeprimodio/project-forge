// src/ai/flows/common.ts
import { type ModelArgument } from 'genkit';
import { geminiModel, openAiModel } from '@/ai/ai-instance';
import { z } from 'zod';

export const BaseAiInputSchema = z.object({
  userApiKey: z.string().optional().describe("User's API key for the selected AI model."),
  aiModel: z.enum(['gemini', 'openai']).optional().default('gemini').describe("The AI model to use for generation."),
});
export type BaseAiInput = z.infer<typeof BaseAiInputSchema>;

export function getModel(input: BaseAiInput | { aiModel?: 'gemini' | 'openai', userApiKey?: string }): ModelArgument {
  const modelName = input.aiModel === 'openai' ? openAiModel : geminiModel;
  return modelName;
}

export function getConfig(input: BaseAiInput | { aiModel?: 'gemini' | 'openai', userApiKey?: string }): Record<string, any> | undefined {
  if (input.userApiKey) {
    return { apiKey: input.userApiKey };
  }
  return undefined;
}

// Helper to construct an error message if an API key is missing for the selected model
export function getMissingApiKeyError(
  modelType: 'gemini' | 'openai',
  userProvidedKey?: string,
  serverHasGeminiKey?: boolean,
  serverHasOpenAiKey?: boolean
): string | null {
  if (modelType === 'gemini' && !userProvidedKey && !serverHasGeminiKey) {
    return "Google Gemini API key not configured. Please add your Gemini API key in your Profile settings, or ensure the server has a default key.";
  }
  if (modelType === 'openai' && !userProvidedKey && !serverHasOpenAiKey) {
    return "OpenAI API key not configured. Please add your OpenAI API key in your Profile settings, or ensure the server has a default key.";
  }
  return null;
}
