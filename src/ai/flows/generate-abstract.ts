'use server';
/**
 * @fileOverview AI agent to generate a project report abstract.
 *
 * - generateAbstract - Generates Markdown content for an abstract.
 * - GenerateAbstractInput - Input type for the generation flow.
 * - GenerateAbstractOutput - Output type for the generation flow.
 */

import { ai } from '@/ai/ai-instance';
import { z } from 'genkit';

const GenerateAbstractInputSchema = z.object({
  projectTitle: z.string().describe('The full title of the project.'),
  projectContext: z.string().describe('A detailed description of the project, its goals, scope, target audience, key features, technologies used, and methodology. This is crucial for a good abstract.'),
  // Optional: You might want to add fields for key findings/results if available later
  // keyFindings: z.string().optional().describe('Brief summary of the main results or findings of the project.'),
});
export type GenerateAbstractInput = z.infer<typeof GenerateAbstractInputSchema>;

const GenerateAbstractOutputSchema = z.object({
  abstractMarkdown: z.string().describe('The generated Markdown content for the abstract. Should be a concise summary of the project (typically 150-300 words).'),
});
export type GenerateAbstractOutput = z.infer<typeof GenerateAbstractOutputSchema>;

export async function generateAbstract(input: GenerateAbstractInput): Promise<GenerateAbstractOutput> {
  return generateAbstractFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateAbstractPrompt',
  input: { schema: GenerateAbstractInputSchema },
  output: { schema: GenerateAbstractOutputSchema },
  prompt: `You are an AI assistant tasked with writing a concise and informative abstract for a student project report in Markdown format.

  **Project Information:**
  - Title: {{{projectTitle}}}
  - Context/Description: {{{projectContext}}}
  {{#if keyFindings}}- Key Findings (if provided): {{{keyFindings}}}{{/if}}

  **Instructions for Generating the Abstract:**
  1.  The abstract should be a single block of text (Markdown paragraph form).
  2.  It must be concise, typically between 150 and 300 words.
  3.  Summarize the main objectives and scope of the project.
  4.  Briefly describe the methodology or approach used.
  5.  Highlight the key outcomes, results, or contributions of the project based on the provided context. If key findings are explicitly given, incorporate them.
  6.  Conclude with the significance or potential implications of the project.
  7.  The language should be formal and academic.
  8.  Avoid jargon where possible, or explain it briefly if necessary.
  9.  Ensure the abstract is self-contained and accurately reflects the project context.
  10. Do NOT include a heading like "# Abstract" in the output; only provide the abstract text itself.
  11. Output ONLY the Markdown paragraph(s) for the abstract. No extra text or explanations.

  Generate the abstract now based on the title and context.
  `,
});

const generateAbstractFlow = ai.defineFlow(
  {
    name: 'generateAbstractFlow',
    inputSchema: GenerateAbstractInputSchema,
    outputSchema: GenerateAbstractOutputSchema,
  },
  async input => {
    if (!input.projectContext || input.projectContext.trim().length < 50) {
        throw new Error("Project context is too short to generate a meaningful abstract. Please provide more details about the project.");
    }
    const { output } = await prompt(input);
    return output!;
  }
);
