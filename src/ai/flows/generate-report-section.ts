// src/ai/flows/generate-report-section.ts
'use server';

/**
 * @fileOverview An AI agent for generating project report sections.
 *
 * - generateReportSection - A function that handles the generation of a specific project report section.
 * - GenerateReportSectionInput - The input type for the generateReportSection function.
 * - GenerateReportSectionOutput - The return type for the generateReportSection function.
 */

import { ai } from '@/ai/ai-instance';
import { z } from 'genkit';
import { BaseAiInputSchema, getModel, getConfig, getMissingApiKeyError } from './common';

const GenerateReportSectionInputSchemaInternal = z.object({
  projectTitle: z.string().describe('The title of the project.'),
  sectionName: z.string().describe('The name of the report section to generate (e.g., Introduction, Methodology).'),
  prompt: z.string().describe('A prompt to guide the generation of the report section.'),
  teamDetails: z.string().describe('Team member names and IDs/enrollment numbers'),
  instituteName: z.string().describe('Institute/College name'),
  teamId: z.string().optional().describe('Team ID'),
  subject: z.string().optional().describe('Subject name (e.g., Design Engineering - 1A)'),
  semester: z.string().optional().describe('Current semester (e.g., 5)'),
  branch: z.string().optional().describe('Branch/Department (e.g., Computer Engineering)'),
  guideName: z.string().optional().describe('Name of the faculty guide'),
});

export const GenerateReportSectionInputSchema = GenerateReportSectionInputSchemaInternal.merge(BaseAiInputSchema);
export type GenerateReportSectionInput = z.infer<typeof GenerateReportSectionInputSchema>;

const GenerateReportSectionOutputSchema = z.object({
  reportSectionContent: z.string().describe('The generated content for the report section.'),
  error: z.string().optional(),
});
export type GenerateReportSectionOutput = z.infer<typeof GenerateReportSectionOutputSchema>;

export async function generateReportSection(input: GenerateReportSectionInput): Promise<GenerateReportSectionOutput> {
  const apiKeyError = getMissingApiKeyError(
    input.aiModel || 'gemini',
    input.userApiKey,
    !!process.env.GOOGLE_GENAI_API_KEY,
    !!process.env.OPENAI_API_KEY
  );
  if (apiKeyError) {
    return { reportSectionContent: '', error: apiKeyError };
  }
  return generateReportSectionFlow(input);
}

const generateReportSectionPrompt = ai.definePrompt({
  name: 'generateReportSectionPrompt',
  input: {
    schema: GenerateReportSectionInputSchemaInternal,
  },
  output: {
    schema: GenerateReportSectionOutputSchema,
  },
  prompt: `You are an AI assistant helping students generate their final year project reports.

  Please generate the {{{sectionName}}} section for the project titled "{{{projectTitle}}}".

  Consider the following information when generating the content:
  - Specific instructions/prompt: {{{prompt}}}
  - Institute: {{{instituteName}}}
  {{#if teamId}}- Team ID: {{{teamId}}}{{/if}}
  {{#if branch}}- Branch: {{{branch}}}{{/if}}
  {{#if semester}}- Semester: {{{semester}}}{{/if}}
  {{#if subject}}- Subject: {{{subject}}}{{/if}}
  {{#if teamDetails}}- Team Members: {{{teamDetails}}}{{/if}}
  {{#if guideName}}- Faculty Guide: {{{guideName}}}{{/if}}

  Ensure the generated content is well-structured, informative, and relevant to the project and section.
  Output the content directly without any introductory or concluding remarks.
  Format the output using Markdown.
  `,
});

const generateReportSectionFlow = ai.defineFlow(
  {
    name: 'generateReportSectionFlow',
    inputSchema: GenerateReportSectionInputSchema,
    outputSchema: GenerateReportSectionOutputSchema,
  },
  async (input) => {
    const { userApiKey, aiModel, ...promptData } = input;
    const model = getModel({ aiModel, userApiKey });
    const config = getConfig({ aiModel, userApiKey });

    try {
      const { output } = await generateReportSectionPrompt(promptData, { model, config });
      return output!;
    } catch (e: any) {
      console.error("Error in generateReportSectionFlow:", e);
      return { reportSectionContent: '', error: `AI generation failed: ${e.message || 'Unknown error'}` };
    }
  }
);
