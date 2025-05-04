// src/ai/flows/generate-report-section.ts
'use server';

/**
 * @fileOverview An AI agent for generating project report sections.
 *
 * - generateReportSection - A function that handles the generation of a specific project report section.
 * - GenerateReportSectionInput - The input type for the generateReportSection function.
 * - GenerateReportSectionOutput - The return type for the generateReportSection function.
 */

import {ai} from '@/ai/ai-instance';
import {z} from 'genkit';

const GenerateReportSectionInputSchema = z.object({
  projectTitle: z.string().describe('The title of the project.'),
  sectionName: z.string().describe('The name of the report section to generate (e.g., Introduction, Methodology).'),
  prompt: z.string().describe('A prompt to guide the generation of the report section.'),
  teamDetails: z.string().describe('Team member names and IDs'),
  collegeInfo: z.string().describe('College name'),
});
export type GenerateReportSectionInput = z.infer<typeof GenerateReportSectionInputSchema>;

const GenerateReportSectionOutputSchema = z.object({
  reportSectionContent: z.string().describe('The generated content for the report section.'),
});
export type GenerateReportSectionOutput = z.infer<typeof GenerateReportSectionOutputSchema>;

export async function generateReportSection(input: GenerateReportSectionInput): Promise<GenerateReportSectionOutput> {
  return generateReportSectionFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateReportSectionPrompt',
  input: {
    schema: z.object({
      projectTitle: z.string().describe('The title of the project.'),
      sectionName: z.string().describe('The name of the report section to generate.'),
      prompt: z.string().describe('A prompt to guide the generation of the report section.'),
      teamDetails: z.string().describe('Team member names and IDs'),
      collegeInfo: z.string().describe('College name'),
    }),
  },
  output: {
    schema: z.object({
      reportSectionContent: z.string().describe('The generated content for the report section.'),
    }),
  },
  prompt: `You are an AI assistant helping students generate their final year project reports.

  Please generate the {{{sectionName}}} section for the project titled "{{{projectTitle}}}".

  Consider the following information when generating the content:
  - Prompt: {{{prompt}}}
  - Team Details: {{{teamDetails}}}
  - College Info: {{{collegeInfo}}}

  Ensure the generated content is well-structured, informative, and relevant to the project.

  Output the content directly without any introductory or concluding remarks.
  `,
});

const generateReportSectionFlow = ai.defineFlow<
  typeof GenerateReportSectionInputSchema,
  typeof GenerateReportSectionOutputSchema
>({
  name: 'generateReportSectionFlow',
  inputSchema: GenerateReportSectionInputSchema,
  outputSchema: GenerateReportSectionOutputSchema,
},
async input => {
  const {output} = await prompt(input);
  return output!;
}
);
