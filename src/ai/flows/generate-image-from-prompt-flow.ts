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

const GenerateImageFromPromptInputSchema = z.object({
  prompt: z.string().describe('A detailed text prompt to guide the image generation. E.g., "A photorealistic image of a cat wearing a wizard hat."'),
});
export type GenerateImageFromPromptInput = z.infer<typeof GenerateImageFromPromptInputSchema>;

const GenerateImageFromPromptOutputSchema = z.object({
  generatedImageUrl: z.string().describe('The data URI of the generated image (e.g., "data:image/png;base64,...").'),
  error: z.string().optional().describe('Error message if image generation failed.'),
});
export type GenerateImageFromPromptOutput = z.infer<typeof GenerateImageFromPromptOutputSchema>;

export async function generateImageFromPrompt(input: GenerateImageFromPromptInput): Promise<GenerateImageFromPromptOutput> {
  return generateImageFromPromptFlow(input);
}

const generateImageFromPromptFlow = ai.defineFlow(
  {
    name: 'generateImageFromPromptFlow',
    inputSchema: GenerateImageFromPromptInputSchema,
    outputSchema: GenerateImageFromPromptOutputSchema,
  },
  async (input) => {
    try {
      if (!input.prompt || input.prompt.trim().length === 0) {
        return { generatedImageUrl: '', error: 'Image prompt cannot be empty.' };
      }

      console.log(`Generating image with prompt: "${input.prompt}"`);

      const { media } = await ai.generate({
        model: 'googleai/gemini-2.0-flash-exp', // Use the model capable of image generation
        prompt: input.prompt,
        config: {
          responseModalities: ['IMAGE', 'TEXT'], // Must include TEXT even if only image is primarily expected
          // You can add other generation parameters here if needed, e.g., number of candidates
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
