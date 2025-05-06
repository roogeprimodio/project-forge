'use server';
/**
 * @fileOverview AI agent to generate a project report certificate.
 *
 * - generateCertificate - Generates Markdown content for a certificate.
 * - GenerateCertificateInput - Input type for the generation flow.
 * - GenerateCertificateOutput - Output type for the generation flow.
 */

import { ai } from '@/ai/ai-instance';
import { z } from 'genkit';

const GenerateCertificateInputSchema = z.object({
  projectTitle: z.string().describe('The full title of the project.'),
  teamDetails: z.string().describe('Team member names and their enrollment numbers (e.g., "John Doe - 123456\\nJane Smith - 654321"). Each member on a new line.'),
  degree: z.string().optional().default('Bachelor of Engineering').describe('The degree for which the project is submitted.'),
  branch: z.string().describe('The branch or department.'),
  instituteName: z.string().describe('The name of the institute or college.'),
  guideName: z.string().describe('The name of the project guide.'),
  hodName: z.string().optional().describe('The name of the Head of Department.'),
  submissionYear: z.string().optional().default(new Date().getFullYear().toString()).describe('The academic year or submission year (e.g., "2023-2024"). Defaults to current year.'),
  collegeLogoUrl: z.string().optional().describe('URL or Base64 Data URI of the college logo. If provided, include it.'),
});
export type GenerateCertificateInput = z.infer<typeof GenerateCertificateInputSchema>;

const GenerateCertificateOutputSchema = z.object({
  certificateMarkdown: z.string().describe('The generated Markdown content for the certificate. Should be well-formatted and official-looking.'),
});
export type GenerateCertificateOutput = z.infer<typeof GenerateCertificateOutputSchema>;

export async function generateCertificate(input: GenerateCertificateInput): Promise<GenerateCertificateOutput> {
  return generateCertificateFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateCertificatePrompt',
  input: { schema: GenerateCertificateInputSchema.extend({ teamDetailsLines: z.array(z.string()).optional() }) },
  output: { schema: GenerateCertificateOutputSchema },
  prompt: `You are an AI assistant tasked with generating a project certificate in Markdown format.

  **Certificate Details:**
  - Project Title: {{{projectTitle}}}
  - Student(s):
    {{#if teamDetailsLines}}
    {{#each teamDetailsLines}}
    - **{{this}}**
    {{/each}}
    {{else}}
    **{{{teamDetails}}}**
    {{/if}}
  - Degree: {{{degree}}}
  - Branch: {{{branch}}}
  - Institute: {{{instituteName}}}
  - Project Guide: {{{guideName}}}
  {{#if hodName}}- Head of Department: {{{hodName}}}{{/if}}
  - Year: {{{submissionYear}}}
  {{#if collegeLogoUrl}}- College Logo: {{collegeLogoUrl}} (Include as Markdown image: ![College Logo]({{{collegeLogoUrl}}})){{/if}}

  **Instructions:**
  1.  Create a formal certificate layout using Markdown.
  2.  The institute name and "CERTIFICATE" should be prominent headings.
  3.  State that the project titled "{{{projectTitle}}}" is a bonafide record of work carried out by the listed student(s).
  4.  Mention it's in partial fulfillment of the requirements for the award of the {{{degree}}} in {{{branch}}}.
  5.  Include placeholders for signatures of the Project Guide and Head of Department (if HOD name is provided).
  6.  Add the submission year.
  7.  If a college logo URL is provided, embed it at the top center.
  8.  Use Markdown for professional formatting (bold, headings, horizontal lines for signature spaces). Use HTML for layout if necessary (e.g., centering logo, signature layout).
  9.  Output ONLY the Markdown content. No extra text or explanations.

  **Example Structure (Conceptual):**

  \`\`\`markdown
  {{#if collegeLogoUrl}}
  <div style="text-align: center;">
    <img src="{{{collegeLogoUrl}}}" alt="College Logo" style="height: 70px; margin-bottom: 15px;">
  </div>
  {{/if}}

  ## {{{instituteName}}}
  ### Department of {{{branch}}}

  # CERTIFICATE

  This is to certify that the project report entitled
  
  **"{{{projectTitle}}}"**
  
  is a bonafide record of the work carried out by:
  
  {{#each teamDetailsLines}}
  - **{{this}}**
  {{/each}}
  
  in partial fulfillment of the requirements for the award of the degree of **{{{degree}}}** in **{{{branch}}}** during the academic year {{{submissionYear}}}.

  <br><br><br> 

  <div style="display: flex; justify-content: space-between; margin-top: 50px;">
    <div style="text-align: left;">
      _________________________<br>
      **{{{guideName}}}**<br>
      Project Guide
    </div>
    {{#if hodName}}
    <div style="text-align: right;">
      _________________________<br>
      **{{{hodName}}}**<br>
      Head of Department
    </div>
    {{/if}}
  </div>
  \`\`\`

  Generate the Markdown content now.
  `,
});

const generateCertificateFlow = ai.defineFlow(
  {
    name: 'generateCertificateFlow',
    inputSchema: GenerateCertificateInputSchema,
    outputSchema: GenerateCertificateOutputSchema,
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
