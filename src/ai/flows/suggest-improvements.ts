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
import { BaseAiInputSchema, getModel, getConfig, getMissingApiKeyError } from './common';

const SuggestImprovementsInputSchemaInternal = z.object({
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
  existingSections: z
    .string()
    .optional()
    .describe('Comma-separated list of the current top-level section names.'),
  projectType: z.enum(['mini-project', 'internship']).optional().describe('The type of project (mini-project or internship).'),
});

export const SuggestImprovementsInputSchema = SuggestImprovementsInputSchemaInternal.merge(BaseAiInputSchema);
export type SuggestImprovementsInput = z.infer<typeof SuggestImprovementsInputSchema>;

const SuggestImprovementsOutputSchema = z.object({
  suggestions: z
    .string()
    .describe('Constructive feedback and actionable suggestions for improving the project report, formatted in Markdown. Focus on clarity, structure, completeness, and potential additions or refinements based on the provided content and context.'),
  error: z.string().optional(),
});
export type SuggestImprovementsOutput = z.infer<typeof SuggestImprovementsOutputSchema>;

export async function suggestImprovements(
  input: SuggestImprovementsInput
): Promise<SuggestImprovementsOutput> {
  const apiKeyError = getMissingApiKeyError(
    input.aiModel || 'gemini',
    input.userApiKey,
    !!process.env.GOOGLE_GENAI_API_KEY,
    !!process.env.OPENAI_API_KEY
  );
  if (apiKeyError) {
    return { suggestions: '', error: apiKeyError };
  }
  return suggestImprovementsFlow(input);
}

const suggestImprovementsPrompt = ai.definePrompt({
  name: 'suggestImprovementsPrompt',
  input: {
    schema: SuggestImprovementsInputSchemaInternal,
  },
  output: {
    schema: SuggestImprovementsOutputSchema,
  },
  prompt: `You are an AI assistant acting as a helpful reviewer for a student's project report.

  Project Title: {{{projectTitle}}}
  {{#if projectContext}}Project Context: {{{projectContext}}}{{/if}}
  {{#if projectType}}Project Type: {{{projectType}}}{{/if}}
  {{#if existingSections}}Current Sections: {{{existingSections}}}{{/if}}

  Current Report Content:
  {{{allSectionsContent}}}

  {{#if focusArea}}The user specifically wants feedback on: {{{focusArea}}}{{/if}}

  Please review the provided project title, context, type, current section structure (if available), and the content of the report sections.
  Provide constructive feedback and actionable suggestions for improvement. Focus on areas such as:
  - Clarity and coherence of the writing.
  - Logical structure and flow between sections (consider the project type).
  - Completeness of information relevant to the project context and type.
  - Identification of potential gaps or areas needing more detail.
  - Suggestions for additional relevant sections or content.
  - Refinements to existing content for better impact.
  - Consistency with standard report structures for the given project type.

  Format your response as helpful suggestions in Markdown. Use bullet points or numbered lists where appropriate. Be specific and provide examples if possible. Do not just criticize; offer solutions or alternative approaches.
  `,
});

const suggestImprovementsFlow = ai.defineFlow(
  {
    name: 'suggestImprovementsFlow',
    inputSchema: SuggestImprovementsInputSchema,
    outputSchema: SuggestImprovementsOutputSchema,
  },
  async (input) => {
    const { userApiKey, aiModel, ...promptData } = input;
    const model = getModel({ aiModel, userApiKey });
    const config = getConfig({ aiModel, userApiKey });

    if (!promptData.allSectionsContent?.trim() && !promptData.projectContext?.trim()) {
        return { suggestions: "Please provide some project context or section content to get suggestions.", error: "Insufficient input." };
    }
    try {
      const { output } = await suggestImprovementsPrompt(promptData, { model, config });

      if (!output?.suggestions) {
        return { suggestions: "Could not generate suggestions at this time. Please ensure your content is sufficient.", error: "AI returned no suggestions." };
      }
      return output;
    } catch (e: any) {
      console.error("Error in suggestImprovementsFlow:", e);
      return { suggestions: '', error: `AI generation failed: ${e.message || 'Unknown error'}` };
    }
  }
);
