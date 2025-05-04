'use server';

/**
 * @fileOverview A table of contents generation AI agent.
 *
 * - generateTableOfContents - A function that handles the table of contents generation process.
 * - GenerateTableOfContentsInput - The input type for the generateTableOfContents function.
 * - GenerateTableOfContentsOutput - The return type for the generateTableOfContents function.
 */

import {ai} from '@/ai/ai-instance';
import {z} from 'genkit';

const GenerateTableOfContentsInputSchema = z.object({
  reportContent: z
    .string()
    .describe('The complete content of the project report.'),
});
export type GenerateTableOfContentsInput = z.infer<typeof GenerateTableOfContentsInputSchema>;

const GenerateTableOfContentsOutputSchema = z.object({
  tableOfContents: z.string().describe('The table of contents for the report.'),
});
export type GenerateTableOfContentsOutput = z.infer<typeof GenerateTableOfContentsOutputSchema>;

export async function generateTableOfContents(
  input: GenerateTableOfContentsInput
): Promise<GenerateTableOfContentsOutput> {
  return generateTableOfContentsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateTableOfContentsPrompt',
  input: {
    schema: z.object({
      reportContent: z
        .string()
        .describe('The complete content of the project report.'),
    }),
  },
  output: {
    schema: z.object({
      tableOfContents: z.string().describe('The table of contents for the report.'),
    }),
  },
  prompt: `You are an expert in generating tables of contents for project reports.

  Given the complete content of the project report, generate a table of contents that is well-structured and easy to read.

  Report Content: {{{reportContent}}}`,
});

const generateTableOfContentsFlow = ai.defineFlow<
  typeof GenerateTableOfContentsInputSchema,
  typeof GenerateTableOfContentsOutputSchema
>({
  name: 'generateTableOfContentsFlow',
  inputSchema: GenerateTableOfContentsInputSchema,
  outputSchema: GenerateTableOfContentsOutputSchema,
},
async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
