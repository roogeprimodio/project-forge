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
  keyFindings: z.string().optional().describe('Brief summary of the main results or findings of the project. If not provided, AI should infer from context.'),
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
  prompt: `You are an AI assistant tasked with writing a concise and informative abstract for a student project report. The output must be in Markdown format, adhering to the HTML structure provided for layout.

  **Project Information:**
  - Title: {{{projectTitle}}}
  - Context/Description: {{{projectContext}}}
  {{#if keyFindings}}- Key Findings (if provided): {{{keyFindings}}}{{/if}}

  **Instructions for Generating the Abstract:**
  1.  The abstract should be a single block of text (Markdown paragraph form), wrapped in the provided HTML structure.
  2.  It must be concise, typically between 150 and 300 words.
  3.  Summarize the main objectives and scope of the project.
  4.  Briefly describe the methodology or approach used.
  5.  Highlight the key outcomes, results, or contributions of the project based on the provided context. If key findings are explicitly given, incorporate them. If not, infer from the project context.
  6.  Conclude with the significance or potential implications of the project.
  7.  The language should be formal and academic.
  8.  Avoid jargon where possible, or explain it briefly if necessary.
  9.  Ensure the abstract is self-contained and accurately reflects the project context.
  10. Output ONLY the Markdown and HTML. No extra text or explanations.

  **Required Output Structure (Markdown with embedded HTML for layout):**
  \`\`\`markdown
  <div style="font-family: 'Times New Roman', serif; padding: 20px; margin: 20px; page-break-after: always;">
  <h1 style="text-align: center; font-size: 20pt; font-weight: bold; margin-bottom: 30px; text-decoration: underline;">ABSTRACT</h1>
  <p style="font-size: 12pt; line-height: 1.8; text-align: justify; text-indent: 30px;">
  [Generated Abstract Paragraph(s) Here - This text should be replaced by the AI-generated abstract based on the instructions above. Ensure it's a continuous block of text formatted as Markdown paragraphs within this HTML paragraph tag.]
  </p>
  <br><br>
  <p style="font-size: 12pt; font-weight: bold;">Keywords: <span style="font-weight: normal;">[Suggest 3-5 relevant keywords based on the project context, separated by commas]</span></p>
  </div>
  \`\`\`

  Generate the abstract now based on the title, context, and key findings (if any).
  Fill in the "[Generated Abstract Paragraph(s) Here]" and "[Suggest 3-5 relevant keywords...]" parts.
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

