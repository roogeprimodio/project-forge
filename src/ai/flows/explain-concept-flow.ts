'use server';
/**
 * @fileOverview AI agent to explain a concept in a structured, slide-like format, with suggestions for immersive media.
 *
 * - explainConcept - Generates a series of "slides" to explain a given concept.
 * - ExplainConceptInput - Input type for the explanation flow.
 * - ExplainConceptOutput - Output type for the explanation flow (defined in @/types/project).
 */

import { ai } from '@/ai/ai-instance';
import { z } from 'genkit';
import type { ExplanationSlide, ExplainConceptOutput } from '@/types/project';
import { BaseAiInputSchema, getModel, getConfig, getMissingApiKeyError } from './common';

const ExplainConceptInputSchemaInternal = z.object({
  concept: z.string().describe('The concept, term, or phrase to be explained.'),
  projectContext: z.string().optional().describe('Optional context from the project to tailor the explanation (e.g., "Explain this in the context of software engineering for e-sports management.").'),
  complexityLevel: z.enum(['simple', 'detailed', 'expert']).optional().default('simple').describe('The desired level of complexity for the explanation.'),
});

export const ExplainConceptInputSchema = ExplainConceptInputSchemaInternal.merge(BaseAiInputSchema);
export type ExplainConceptInput = z.infer<typeof ExplainConceptInputSchema>;

const ExplanationSlideSchema = z.object({
  title: z.string().optional().describe('A concise title for the slide.'),
  content: z.string().describe('The main textual explanation for this slide, formatted in Markdown. Should be clear and easy to understand. Aim for comprehensive coverage if complexity is high.'),
  mermaidDiagram: z.string().optional().describe('Optional: Valid Mermaid.js code for a diagram relevant to this slide. Only include if a diagram significantly aids understanding. Keep diagrams simple. Output ONLY Mermaid syntax, no markdown fences.'),
  imagePromptForGeneration: z.string().optional().describe('Optional: A descriptive text prompt suitable for an AI image generation model if an image would significantly enhance this slide. E.g., "A futuristic cityscape with flying cars." This prompt will be used by the client to trigger image generation.'),
  generatedImageUrl: z.string().optional().describe('This field is for storing the URL of an image generated later by the client-side component. DO NOT POPULATE THIS YOURSELF.'),
  videoPlaceholderText: z.string().optional().describe('Optional: A brief description of a short video or animation (e.g., "Short animation of the water cycle") that could illustrate the point of this slide. Do not provide video URLs or attempt to generate video, just the descriptive placeholder text.'),
  interactiveElementPlaceholderText: z.string().optional().describe('Optional: A brief description of a simple interactive element (e.g., "Quiz: What are the three states of matter?", "Clickable diagram of a plant cell") that could make this slide more engaging. Provide just the descriptive text.'),
});

const ExplainConceptOutputSchema = z.object({
  slides: z.array(ExplanationSlideSchema).describe('An array of slides, each explaining a part of the concept. Ordered logically. Generate as many slides as necessary to explain the concept thoroughly based on the complexity level.'),
  conceptTitle: z.string().describe('The original concept that was explained.'),
  error: z.string().optional(),
});

export async function explainConcept(input: ExplainConceptInput): Promise<ExplainConceptOutput> {
  const apiKeyError = getMissingApiKeyError(
    input.aiModel || 'gemini',
    input.userApiKey,
    !!process.env.GOOGLE_GENAI_API_KEY,
    !!process.env.OPENAI_API_KEY
  );

  if (apiKeyError) {
    return { conceptTitle: input.concept, slides: [], error: apiKeyError };
  }
  return explainConceptFlow(input);
}

