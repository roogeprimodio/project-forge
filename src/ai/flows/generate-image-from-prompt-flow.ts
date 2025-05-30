'use server';
/**
 * @fileOverview AI flow to generate an image from a text prompt using Gemini.
 *
 * - generateImageFromPrompt - Generates an image.
 * - GenerateImageFromPromptInput - Input type for the image generation flow.
 * - GenerateImageFromPromptOutput - Output type for the image generation flow.
 */

import { ai } from '@/ai/ai-instance';
import { z } from 'genkit';
import { BaseAiInputSchema, getConfig, getMissingApiKeyError } from './common'; // Assuming getModel is not needed if model is hardcoded

const GenerateImageFromPromptInputSchemaInternal = z.object({
  prompt: z.string().describe('A detailed text prompt to guide the image generation. E.g., "A photorealistic image of a cat wearing a wizard hat."'),
});

export const GenerateImageFromPromptInputSchema = GenerateImageFromPromptInputSchemaInternal.merge(BaseAiInputSchema);
export type GenerateImageFromPromptInput = z.infer<typeof GenerateImageFromPromptInputSchema>;

const GenerateImageFromPromptOutputSchema = z.object({
  generatedImageUrl: z.string().describe('The data URI of the generated image (e.g., "data:image/png;base64,...").'),
  error: z.string().optional().describe('Error message if image generation failed.'),
});
export type GenerateImageFromPromptOutput = z.infer<typeof GenerateImageFromPromptOutputSchema>;

export async function generateImageFromPrompt(input: GenerateImageFromPromptInput): Promise<GenerateImageFromPromptOutput> {
  // Image generation specific model 'gemini-2.0-flash-exp' uses Gemini, so check Gemini key
  const apiKeyError = getMissingApiKeyError(
    'gemini', // Hardcode 'gemini' as this flow uses a specific Gemini model
    input.userApiKey,
    !!process.env.GOOGLE_GENAI_API_KEY,
    !!process.env.OPENAI_API_KEY // Still pass this for consistency, though not used for model selection here
  );
  if (apiKeyError) {
    return { generatedImageUrl: '', error: apiKeyError };
  }
  return generateImageFromPromptFlow(input);
}

const generateImageFromPromptFlow = ai.defineFlow(
  {
    name: 'generateImageFromPromptFlow',
    inputSchema: GenerateImageFromPromptInputSchema,
    outputSchema: GenerateImageFromPromptOutputSchema,
  },
  async (input) => {
    const { userApiKey, aiModel, ...promptData } = input; // aiModel is not used here for model selection
    const config = getConfig({ aiModel: 'gemini', userApiKey }); // Force 'gemini' for config, pass userApiKey

    try {
      if (!promptData.prompt || promptData.prompt.trim().length === 0) {
        return { generatedImageUrl: '', error: 'Image prompt cannot be empty.' };
      }

      console.log(`Generating image with prompt: "${promptData.prompt}"`);

      const { media } = await ai.generate({
        model: 'googleai/gemini-2.0-flash-exp', // Specific model for image generation
        prompt: promptData.prompt,
        config: {
          ...config, // Spread the config which might contain userApiKey
          responseModalities: ['IMAGE', 'TEXT'],
        },
      });

      if (media && media.url) {
        console.log('Image generated successfully.');
        return { generatedImageUrl: media.url };
      } else {
        console.error('Image generation failed: No media URL returned.');
        return { generatedImageUrl: '', error: 'Image generation failed: No media URL returned by the AI.' };
      }
    } catch (error) {
      console.error('Error during image generation flow:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred during image generation.';
      return { generatedImageUrl: '', error: `Image Generation Failed: ${errorMessage}` };
    }
  }
);
