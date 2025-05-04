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
  teamDetails: z.string().describe('Team member names and IDs/enrollment numbers'), // Updated description
  instituteName: z.string().describe('Institute/College name'), // Replaced collegeInfo
  // Added new optional fields based on user request
  teamId: z.string().optional().describe('Team ID'),
  subject: z.string().optional().describe('Subject name (e.g., Design Engineering - 1A)'),
  semester: z.string().optional().describe('Current semester (e.g., 5)'),
  branch: z.string().optional().describe('Branch/Department (e.g., Computer Engineering)'),
  guideName: z.string().optional().describe('Name of the faculty guide'),
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
    schema: GenerateReportSectionInputSchema, // Updated to use the new schema directly
  },
  output: {
    schema: GenerateReportSectionOutputSchema, // Updated to use the new schema directly
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