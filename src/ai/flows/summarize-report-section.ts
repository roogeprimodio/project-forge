'use server';

/**
 * @fileOverview A flow to summarize a section of a project report using AI.
 *
 * - summarizeReportSection - A function that handles the summarization process.
 * - SummarizeReportSectionInput - The input type for the summarizeReportSection function.
 * - SummarizeReportSectionOutput - The return type for the summarizeReportSection function.
 */

import {ai} from '@/ai/ai-instance';
import {z} from 'genkit';

const SummarizeReportSectionInputSchema = z.object({
  sectionText: z
    .string()
    .describe('The text of the project report section to summarize.'),
  projectTitle: z.string().describe('The title of the project.'),
});
export type SummarizeReportSectionInput = z.infer<
  typeof SummarizeReportSectionInputSchema
>;

const SummarizeReportSectionOutputSchema = z.object({
  summary: z.string().describe('The summarized text of the report section.'),
});
export type SummarizeReportSectionOutput = z.infer<
  typeof SummarizeReportSectionOutputSchema
>;

export async function summarizeReportSection(
  input: SummarizeReportSectionInput
): Promise<SummarizeReportSectionOutput> {
  return summarizeReportSectionFlow(input);
}

const prompt = ai.definePrompt({
  name: 'summarizeReportSectionPrompt',
  input: {
    schema: z.object({
      sectionText: z
        .string()
        .describe('The text of the project report section to summarize.'),
      projectTitle: z.string().describe('The title of the project.'),
    }),
  },
  output: {
    schema: z.object({
      summary: z.string().describe('The summarized text of the report section.'),
    }),
  },
  prompt: `You are an AI assistant helping a student write their final year project report. Summarize the following section of the report, focusing on the key information and main points. The project title is {{{projectTitle}}}.\n\nSection Text: {{{sectionText}}}`,
});

const summarizeReportSectionFlow = ai.defineFlow<
  typeof SummarizeReportSectionInputSchema,
  typeof SummarizeReportSectionOutputSchema
>({
  name: 'summarizeReportSectionFlow',
  inputSchema: SummarizeReportSectionInputSchema,
  outputSchema: SummarizeReportSectionOutputSchema,
},
async input => {
  const {output} = await prompt(input);
  return output!;
});
