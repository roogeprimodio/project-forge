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
  input: { schema: GenerateCoverPageInputSchema.extend({ teamDetailsLines: z.array(z.string()).optional() }) },
  output: { schema: GenerateCoverPageOutputSchema },
  prompt: `You are an AI assistant tasked with generating a professional cover page for a student project report in Markdown format, strictly adhering to the HTML structure provided below for layout.

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
  {{#if universityLogoUrl}}- University Logo (use if provided): {{universityLogoUrl}} {{/if}}
  {{#if collegeLogoUrl}}- College Logo (use if provided): {{collegeLogoUrl}} {{/if}}
  {{#if universityName}}- University: {{{universityName}}} (Affiliated to){{/if}}

  **Instructions:**
  1.  Output ONLY the Markdown and HTML content as per the structure below. Do NOT include any other text, explanations, or conversational elements.
  2.  Replace dynamic placeholders like \`{{{projectTitle}}}\`, \`{{{teamDetails}}}\`, etc., with the actual data provided for those fields.
  3.  **Placeholder Usage for Dynamic Fields:** If a dynamic piece of information is not provided or is an empty string, **the system will provide a specific placeholder string for that field (e.g., \`[Team Member Names & Enrollment Numbers Placeholder]\`). Your task is to output *this exact placeholder string* as provided in the input if no actual data is available. Do not replace these system-provided placeholders with "N/A" or try to invent information.**
      *   For Project Title: Use "[Project Title Placeholder]" if input \`projectTitle\` is that value.
      *   For Team Details: If input \`teamDetails\` is "[Team Member Names & Enrollment Numbers Placeholder]", output that exact string.
      *   For Degree: Use "[Degree Placeholder]" if input \`degree\` is that value.
      *   For Branch: Use "[Branch Placeholder]" if input \`branch\` is that value.
      *   For Institute Name: Use "[Institute Name Placeholder]" if input \`instituteName\` is that value.
      *   For University Name (if applicable): Use "[University Name Placeholder]" if input \`universityName\` is that value.
      *   For Submission Date: Use "[Submission Date Placeholder]" if input \`submissionDate\` is that value.
  4.  If a logo URL (universityLogoUrl or collegeLogoUrl) is provided, embed it using Markdown image syntax (\`![Alt text](URL)\`) within a centered div. If not provided, omit the img tag entirely.
  5.  Ensure all text is properly centered or aligned as indicated in the HTML structure.

  **Required Output Structure (Markdown with embedded HTML for layout):**

  \`\`\`markdown
  <div style="text-align: center; font-family: 'Times New Roman', serif; page-break-after: always; border: 1px solid #ccc; padding: 20px; min-height: 250mm; display: flex; flex-direction: column; justify-content: space-between;">

  <div>
    {{#if universityLogoUrl}}
    <img src="{{{universityLogoUrl}}}" alt="University Logo" style="height: 80px; margin-bottom: 15px; margin-top: 30px;">
    <br>
    {{/if}}
    {{#if collegeLogoUrl}}
    <img src="{{{collegeLogoUrl}}}" alt="College Logo" style="height: 70px; margin-bottom: 25px;">
    <br>
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
  async (rawInput) => {
    // Explicitly use placeholders if raw input fields are empty or just whitespace
    const input = {
      projectTitle: rawInput.projectTitle?.trim() || "[Project Title Placeholder]",
      teamDetails: rawInput.teamDetails?.trim() || "[Team Member Names & Enrollment Numbers Placeholder]",
      degree: rawInput.degree?.trim() || "[Degree Placeholder]",
      branch: rawInput.branch?.trim() || "[Branch Placeholder]",
      instituteName: rawInput.instituteName?.trim() || "[Institute Name Placeholder]",
      universityName: rawInput.universityName?.trim() || undefined, // Keep undefined if empty, Handlebars will omit
      submissionDate: rawInput.submissionDate?.trim() || "[Submission Date Placeholder]",
      universityLogoUrl: rawInput.universityLogoUrl,
      collegeLogoUrl: rawInput.collegeLogoUrl,
    };

    const teamDetailsLines = input.teamDetails !== "[Team Member Names & Enrollment Numbers Placeholder]"
      ? input.teamDetails.split('\\n').filter(line => line.trim() !== '')
      : [];

    const processedInput = {
      ...input,
      teamDetailsLines: teamDetailsLines.length > 0 ? teamDetailsLines : undefined,
      teamDetails: teamDetailsLines.length > 0 ? undefined : input.teamDetails,
    };

    const { output } = await prompt(processedInput);
    return output!;
  }
);
