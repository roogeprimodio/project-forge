'use server';
/**
 * @fileOverview AI agent to generate a project report cover page.
 *
 * - generateCoverPage - Generates Markdown content for a cover page.
 * - GenerateCoverPageInput - Input type for the generation flow.
 * - GenerateCoverPageOutput - Output type for the generation flow.
 */

import { ai } from '@/ai/ai-instance';
import { z } from 'genkit';

const GenerateCoverPageInputSchema = z.object({
  projectTitle: z.string().describe('The full title of the project.'),
  teamDetails: z.string().describe('Team member names and their enrollment numbers (e.g., "John Doe - 123456\\nJane Smith - 654321"). Each member on a new line.'),
  degree: z.string().optional().default('Bachelor of Engineering').describe('The degree for which the project is submitted (e.g., "Bachelor of Engineering", "Master of Technology").'),
  branch: z.string().describe('The branch or department (e.g., "Computer Engineering", "Mechanical Engineering").'),
  instituteName: z.string().describe('The name of the institute or college.'),
  universityName: z.string().optional().describe('The name of the university (if different from institute).'),
  submissionDate: z.string().optional().default(new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })).describe('The date of submission (e.g., "May 2024"). Defaults to current date.'),
  universityLogoUrl: z.string().optional().describe('URL or Base64 Data URI of the university logo. If provided, include it in the Markdown.'),
  collegeLogoUrl: z.string().optional().describe('URL or Base64 Data URI of the college logo. If provided, include it in the Markdown below the university logo or as appropriate.'),
});
export type GenerateCoverPageInput = z.infer<typeof GenerateCoverPageInputSchema>;

const GenerateCoverPageOutputSchema = z.object({
  coverPageMarkdown: z.string().describe('The generated Markdown content for the cover page. Should be well-formatted and include all relevant details.'),
});
export type GenerateCoverPageOutput = z.infer<typeof GenerateCoverPageOutputSchema>;

export async function generateCoverPage(input: GenerateCoverPageInput): Promise<GenerateCoverPageOutput> {
  return generateCoverPageFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateCoverPagePrompt',
  input: { schema: GenerateCoverPageInputSchema },
  output: { schema: GenerateCoverPageOutputSchema },
  prompt: `You are an AI assistant tasked with generating a professional cover page for a student project report in Markdown format.

  **Project Details:**
  - Project Title: {{{projectTitle}}}
  - Submitted by:
    {{{teamDetails}}}
  - In partial fulfillment for the award of the degree of: {{{degree}}}
  - In: {{{branch}}}
  - Institute: {{{instituteName}}}
  {{#if universityName}}- University: {{{universityName}}}{{/if}}
  - Submission Date: {{{submissionDate}}}
  {{#if universityLogoUrl}}- University Logo: {{universityLogoUrl}} (Include as Markdown image: ![University Logo]({{{universityLogoUrl}}})){{/if}}
  {{#if collegeLogoUrl}}- College Logo: {{collegeLogoUrl}} (Include as Markdown image: ![College Logo]({{{collegeLogoUrl}}})){{/if}}

  **Instructions:**
  1.  Create a well-structured cover page using Markdown.
  2.  The Project Title should be the main heading (e.g., using '#').
  3.  Clearly list the team members and their enrollment numbers.
  4.  Include the degree, branch, institute, and university (if provided).
  5.  Include the submission date.
  6.  If logo URLs are provided, embed them using Markdown image syntax (e.g., \`![Alt text](URL)\`). Place logos appropriately, perhaps at the top or centered.
  7.  Use appropriate Markdown formatting for headings, bold text, lists, etc., to make the page look professional and readable.
  8.  Ensure all provided information is accurately reflected.
  9.  The output should be ONLY the Markdown content for the cover page. Do not include any other text, explanations, or conversational elements.

  **Example Structure (Conceptual):**

  \`\`\`markdown
  {{#if universityLogoUrl}}
  <div style="text-align: center;">
    <img src="{{{universityLogoUrl}}}" alt="University Logo" style="height: 80px; margin-bottom: 10px;">
  </div>
  {{/if}}
  {{#if collegeLogoUrl}}
  <div style="text-align: center;">
    <img src="{{{collegeLogoUrl}}}" alt="College Logo" style="height: 60px; margin-bottom: 20px;">
  </div>
  {{/if}}

  # {{{projectTitle}}}

  A Project Report Submitted
  
  By
  
  {{#each (split teamDetails '\n')}}
  **{{this}}**
  {{/each}}
  
  In partial fulfillment for the award of the degree of
  
  **{{{degree}}}**
  
  In
  
  **{{{branch}}}**
  
  At
  
  **{{{instituteName}}}**
  {{#if universityName}}
  ({{{universityName}}})
  {{/if}}
  
  {{{submissionDate}}}
  \`\`\`

  Generate the Markdown content now.
  `,
});

const generateCoverPageFlow = ai.defineFlow(
  {
    name: 'generateCoverPageFlow',
    inputSchema: GenerateCoverPageInputSchema,
    outputSchema: GenerateCoverPageOutputSchema,
  },
  async input => {
    // Helper to split teamDetails for the prompt, Handlebars can't do complex logic
    const processedInput = {
      ...input,
      teamDetailsLines: input.teamDetails.split('\n').filter(line => line.trim() !== '')
    };

    const { output } = await prompt(processedInput);
    return output!;
  }
);
