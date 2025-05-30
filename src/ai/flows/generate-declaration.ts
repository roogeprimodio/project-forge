
'use server';
/**
 * @fileOverview AI agent to generate a project report declaration.
 *
 * - generateDeclaration - Generates HTML content for a declaration.
 * - GenerateDeclarationInput - Input type for the generation flow.
 * - GenerateDeclarationOutput - Output type for the generation flow.
 */

import { ai } from '@/ai/ai-instance';
import { z } from 'genkit';
import { BaseAiInputSchema, getModel, getConfig, getMissingApiKeyError } from './common';

const GenerateDeclarationInputSchemaInternal = z.object({
  projectTitle: z.string().describe('The full title of the project.'),
  teamDetails: z.string().describe('Team member names and their enrollment numbers (e.g., "John Doe - 123456\\nJane Smith - 654321"). Each member on a new line.'),
  degree: z.string().optional().default('Bachelor of Engineering').describe('The degree for which the project is submitted.'),
  branch: z.string().describe('The branch or department.'),
  instituteName: z.string().describe('The name of the institute or college.'),
  submissionDate: z.string().optional().default(new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })).describe('The date of submission. Defaults to current date.'),
});

export const GenerateDeclarationInputSchema = GenerateDeclarationInputSchemaInternal.merge(BaseAiInputSchema);
export type GenerateDeclarationInput = z.infer<typeof GenerateDeclarationInputSchema>;

const GenerateDeclarationOutputSchema = z.object({
  declarationMarkdown: z.string().describe('The generated HTML content for the declaration. Should be well-formatted and formal.'),
  error: z.string().optional(),
});
export type GenerateDeclarationOutput = z.infer<typeof GenerateDeclarationOutputSchema>;

export async function generateDeclaration(input: GenerateDeclarationInput): Promise<GenerateDeclarationOutput> {
  const apiKeyError = getMissingApiKeyError(
    input.aiModel || 'gemini',
    input.userApiKey,
    !!process.env.GOOGLE_GENAI_API_KEY,
    !!process.env.OPENAI_API_KEY
  );
  if (apiKeyError) {
    return { declarationMarkdown: '', error: apiKeyError };
  }
  return generateDeclarationFlow(input);
}

const generateDeclarationPrompt = ai.definePrompt({
  name: 'generateDeclarationPrompt',
  input: { schema: GenerateDeclarationInputSchemaInternal.extend({
    teamDetailsLines: z.array(z.string()).optional(),
    pronoun: z.string().optional(),
    objectPronoun: z.string().optional().describe('The object pronoun to use (e.g., "us" or "me") based on team size.'),
  }) },
  output: { schema: GenerateDeclarationOutputSchema },
  prompt: `You are an AI assistant tasked with generating a student project declaration. The output must be the HTML content for the declaration, ready to be rendered.

  **Declaration Details (Use these to customize the template):**
  - Project Title: {{{projectTitle}}}
  - Student(s) & Enrollment:
    {{#if teamDetailsLines.length}}
    {{#each teamDetailsLines}}
    - {{this}}
    {{/each}}
    {{else if teamDetails}}
    {{{teamDetails}}}
    {{else}}
    [Team Member Names & Enrollment Numbers Placeholder]
    {{/if}}
  - Pronoun to use (I/We): {{{pronoun}}}
  - Object Pronoun (me/us): {{{objectPronoun}}}
  - Degree: {{{degree}}}
  - Branch: {{{branch}}}
  - Institute: {{{instituteName}}}
  - Date: {{{submissionDate}}}

  **Instructions:**
  1.  Output ONLY the HTML content. Do NOT wrap it in Markdown code fences.
  2.  Replace placeholders with actual data. If data is missing, use the exact placeholder string from input.
  3.  Use "[City/Town Placeholder]" for Place.

  **Required Output Structure (HTML content):**
  <div style="font-family: 'Times New Roman', serif; padding: 20px; margin: 20px; page-break-after: always;">
    <h1 style="text-align: center; font-size: 20pt; font-weight: bold; margin-bottom: 40px; text-decoration: underline;">DECLARATION</h1>
    <p style="font-size: 12pt; line-height: 1.8; text-align: justify; margin-bottom: 20px;">
    {{{pronoun}}}, the undersigned, hereby declare that the project report entitled
    </p>
    <p style="font-size: 14pt; font-weight: bold; text-align: center; margin-bottom: 20px;">
    "{{{projectTitle}}}"
    </p>
    <p style="font-size: 12pt; line-height: 1.8; text-align: justify; margin-bottom: 20px;">
    submitted for the degree of <strong>{{{degree}}}</strong> in <strong>{{{branch}}}</strong> at <strong>{{{instituteName}}}</strong>, is a record of original work done by {{{objectPronoun}}}. This work has not been submitted in part or full for any other degree or diploma of any university or institution.
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
  Generate the HTML content now.
  `
});

const generateDeclarationFlow = ai.defineFlow(
  {
    name: 'generateDeclarationFlow',
    inputSchema: GenerateDeclarationInputSchema,
    outputSchema: GenerateDeclarationOutputSchema,
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
      submissionDate: promptData.submissionDate?.trim() || new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
    };

    const teamDetailsLines = inputForTemplate.teamDetails !== "[Team Member Names & Enrollment Numbers Placeholder]"
      ? inputForTemplate.teamDetails.split('\n').filter(line => line.trim() !== '')
      : [];
    const isPlural = teamDetailsLines.length > 1 || (teamDetailsLines.length === 0 && inputForTemplate.teamDetails.includes('\n'));

    const finalInput = {
      ...inputForTemplate,
      teamDetailsLines: teamDetailsLines.length > 0 ? teamDetailsLines : undefined,
      teamDetails: teamDetailsLines.length === 0 ? inputForTemplate.teamDetails : undefined,
      pronoun: isPlural ? "We" : "I",
      objectPronoun: isPlural ? "us" : "me",
    };

    try {
      const { output } = await generateDeclarationPrompt(finalInput, { model, config });
      return output!;
    } catch (e: any) {
      console.error("Error in generateDeclarationFlow:", e);
      return { declarationMarkdown: '', error: `AI generation failed: ${e.message || 'Unknown error'}` };
    }
  }
);
