
'use server';
/**
 * @fileOverview AI agent to generate a project report cover page.
 *
 * - generateCoverPage - Generates HTML content for a cover page.
 * - GenerateCoverPageInput - Input type for the generation flow.
 * - GenerateCoverPageOutput - Output type for the generation flow.
 */

import { ai } from '@/ai/ai-instance';
import { z } from 'genkit';
import { BaseAiInputSchema, getModel, getConfig, getMissingApiKeyError } from './common';

const GenerateCoverPageInputSchemaInternal = z.object({
  projectTitle: z.string().describe('The full title of the project.'),
  teamDetails: z.string().describe('Team member names and their enrollment numbers (e.g., "John Doe - 123456\\nJane Smith - 654321"). Each member on a new line.'),
  degree: z.string().optional().default('Bachelor of Engineering').describe('The degree for which the project is submitted (e.g., "Bachelor of Engineering", "Master of Technology").'),
  branch: z.string().describe('The branch or department (e.g., "Computer Engineering", "Mechanical Engineering").'),
  instituteName: z.string().describe('The name of the institute or college.'),
  universityName: z.string().optional().describe('The name of the university (if different from institute).'),
  submissionDate: z.string().optional().default(new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })).describe('The date of submission (e.g., "May 2024"). Defaults to current date.'),
  universityLogoUrl: z.string().optional().describe('URL or Base64 Data URI of the university logo. If provided, include it.'),
  collegeLogoUrl: z.string().optional().describe('URL or Base64 Data URI of the college logo. If provided, include it below the university logo or as appropriate.'),
});

export const GenerateCoverPageInputSchema = GenerateCoverPageInputSchemaInternal.merge(BaseAiInputSchema);
export type GenerateCoverPageInput = z.infer<typeof GenerateCoverPageInputSchema>;

const GenerateCoverPageOutputSchema = z.object({
  coverPageMarkdown: z.string().describe('The generated HTML content for the cover page. Should be well-formatted and include all relevant details.'),
  error: z.string().optional(),
});
export type GenerateCoverPageOutput = z.infer<typeof GenerateCoverPageOutputSchema>;

export async function generateCoverPage(input: GenerateCoverPageInput): Promise<GenerateCoverPageOutput> {
   const apiKeyError = getMissingApiKeyError(
    input.aiModel || 'gemini',
    input.userApiKey,
    !!process.env.GOOGLE_GENAI_API_KEY,
    !!process.env.OPENAI_API_KEY
  );
  if (apiKeyError) {
    return { coverPageMarkdown: '', error: apiKeyError };
  }
  return generateCoverPageFlow(input);
}

