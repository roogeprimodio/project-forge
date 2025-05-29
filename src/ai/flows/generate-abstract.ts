
'use server';
/**
 * @fileOverview AI agent to generate a project report abstract.
 *
 * - generateAbstract - Generates HTML content for an abstract.
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
  abstractMarkdown: z.string().describe('The generated HTML content for the abstract. Should be a concise summary of the project (typically 150-300 words).'),
});
export type GenerateAbstractOutput = z.infer<typeof GenerateAbstractOutputSchema>;

export async function generateAbstract(input: GenerateAbstractInput): Promise<GenerateAbstractOutput> {
  return generateAbstractFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateAbstractPrompt',
  input: { schema: GenerateAbstractInputSchema },
  output: { schema: GenerateAbstractOutputSchema },
  prompt: `You are an AI assistant tasked with writing a concise and informative abstract for a student project report. The output must be the HTML content for the abstract, ready to be rendered.

  **Project Information:**
  - Title: {{{projectTitle}}}
  - Context/Description: {{{projectContext}}}
  {{#if keyFindings}}- Key Findings (if provided): {{{keyFindings}}}{{/if}}

  **Instructions for Generating the Abstract:**
  1.  The abstract should be a single block of text (HTML paragraph form), wrapped in the provided HTML structure.
  2.  It must be concise, typically between 150 and 300 words.
  3.  Summarize the main objectives and scope of the project.
  4.  Briefly describe the methodology or approach used.
  5.  Highlight the key outcomes, results, or contributions of the project based on the provided context. If key findings are explicitly given, incorporate them. If not, infer from the project context.
  6.  Conclude with the significance or potential implications of the project.
  7.  The language should be formal and academic.
  8.  Avoid jargon where possible, or explain it briefly if necessary.
  9.  Ensure the abstract is self-contained and accurately reflects the project context.
  10. **Placeholder Usage:**
      *   If \`projectContext\` is the system-provided placeholder "[Abstract content cannot be generated due to insufficient project context. Please provide more details.]", then the main abstract content should be exactly that placeholder.
      *   If \`projectTitle\` is the system-provided placeholder "[Project Title Placeholder]", use it as is.
      *   Keywords suggestion should be "[Keywords placeholder - add 3-5 relevant keywords]" if the AI cannot reasonably infer them or if context is insufficient.
  11. Output ONLY the HTML content. Do NOT wrap it in Markdown code fences like \`\`\`markdown ... \`\`\`. No extra text or explanations.

  **Required Output Structure (HTML content):**
  <div style="font-family: 'Times New Roman', serif; padding: 20px; margin: 20px; page-break-after: always;">
  <h1 style="text-align: center; font-size: 20pt; font-weight: bold; margin-bottom: 30px; text-decoration: underline;">ABSTRACT</h1>
  <p style="font-size: 12pt; line-height: 1.8; text-align: justify; text-indent: 30px;">
  {{#if (isSufficientContext projectContext)}}
    [Generated Abstract Paragraph(s) Here - This text should be replaced by the AI-generated abstract based on the instructions above. Ensure it's a continuous block of text formatted as HTML paragraphs within this HTML paragraph tag.]
  {{else}}
    {{{projectContext}}} <!-- This will output the insufficient context placeholder passed from the flow -->
  {{/if}}
  </p>
  <br><br>
  <p style="font-size: 12pt; font-weight: bold;">Keywords: <span style="font-weight: normal;">{{#if (isSufficientContext projectContext)}}[Suggest 3-5 relevant keywords based on the project context, separated by commas]{{else}}[Keywords placeholder - add 3-5 relevant keywords]{{/if}}</span></p>
  </div>

  Generate the abstract now based on the title, context, and key findings (if any).
  Fill in the "[Generated Abstract Paragraph(s) Here]" and "[Suggest 3-5 relevant keywords...]" parts, or use placeholders as instructed.
  `,
  helpers: {
    isSufficientContext: (context: string | undefined) => {
      return context !== "[Abstract content cannot be generated due to insufficient project context. Please provide more details.]";
    }
  }
});

const generateAbstractFlow = ai.defineFlow(
  {
    name: 'generateAbstractFlow',
    inputSchema: GenerateAbstractInputSchema,
    outputSchema: GenerateAbstractOutputSchema,
  },
  async (rawInput) => {
    let processedProjectContext = rawInput.projectContext?.trim() || "";
    const insufficientContextPlaceholder = "[Abstract content cannot be generated due to insufficient project context. Please provide more details.]";
    const minContextLengthForGeneration = 50; // Minimum characters for project context to be considered sufficient

    if (processedProjectContext.length < minContextLengthForGeneration) {
        processedProjectContext = insufficientContextPlaceholder;
    }

    const input = {
      projectTitle: rawInput.projectTitle?.trim() || "[Project Title Placeholder]",
      projectContext: processedProjectContext,
      keyFindings: rawInput.keyFindings,
    };

    const { output } = await prompt(input);
    return output!;
  }
);
