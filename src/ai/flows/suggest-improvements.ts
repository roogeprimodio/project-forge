'use server';
/**
 * @fileOverview AI agent to suggest improvements for a project report.
 *
 * - suggestImprovements - Generates suggestions based on project context and content.
 * - SuggestImprovementsInput - Input type for the suggestion flow.
 * - SuggestImprovementsOutput - Output type for the suggestion flow.
 */

import { ai } from '@/ai/ai-instance';
import { z } from 'genkit';

const SuggestImprovementsInputSchema = z.object({
  projectTitle: z.string().describe('The title of the project.'),
  projectContext: z
    .string()
    .optional()
    .describe('A brief description of the project, its goals, scope, and key features or technologies involved.'),
  allSectionsContent: z
    .string()
    .describe('The concatenated content of all existing project report sections.'),
  focusArea: z
    .string()
    .optional()
    .describe('Specific area or question the user wants suggestions on (e.g., "Improve clarity of introduction", "Suggest missing sections").'),
});
export type SuggestImprovementsInput = z.infer<typeof SuggestImprovementsInputSchema>;

const SuggestImprovementsOutputSchema = z.object({
  suggestions: z
    .string()
    .describe('Constructive feedback and actionable suggestions for improving the project report, formatted in Markdown. Focus on clarity, structure, completeness, and potential additions or refinements based on the provided content and context.'),
});
export type SuggestImprovementsOutput = z.infer<typeof SuggestImprovementsOutputSchema>;

export async function suggestImprovements(
  input: SuggestImprovementsInput
): Promise<SuggestImprovementsOutput> {
  return suggestImprovementsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestImprovementsPrompt',
  input: {
    schema: SuggestImprovementsInputSchema,
  },
  output: {
    schema: SuggestImprovementsOutputSchema,
  },
  prompt: `You are an AI assistant acting as a helpful reviewer for a student's project report.

  Project Title: {{{projectTitle}}}
  {{#if projectContext}}Project Context: {{{projectContext}}}{{/if}}

  Current Report Content:
  {{{allSectionsContent}}}

  {{#if focusArea}}The user specifically wants feedback on: {{{focusArea}}}{{/if}}

  Please review the provided project title, context (if available), and the current content of the report sections.
  Provide constructive feedback and actionable suggestions for improvement. Focus on areas such as:
  - Clarity and coherence of the writing.
  - Logical structure and flow between sections.
  - Completeness of information relevant to the project context.
  - Identification of potential gaps or areas needing more detail.
  - Suggestions for additional relevant sections or content.
  - Refinements to existing content for better impact.

  Format your response as helpful suggestions in Markdown. Use bullet points or numbered lists where appropriate. Be specific and provide examples if possible. Do not just criticize; offer solutions or alternative approaches.
  `,
});

const suggestImprovementsFlow = ai.defineFlow<
  typeof SuggestImprovementsInputSchema,
  typeof SuggestImprovementsOutputSchema
>({
  name: 'suggestImprovementsFlow',
  inputSchema: SuggestImprovementsInputSchema,
  outputSchema: SuggestImprovementsOutputSchema,
},
async (input) => {
  if (!input.allSectionsContent?.trim() && !input.projectContext?.trim()) {
      return { suggestions: "Please provide some project context or section content to get suggestions." };
  }
  const { output } = await prompt(input);

  if (!output?.suggestions) {
    // Fallback if AI returns empty suggestions
    return { suggestions: "Could not generate suggestions at this time. Please ensure your content is sufficient." };
  }

  return output;
});
