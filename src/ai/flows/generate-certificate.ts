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
  prompt: `You are an AI assistant tasked with generating a project certificate in Markdown format, strictly adhering to the HTML structure for layout.

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
  {{#if collegeLogoUrl}}- College Logo: {{collegeLogoUrl}} {{/if}}

  **Instructions:**
  1.  Output ONLY the Markdown and HTML content as per the structure below. Do not include any other text, explanations, or conversational elements.
  2.  Replace placeholders like \`{{{projectTitle}}}\` with the actual data.
  3.  If a college logo URL is provided, embed it using Markdown image syntax (\`![Alt text](URL)\`) within a centered div.
  4.  Ensure text alignment and formatting (bold, headings) match the provided HTML structure.
  5.  Signature blocks should use \`div\`s with appropriate styling for alignment.

  **Required Output Structure (Markdown with embedded HTML for layout):**

  \`\`\`markdown
  <div style="text-align: center; font-family: 'Times New Roman', serif; padding: 20px; border: 1px solid #ccc; margin: 20px; page-break-after: always;">

  {{#if collegeLogoUrl}}
  <img src="{{{collegeLogoUrl}}}" alt="College Logo" style="height: 70px; margin-bottom: 15px; margin-top: 10px;">
  <br>
  {{/if}}

  <h2 style="font-size: 18pt; font-weight: bold; margin-top: 20px; margin-bottom: 5px;">{{{instituteName}}}</h2>
  <h3 style="font-size: 14pt; margin-bottom: 25px;">Department of {{{branch}}}</h3>

  <h1 style="font-size: 22pt; font-weight: bold; margin-bottom: 30px; text-decoration: underline;">CERTIFICATE</h1>

  <p style="font-size: 12pt; line-height: 1.6; text-align: justify; margin-bottom: 15px;">
  This is to certify that the project report entitled
  </p>
  <p style="font-size: 14pt; font-weight: bold; margin-bottom: 15px;">
  "{{{projectTitle}}}"
  </p>
  <p style="font-size: 12pt; line-height: 1.6; text-align: justify; margin-bottom: 15px;">
  is a bonafide record of the work carried out by:
  </p>

  <div style="font-size: 12pt; font-weight: bold; margin-bottom: 20px; text-align: center;">
  {{#each teamDetailsLines}}
  {{this}}<br>
  {{/each}}
  </div>
  
  <p style="font-size: 12pt; line-height: 1.6; text-align: justify; margin-bottom: 30px;">
  in partial fulfillment of the requirements for the award of the degree of <strong>{{{degree}}}</strong> in <strong>{{{branch}}}</strong> during the academic year {{{submissionYear}}}.
  </p>

  <div style="display: flex; justify-content: space-between; margin-top: 70px; font-size: 12pt;">
    <div style="text-align: left;">
      <div style="height: 30px;"> </div> <!-- Space for signature -->
      <hr style="border-top: 1px solid #000; width: 150px; margin-bottom: 5px;">
      <strong>{{{guideName}}}</strong><br>
      (Project Guide)
    </div>
    {{#if hodName}}
    <div style="text-align: right;">
      <div style="height: 30px;"> </div> <!-- Space for signature -->
      <hr style="border-top: 1px solid #000; width: 150px; margin-bottom: 5px;">
      <strong>{{{hodName}}}</strong><br>
      (Head of Department)
    </div>
    {{/if}}
  </div>
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

