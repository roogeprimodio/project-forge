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
  // guideName: z.string().describe('The name of the project guide.'), // Guide name not typically in declaration text
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
  input: { schema: GenerateDeclarationInputSchema.extend({ teamDetailsLines: z.array(z.string()).optional(), pronoun: z.string().optional() }) },
  output: { schema: GenerateDeclarationOutputSchema },
  prompt: `You are an AI assistant tasked with generating a student project declaration in Markdown format, strictly adhering to the HTML structure for layout.

  **Declaration Details (Use these to customize the template):**
  - Project Title: {{{projectTitle}}}
  - Student(s) & Enrollment:
    {{#if teamDetailsLines.length}}
    {{#each teamDetailsLines}}
    - {{this}}
    {{/each}}
    {{else if teamDetails}}
    **{{{teamDetails}}}**
    {{else}}
    **[Team Member Names & Enrollment Numbers Placeholder]**
    {{/if}}
  - Pronoun to use (I/We): {{{pronoun}}}
  - Degree: {{{degree}}}
  - Branch: {{{branch}}}
  - Institute: {{{instituteName}}}
  - Date: {{{submissionDate}}}

  **Instructions:**
  1.  Output ONLY the Markdown and HTML content as per the structure below. Do not include any other text, explanations, or conversational elements.
  2.  Replace placeholders like \`{{{projectTitle}}}\` with the actual data.
  3.  **Placeholder Usage:** If a piece of information is not provided or is an empty string, use the corresponding placeholder text from the list below within the generated HTML structure.
      *   For Project Title: Use "[Project Title Placeholder]"
      *   For Team Details (if {{{teamDetails}}} is empty and teamDetailsLines is empty/not provided): Use "[Team Member Names & Enrollment Numbers Placeholder]"
      *   For Degree: Use "[Degree Placeholder]" (e.g., Bachelor of Engineering)
      *   For Branch: Use "[Branch Placeholder]" (e.g., Computer Engineering)
      *   For Institute Name: Use "[Institute Name Placeholder]"
      *   For Submission Date: Use "[Submission Date Placeholder]"
      *   For Place (City/Town): Use "[City/Town Placeholder]"
  4.  Use the determined pronoun ({{{pronoun}}}) for "We, the undersigned" or "I, the undersigned".
  5.  Ensure text alignment and formatting (bold, headings) match the provided HTML structure.
  6.  Signature blocks should list student names and enrollment numbers as provided in \`teamDetailsLines\`.

  **Required Output Structure (Markdown with embedded HTML for layout):**

  \`\`\`markdown
  <div style="font-family: 'Times New Roman', serif; padding: 20px; margin: 20px; page-break-after: always;">

  <h1 style="text-align: center; font-size: 20pt; font-weight: bold; margin-bottom: 40px; text-decoration: underline;">DECLARATION</h1>

  <p style="font-size: 12pt; line-height: 1.8; text-align: justify; margin-bottom: 20px;">
  {{{pronoun}}}, the undersigned, hereby declare that the project report entitled
  </p>
  <p style="font-size: 14pt; font-weight: bold; text-align: center; margin-bottom: 20px;">
  "{{{projectTitle}}}"
  </p>
  <p style="font-size: 12pt; line-height: 1.8; text-align: justify; margin-bottom: 20px;">
  submitted for the degree of <strong>{{{degree}}}</strong> in <strong>{{{branch}}}</strong> at <strong>{{{instituteName}}}</strong>, is a record of original work done by {{{pronounHelper 'us' ../pronoun 'me'}}}. This work has not been submitted in part or full for any other degree or diploma of any university or institution.
  </p>

  <br><br><br>

  <div style="font-size: 12pt; margin-top: 50px;">
  {{#if teamDetailsLines.length}}
    {{#each teamDetailsLines}}
    <div style="margin-bottom: 30px; display: flex; justify-content: space-between; align-items: flex-end;">
      <span style="min-width: 250px;">{{this}}</span>
      <span style="border-bottom: 1px solid #000; width: 200px; text-align: right; padding-bottom: 2px;">(Signature)</span>
    </div>
    {{/each}}
  {{else if teamDetails}}
    <div style="margin-bottom: 30px; display: flex; justify-content: space-between; align-items: flex-end;">
      <span style="min-width: 250px;">{{{teamDetails}}}</span>
      <span style="border-bottom: 1px solid #000; width: 200px; text-align: right; padding-bottom: 2px;">(Signature)</span>
    </div>
  {{else}}
     <div style="margin-bottom: 30px; display: flex; justify-content: space-between; align-items: flex-end;">
      <span style="min-width: 250px;">[Team Member Names & Enrollment Numbers Placeholder]</span>
      <span style="border-bottom: 1px solid #000; width: 200px; text-align: right; padding-bottom: 2px;">(Signature)</span>
    </div>
  {{/if}}
  </div>

  <br>
  <p style="font-size: 12pt; margin-top: 30px; text-align: left;">Date: {{{submissionDate}}}</p>
  <p style="font-size: 12pt; text-align: left;">Place: [City/Town Placeholder]</p>

  </div>
  \`\`\`

  Generate the Markdown content now.
  `,
  helpers: {
    pronounHelper: (pluralForm: string, pronoun: string, singularForm: string) => {
        return pronoun === "We" ? pluralForm : singularForm;
    }
  }
});

const generateDeclarationFlow = ai.defineFlow(
  {
    name: 'generateDeclarationFlow',
    inputSchema: GenerateDeclarationInputSchema,
    outputSchema: GenerateDeclarationOutputSchema,
  },
  async (rawInput) => {
    const input = {
      projectTitle: rawInput.projectTitle || "[Project Title Placeholder]",
      teamDetails: rawInput.teamDetails || "[Team Member Names & Enrollment Numbers Placeholder]",
      degree: rawInput.degree || "[Degree Placeholder]",
      branch: rawInput.branch || "[Branch Placeholder]",
      instituteName: rawInput.instituteName || "[Institute Name Placeholder]",
      submissionDate: rawInput.submissionDate || "[Submission Date Placeholder]",
    };
    
    const teamDetailsLines = input.teamDetails !== "[Team Member Names & Enrollment Numbers Placeholder]" ? input.teamDetails.split('\n').filter(line => line.trim() !== '') : [];
    const isPlural = teamDetailsLines.length > 1 || (teamDetailsLines.length === 0 && input.teamDetails.includes('\n'));


    const processedInput = {
      ...input,
      teamDetailsLines: teamDetailsLines.length > 0 ? teamDetailsLines : undefined,
      teamDetails: teamDetailsLines.length > 0 ? undefined : input.teamDetails,
      pronoun: isPlural ? "We" : "I",
    };
    const { output } = await prompt(processedInput);
    return output!;
  }
);
