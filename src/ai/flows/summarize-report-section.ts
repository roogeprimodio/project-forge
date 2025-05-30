'use server';

/**
 * @fileOverview A flow to summarize a section of a project report using AI.
 *
 * - summarizeReportSection - A function that handles the summarization process.
 * - SummarizeReportSectionInput - The input type for the summarizeReportSection function.
 * - SummarizeReportSectionOutput - The return type for the summarizeReportSection function.
 */

import { ai } from '@/ai/ai-instance';
import { z } from 'genkit';
import { BaseAiInputSchema, getModel, getConfig, getMissingApiKeyError } from './common';

const SummarizeReportSectionInputSchemaInternal = z.object({
  sectionText: z
    .string()
    .describe('The text of the project report section to summarize.'),
  projectTitle: z.string().describe('The title of the project.'),
});

export const SummarizeReportSectionInputSchema = SummarizeReportSectionInputSchemaInternal.merge(BaseAiInputSchema);
export type SummarizeReportSectionInput = z.infer<typeof SummarizeReportSectionInputSchema>;

const SummarizeReportSectionOutputSchema = z.object({
  summary: z.string().describe('The summarized text of the report section.'),
  error: z.string().optional(),
});
export type SummarizeReportSectionOutput = z.infer<typeof SummarizeReportSectionOutputSchema>;

export async function summarizeReportSection(
  input: SummarizeReportSectionInput
): Promise<SummarizeReportSectionOutput> {
  const apiKeyError = getMissingApiKeyError(
    input.aiModel || 'gemini',
    input.userApiKey,
    !!process.env.GOOGLE_GENAI_API_KEY,
    !!process.env.OPENAI_API_KEY
  );
  if (apiKeyError) {
    return { summary: '', error: apiKeyError };
  }
  return summarizeReportSectionFlow(input);
}

const summarizeReportSectionPrompt = ai.definePrompt({
  name: 'summarizeReportSectionPrompt',
  input: {
    schema: SummarizeReportSectionInputSchemaInternal,
  },
  output: {
    schema: SummarizeReportSectionOutputSchema,
  },
  prompt: `You are an AI assistant helping a student write their final year project report. Summarize the following section of the report, focusing on the key information and main points. The project title is {{{projectTitle}}}.\n\nSection Text: {{{sectionText}}}`,
});

const summarizeReportSectionFlow = ai.defineFlow(
  {
    name: 'summarizeReportSectionFlow',
    inputSchema: SummarizeReportSectionInputSchema,
    outputSchema: SummarizeReportSectionOutputSchema,
  },
  async (input) => {
    const { userApiKey, aiModel, ...promptData } = input;
    const model = getModel({ aiModel, userApiKey });
    const config = getConfig({ aiModel, userApiKey });

    try {
      const { output } = await summarizeReportSectionPrompt(promptData, { model, config });
      return output!;
    } catch (e: any) {
      console.error("Error in summarizeReportSectionFlow:", e);
      return { summary: '', error: `AI generation failed: ${e.message || 'Unknown error'}` };
    }
  }
);