const generateCoverPagePrompt = ai.definePrompt({
  name: 'generateCoverPagePrompt',
  input: { schema: GenerateCoverPageInputSchemaInternal.extend({ teamDetailsLines: z.array(z.string()).optional() }) },
  output: { schema: GenerateCoverPageOutputSchema },
  prompt: `You are an AI assistant tasked with generating a professional cover page for a student project report. The output must be the HTML content for the cover page, ready to be rendered.

  **Project Details (Use these to customize the template):**
  - Project Title: {{{projectTitle}}}
  - Team Details:
    {{#if teamDetailsLines.length}}
      {{#each teamDetailsLines}}
      - {{this}}
      {{/each}}
    {{else if teamDetails}}
      {{{teamDetails}}}
    {{else}}
      [Team Member Names & Enrollment Numbers Placeholder]
    {{/if}}
  - Degree: {{{degree}}}
  - Branch: {{{branch}}}
  - Institute: {{{instituteName}}}
  - Submission Date: {{{submissionDate}}}
  {{#if universityLogoUrl}}- University Logo URL: {{universityLogoUrl}} {{/if}}
  {{#if collegeLogoUrl}}- College Logo URL: {{collegeLogoUrl}} {{/if}}
  {{#if universityName}}- University (Affiliated to): {{{universityName}}}{{/if}}

  **Instructions:**
  1.  Output ONLY the HTML content for the cover page. Do NOT wrap it in Markdown code fences.
  2.  Replace dynamic placeholders with actual data. If data is missing, use the exact placeholder string provided in the input (e.g., "[Project Title Placeholder]").
  3.  Embed logos using \`<img>\` tags with \`alt\` and basic styling (\`height: 80px/70px; margin-bottom: 15px/25px;\`). Omit if no URL.

  **Required Output Structure (HTML content):**
  <div style="text-align: center; font-family: 'Times New Roman', serif; page-break-after: always; border: 1px solid #ccc; padding: 20px; min-height: 250mm; display: flex; flex-direction: column; justify-content: space-between;">
    <div>
      {{#if universityLogoUrl}}
      <img src="{{{universityLogoUrl}}}" alt="University Logo" data-ai-hint="university logo" style="height: 80px; margin-bottom: 15px; margin-top: 30px;"><br>
      {{/if}}
      {{#if collegeLogoUrl}}
      <img src="{{{collegeLogoUrl}}}" alt="College Logo" data-ai-hint="college logo" style="height: 70px; margin-bottom: 25px;"><br>
      {{/if}}
    </div>
    <div style="flex-grow: 1; display: flex; flex-direction: column; justify-content: center;">
      <h1 style="font-size: 24pt; font-weight: bold; margin-top: 10px; margin-bottom: 30px;">{{{projectTitle}}}</h1>
      <p style="font-size: 12pt; margin-bottom: 5px;"><em>A Project Report Submitted By</em></p>
      <div style="font-size: 14pt; font-weight: bold; margin-bottom: 20px;">
      {{#if teamDetailsLines.length}}
        {{#each teamDetailsLines}}
        {{this}}<br>
        {{/each}}
      {{else if teamDetails}}
        {{{teamDetails}}}
      {{else}}
        [Team Member Names & Enrollment Numbers Placeholder]
      {{/if}}
      </div>
      <p style="font-size: 12pt; margin-bottom: 5px;"><em>In partial fulfillment for the award of the degree of</em></p>
      <p style="font-size: 16pt; font-weight: bold; margin-bottom: 5px;">{{{degree}}}</p>
      <p style="font-size: 12pt; margin-bottom: 5px;"><em>In</em></p>
      <p style="font-size: 14pt; font-weight: bold; margin-bottom: 20px;">{{{branch}}}</p>
      <p style="font-size: 12pt; margin-bottom: 5px;"><em>At</em></p>
      <p style="font-size: 14pt; font-weight: bold;">{{{instituteName}}}</p>
      {{#if universityName}}
      <p style="font-size: 12pt; margin-bottom: 30px;">(Affiliated to {{{universityName}}})</p>
      {{else}}
      <div style="margin-bottom: 30px;"></div>
      {{/if}}
    </div>
    <div style="margin-top: auto;">
      <p style="font-size: 12pt;">{{{submissionDate}}}</p>
    </div>
  </div>
  Generate the HTML content now.
  `,
});

const generateCoverPageFlow = ai.defineFlow(
  {
    name: 'generateCoverPageFlow',
    inputSchema: GenerateCoverPageInputSchema,
    outputSchema: GenerateCoverPageOutputSchema,
  },
  async (rawInput) => {
    const { userApiKey, aiModel, ...promptData } = rawInput;
    const model = getModel({ aiModel, userApiKey });
    const config = getConfig({ aiModel, userApiKey });

    const inputForTemplate = {
      projectTitle: promptData.projectTitle?.trim() || "[Project Title Placeholder]",
      teamDetails: promptData.teamDetails?.trim() || "[Team Member Names & Enrollment Numbers Placeholder]",
      degree: promptData.degree?.trim() || "[Degree Placeholder]",
      branch: promptData.branch?.trim() || "[Branch Placeholder]",
      instituteName: promptData.instituteName?.trim() || "[Institute Name Placeholder]",
      universityName: promptData.universityName?.trim() || undefined,
      submissionDate: promptData.submissionDate?.trim() || new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
      universityLogoUrl: promptData.universityLogoUrl,
      collegeLogoUrl: promptData.collegeLogoUrl,
    };

    const teamDetailsLines = inputForTemplate.teamDetails !== "[Team Member Names & Enrollment Numbers Placeholder]"
      ? inputForTemplate.teamDetails.split('\n').filter(line => line.trim() !== '')
      : [];

    const finalInput = {
      ...inputForTemplate,
      teamDetailsLines: teamDetailsLines.length > 0 ? teamDetailsLines : undefined,
      teamDetails: teamDetailsLines.length === 0 ? inputForTemplate.teamDetails : undefined,
    };

    try {
      const { output } = await generateCoverPagePrompt(finalInput, { model, config });
      return output!;
    } catch (e: any) {
      console.error("Error in generateCoverPageFlow:", e);
      return { coverPageMarkdown: '', error: `AI generation failed: ${e.message || 'Unknown error'}` };
    }
  }
);
