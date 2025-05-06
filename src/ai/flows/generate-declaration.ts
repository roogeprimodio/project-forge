'use server';
/**
 * @fileOverview AI agent to generate a project report declaration.
 *
 * - generateDeclaration - Generates Markdown content for a declaration.
 * - GenerateDeclarationInput - Input type for the generation flow.
 * - GenerateDeclarationOutput - Output type for the generation flow.
 */

import { ai } from '@/ai/ai-instance';
import { z } from 'genkit';

const GenerateDeclarationInputSchema = z.object({
  projectTitle: z.string().describe('The full title of the project.'),
  teamDetails: z.string().describe('Team member names and their enrollment numbers (e.g., "John Doe - 123456\\nJane Smith - 654321"). Each member on a new line.'),
  degree: z.string().optional().default('Bachelor of Engineering').describe('The degree for which the project is submitted.'),
  branch: z.string().describe('The branch or department.'),
  instituteName: z.string().describe('The name of the institute or college.'),
  guideName: z.string().describe('The name of the project guide.'),
  submissionDate: z.string().optional().default(new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })).describe('The date of submission. Defaults to current date.'),
});
export type GenerateDeclarationInput = z.infer<typeof GenerateDeclarationInputSchema>;

const GenerateDeclarationOutputSchema = z.object({
  declarationMarkdown: z.string().describe('The generated Markdown content for the declaration. Should be well-formatted and formal.'),
});
export type GenerateDeclarationOutput = z.infer<typeof GenerateDeclarationOutputSchema>;

export async function generateDeclaration(input: GenerateDeclarationInput): Promise<GenerateDeclarationOutput> {
  return generateDeclarationFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateDeclarationPrompt',
  input: { schema: GenerateDeclarationInputSchema.extend({ teamDetailsLines: z.array(z.string()).optional() }) },
  output: { schema: GenerateDeclarationOutputSchema },
  prompt: `You are an AI assistant tasked with generating a student project declaration in Markdown format.

  **Declaration Details:**
  - Project Title: {{{projectTitle}}}
  - Student(s) & Enrollment:
    {{#if teamDetailsLines}}
    {{#each teamDetailsLines}}
    - {{this}}
    {{/each}}
    {{else}}
    **{{{teamDetails}}}**
    {{/if}}
  - Degree: {{{degree}}}
  - Branch: {{{branch}}}
  - Institute: {{{instituteName}}}
  - Project Guide: {{{guideName}}}
  - Date: {{{submissionDate}}}

  **Instructions:**
  1.  Create a formal declaration layout using Markdown.
  2.  The heading should be "DECLARATION".
  3.  The text should state that the student(s) declare the project report titled "{{{projectTitle}}}" is their own original work, carried out under the guidance of {{{guideName}}}.
  4.  Specify that the work has not been submitted in part or full for any other degree or diploma.
  5.  Include placeholders for the signatures of all team members, along with their names and enrollment numbers as provided in teamDetailsLines. Use HTML for multi-line signature blocks if needed.
  6.  Include the submission date.
  7.  Use Markdown for professional formatting.
  8.  Output ONLY the Markdown content. No extra text or explanations.

  **Example Structure (Conceptual):**

  \`\`\`markdown
  # DECLARATION

  We, the undersigned, hereby declare that the project report entitled
  
  **"{{{projectTitle}}}"**
  
  submitted for the degree of **{{{degree}}}** in **{{{branch}}}** at **{{{instituteName}}}**, is a record of original work done by us under the guidance of **{{{guideName}}}**.
  
  This work has not been submitted in part or full for any other degree or diploma of any university or institution.

  <br><br><br>

  {{#each teamDetailsLines}}
  <div style="margin-top: 20px; text-align: left;">
    _________________________<br>
    **{{this}}**
  </div>
  {{/each}}

  <br>
  Date: {{{submissionDate}}}
  \`\`\`

  Generate the Markdown content now.
  `,
});

const generateDeclarationFlow = ai.defineFlow(
  {
    name: 'generateDeclarationFlow',
    inputSchema: GenerateDeclarationInputSchema,
    outputSchema: GenerateDeclarationOutputSchema,
  },
  async input => {
    const teamDetailsLines = input.teamDetails.split('\n').filter(line => line.trim() !== '');
    const processedInput = {
      ...input,
      teamDetailsLines: teamDetailsLines
    };
    const { output } = await prompt(processedInput);
    return output!;
  }
);