const explainConceptPrompt = ai.definePrompt({
  name: 'explainConceptPrompt',
  input: { schema: ExplainConceptInputSchemaInternal }, // Use internal schema for prompt template
  output: { schema: ExplainConceptOutputSchema },
  prompt: `You are an AI assistant specialized in breaking down complex topics into engaging, slide-like explanations.
Your task is to explain the given concept: "{{{concept}}}".

**Context & Constraints:**
- Project Context (if provided): {{{projectContext}}}
- Desired Complexity: {{{complexityLevel}}}
- Number of Slides: Generate as many slides as necessary to comprehensively explain the concept. Prioritize thoroughness over brevity, especially for 'detailed' or 'expert' complexity.

**Instructions for Generating Explanation Slides:**
1.  **Understand the Concept:** Fully grasp "{{{concept}}}". Tailor explanations to '{{{projectContext}}}' if provided.
2.  **Structure into Slides:** Create a logical sequence of slides.
3.  **Slide Content (Markdown):** For each slide:
    *   Provide a \`title\` (optional, recommended).
    *   Write clear, comprehensive \`content\` in Markdown (use bullet points, bold text, detailed explanations for higher complexity levels).
    *   Aim for scannable, yet informative content.
4.  **Diagrams (Optional Mermaid Code):**
    *   If a simple diagram clarifies a point, provide valid \`mermaidDiagram\` code (e.g., \`flowchart TD\`, \`graph LR\`).
    *   Output ONLY Mermaid syntax, no markdown fences. Only use if truly beneficial.
5.  **Immersive Media Suggestions (Optional):**
    *   **Images:** If an image would significantly aid understanding, provide an \`imagePromptForGeneration\`. This should be a detailed text prompt for an AI image generator (e.g., "A detailed illustration of a neuron firing an action potential, showing synaptic vesicles."). Do NOT generate the image itself, just the prompt. The client application will handle actual image generation.
    *   **Videos/Animations (Placeholders):** If a short video or animation (15-30 seconds) could effectively demonstrate a process or concept, provide \`videoPlaceholderText\` (e.g., "Short animation showing DNA replication process."). Do not provide video URLs or attempt to generate videos/animations directly. This is only for suggesting the *idea* of a video.
    *   **Interactive Elements (Placeholders):** If a simple interactive element (like a quiz question or a basic clickable demo) could enhance engagement, provide \`interactiveElementPlaceholderText\` (e.g., "Quiz: What is the main function of mitochondria?"). Provide just the descriptive text.
    *   Use these immersive suggestions sparingly, only when they add significant value. Not every slide needs them.
6.  **CRITICAL: DO NOT populate \`generatedImageUrl\` yourself.** This field is reserved for the client application to populate *after* it has generated an image based on your \`imagePromptForGeneration\`. Your output for \`generatedImageUrl\` must always be undefined or an empty string.
7.  **Overall Flow:** Ensure slides progress logically and provide a complete explanation.
8.  **Output Format:** A single JSON object matching 'ExplainConceptOutputSchema'.

Explain "{{{concept}}}" now, adhering to all instructions and the JSON output format. Generate as many slides as needed for a thorough explanation. Ensure \`generatedImageUrl\` is NEVER populated by you.
`,
});

const explainConceptFlow = ai.defineFlow(
  {
    name: 'explainConceptFlow',
    inputSchema: ExplainConceptInputSchema,
    outputSchema: ExplainConceptOutputSchema,
  },
  async (input) => {
    const { userApiKey, aiModel, ...promptData } = input;
    const model = getModel({ aiModel, userApiKey });
    const config = getConfig({ aiModel, userApiKey });

    const processedInput = {
        ...promptData,
        complexityLevel: promptData.complexityLevel || 'simple',
    };

    try {
      const { output } = await explainConceptPrompt(processedInput, { model, config });

      if (!output || !Array.isArray(output.slides) || typeof output.conceptTitle !== 'string') {
        console.error("AI returned an invalid structure for concept explanation:", output);
        return {
          conceptTitle: input.concept,
          slides: [{
            title: "Error",
            content: "Failed to generate explanation. The AI did not return the expected data structure. Please try again."
          }],
          error: "AI returned an invalid structure."
        };
      }

      const validatedSlides = output.slides.map(slide => {
          const { generatedImageUrl, ...restOfSlide } = slide;
          if (generatedImageUrl !== undefined && generatedImageUrl !== null && generatedImageUrl !== '') {
              console.warn(`AI incorrectly populated generatedImageUrl for slide: "${slide.title || 'Untitled'}". Removing.`);
          }
          return { ...restOfSlide, generatedImageUrl: undefined };
      });

      return { ...output, slides: validatedSlides };
    } catch (e: any) {
      console.error("Error in explainConceptFlow:", e);
      return {
        conceptTitle: input.concept,
        slides: [],
        error: `AI generation failed: ${e.message || 'Unknown error'}`
      };
    }
  }
);
