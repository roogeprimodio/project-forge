// src/ai/flows/generate-project-outline.ts
'use server';
/**
 * @fileOverview AI agent to generate a project report outline.
 *
 * - generateProjectOutline - Generates a list of suggested section names based on project context.
 * - GenerateProjectOutlineInput - Input type for the generation flow.
 * - GenerateProjectOutlineOutput - Output type for the generation flow.
 */

import { ai } from '@/ai/ai-instance';
import { z } from 'genkit';

const GenerateProjectOutlineInputSchema = z.object({
  projectTitle: z.string().describe('The title of the project.'),
  projectContext: z.string().describe('A brief description of the project, its goals, scope, and key features or technologies involved.'),
});
export type GenerateProjectOutlineInput = z.infer<typeof GenerateProjectOutlineInputSchema>;

const GenerateProjectOutlineOutputSchema = z.object({
  suggestedSections: z.array(z.string()).describe('An ordered list of suggested section names for the project report (e.g., ["Introduction", "Problem Statement", "Methodology", "Implementation", "Results", "Conclusion"]). Include standard sections but also suggest relevant custom sections based on the context.'),
});
export type GenerateProjectOutlineOutput = z.infer<typeof GenerateProjectOutlineOutputSchema>;

export async function generateProjectOutline(input: GenerateProjectOutlineInput): Promise<GenerateProjectOutlineOutput> {
  return generateProjectOutlineFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateProjectOutlinePrompt',
  input: {
    schema: GenerateProjectOutlineInputSchema,
  },
  output: {
    schema: GenerateProjectOutlineOutputSchema,
  },
  prompt: `You are an AI assistant helping students structure their final year project reports.

  Based on the project title and context provided below, generate a comprehensive and logically ordered list of section names suitable for the report. Include standard academic sections like Introduction, Methodology, Conclusion, and References, but also suggest more specific sections relevant to the project's context.

  Project Title: {{{projectTitle}}}
  Project Context: {{{projectContext}}}

  Think about the typical flow of a technical or research report. Consider sections that might cover background, problem definition, proposed solution, implementation details, evaluation, and future work, tailored to the specifics mentioned in the context.

  Provide the output strictly as a JSON object containing a single key "suggestedSections" with an array of strings representing the section names in the desired order. Do not include any other text or explanations.
  Example Output: { "suggestedSections": ["Introduction", "Literature Review", "System Design", "Implementation Details", "Testing and Evaluation", "Conclusion", "References"] }
  `,
});

const generateProjectOutlineFlow = ai.defineFlow<
  typeof GenerateProjectOutlineInputSchema,
  typeof GenerateProjectOutlineOutputSchema
>({
  name: 'generateProjectOutlineFlow',
  inputSchema: GenerateProjectOutlineInputSchema,
  outputSchema: GenerateProjectOutlineOutputSchema,
},
async input => {
  // Add default sections if the context is very short or empty, maybe?
  // For now, let the LLM handle it based on the prompt.
  const { output } = await prompt(input);

  // Basic validation or fallback if needed
  if (!output?.suggestedSections || output.suggestedSections.length === 0) {
      console.warn("AI did not return suggested sections, providing fallback.");
      // Provide a very basic fallback outline
      return { suggestedSections: ["Introduction", "Main Content", "Conclusion", "References"] };
  }

  return output;
});
