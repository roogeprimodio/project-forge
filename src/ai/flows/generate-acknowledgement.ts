
'use server';
/**
 * @fileOverview AI agent to generate a project report acknowledgement section.
 *
 * - generateAcknowledgement - Generates HTML content for an acknowledgement.
 * - GenerateAcknowledgementInput - Input type for the generation flow.
 * - GenerateAcknowledgementOutput - Output type for the generation flow.
 */

import { ai } from '@/ai/ai-instance';
import { z } from 'genkit';

const GenerateAcknowledgementInputSchema = z.object({
  projectTitle: z.string().describe('The full title of the project.'),
  guideName: z.string().describe('The name of the project guide.'),
  instituteName: z.string().describe('The name of the institute or college.'),
  branch: z.string().describe('The branch or department.'),
  hodName: z.string().optional().describe('The name of the Head of Department (optional).'),
  teamDetails: z.string().describe('Team member names and enrollment numbers (e.g., "John Doe - 12345\\nJane Smith - 67890"). Each member on a new line. Used to determine pronoun and for signature.'),
  additionalThanks: z.string().optional().describe('Any specific individuals, groups, or resources the student(s) want to thank additionally (e.g., "librarian for resources", "lab assistant for technical help", "parents for support", "friend Amit Sharma for constant supervision").'),
});
export type GenerateAcknowledgementInput = z.infer<typeof GenerateAcknowledgementInputSchema>;

const GenerateAcknowledgementOutputSchema = z.object({
  acknowledgementMarkdown: z.string().describe('The generated HTML content for the acknowledgement section. Should be sincere and well-formatted.'),
});
export type GenerateAcknowledgementOutput = z.infer<typeof GenerateAcknowledgementOutputSchema>;

export async function generateAcknowledgement(input: GenerateAcknowledgementInput): Promise<GenerateAcknowledgementOutput> {
  return generateAcknowledgementFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateAcknowledgementPrompt',
  input: { schema: GenerateAcknowledgementInputSchema.extend({ teamDetailsLines: z.array(z.string()).optional(), pronoun: z.string().optional(), possessivePronoun: z.string().optional() }) },
  output: { schema: GenerateAcknowledgementOutputSchema },
  prompt: `You are an AI assistant tasked with writing a heartfelt and professional acknowledgement section for a student project report. The output must be the HTML content for the acknowledgement, ready to be rendered.

  **Project & People Details (Use these to customize the template):**
  - Project Title: {{{projectTitle}}}
  - Project Guide: {{{guideName}}}
  - Institute: {{{instituteName}}}
  - Branch/Department: {{{branch}}}
  - Head of Department: {{#if hodName}}{{{hodName}}}{{else}}[HOD Name Placeholder]{{/if}}
  - Team Members & Enrollment (for signature and pronoun):
    {{#if teamDetailsLines.length}}
    {{#each teamDetailsLines}}
    - {{this}}
    {{/each}}
    {{else if teamDetails}}
    {{{teamDetails}}} <!-- Renders the placeholder if teamDetailsLines is empty -->
    {{else}}
    [Team Member Names & Enrollment Placeholder]
    {{/if}}
  {{#if additionalThanks}}- Specific people/groups to thank: {{{additionalThanks}}}{{/if}}
  - Pronoun to use (I/We): {{{pronoun}}}
  - Possessive Pronoun (my/our): {{{possessivePronoun}}}

  **Instructions for Generating the Acknowledgement:**
  1.  Output ONLY the HTML content as per the structure below. Do NOT wrap it in Markdown code fences. No other text, explanations, or conversational elements.
  2.  Replace placeholders like \`{{{guideName}}}\` with the actual data.
  3.  **Placeholder Usage:** If a piece of information is not provided or is an empty string, **the system will provide a specific placeholder string. Output *this exact placeholder string* if no actual data is available. Do not replace these system-provided placeholders with "N/A" or try to invent information.**
      *   For Project Guide: Use \`{{{guideName}}}\`.
      *   For Institute Name: Use \`{{{instituteName}}}\`.
      *   For Branch/Department: Use \`{{{branch}}}\`.
      *   For Head of Department: If \`hodName\` is not provided, use "[HOD Name Placeholder]".
      *   For Team Members: Use \`teamDetailsLines\` if available, otherwise use \`{{{teamDetails}}}\`.
      *   For additional thanks section (if \`additionalThanks\` is empty/undefined): Omit the paragraph.
  4.  Use a sincere, appreciative, and formal tone.
  5.  Use pronouns ({{{pronoun}}}, {{{possessivePronoun}}}) appropriately.
  6.  Thank the project guide, HOD (if provided), institute, and department. Incorporate \`additionalThanks\` if provided.
  7.  Conclude with thanks to friends/family and list team members for signature.

  **Required Output Structure (HTML content):**
  <div style="font-family: 'Times New Roman', serif; padding: 20px; margin: 20px; page-break-after: always;">
  <h1 style="text-align: center; font-size: 20pt; font-weight: bold; margin-bottom: 30px; text-decoration: underline;">ACKNOWLEDGEMENT</h1>

  <p style="font-size: 12pt; line-height: 1.8; text-align: justify; text-indent: 30px; margin-bottom: 15px;">
  {{{pronoun}}} would like to express {{{possessivePronoun}}} sincere gratitude to all those who have helped {{{pronoun}}} in the successful completion of this project. This project has taken a lot of time and work on {{{possessivePronoun}}} part. However, it would not have been possible without the kind support and cooperation of many individuals and organizations.
  </p>

  <p style="font-size: 12pt; line-height: 1.8; text-align: justify; text-indent: 30px; margin-bottom: 15px;">
  {{{pronoun}}} {{pronounHelper 'owe' pronoun}} a lot to {{{guideName}}} for {{{possessivePronoun}}} guidance and constant supervision, as well as for providing important project specifics and invaluable support throughout the course of this project.
  </p>

  <p style="font-size: 12pt; line-height: 1.8; text-align: justify; text-indent: 30px; margin-bottom: 15px;">
  {{{pronoun}}} {{pronounHelper 'am' pronoun}} thankful to the <strong>{{{instituteName}}}</strong> and the Department of <strong>{{{branch}}}</strong> for providing all the necessary facilities and a conducive environment for the project work.
  {{#if hodName}}
  To the Head of the Department, Prof. {{{hodName}}}, {{{pronoun}}} would like to express {{{possessivePronoun}}} gratitude for his/her cordial collaboration and support in {{{possessivePronoun}}} endeavor.
  {{/if}}
  </p>

  {{#if additionalThanks}}
  <p style="font-size: 12pt; line-height: 1.8; text-align: justify; text-indent: 30px; margin-bottom: 15px;">
  {{{pronoun}}} would also like to extend {{{possessivePronoun}}} thanks to {{{additionalThanks}}}.
  </p>
  {{/if}}

  <p style="font-size: 12pt; line-height: 1.8; text-align: justify; text-indent: 30px; margin-bottom: 15px;">
  Finally, {{{pronoun}}} {{pronounHelper 'wish' pronoun}} to thank {{{possessivePronoun}}} friends and family for their encouragement and support.
  </p>

  <br><br>
  <div style="font-size: 12pt; margin-top: 40px; text-align: right;">
  {{#if teamDetailsLines.length}}
    {{#each teamDetailsLines}}
    <div style="margin-bottom: 5px;"><strong>{{this}}</strong></div>
    {{/each}}
  {{else if teamDetails}}
    <div style="margin-bottom: 5px;"><strong>{{{teamDetails}}}</strong></div>
  {{else}}
    <div style="margin-bottom: 5px;"><strong>[Team Member Name(s) & Enrollment Placeholder(s)]</strong></div>
  {{/if}}
  </div>

  </div>

  Generate the HTML content now.
  `,
  helpers: {
    pronounHelper: (verb: string, pronoun: string) => {
        if (pronoun === "We") {
            if (verb === "am") return "are";
            return verb;
        }
        // "I"
        if (verb === "am") return "am";
        return verb; // "I owe", "I wish"
    }
  }
});

const generateAcknowledgementFlow = ai.defineFlow(
  {
    name: 'generateAcknowledgementFlow',
    inputSchema: GenerateAcknowledgementInputSchema,
    outputSchema: GenerateAcknowledgementOutputSchema,
  },
  async (rawInput) => {
     const input = {
      projectTitle: rawInput.projectTitle?.trim() || "[Project Title Placeholder]",
      guideName: rawInput.guideName?.trim() || "[Guide Name Placeholder]",
      instituteName: rawInput.instituteName?.trim() || "[Institute Name Placeholder]",
      branch: rawInput.branch?.trim() || "[Branch/Department Placeholder]",
      hodName: rawInput.hodName?.trim() || undefined,
      teamDetails: rawInput.teamDetails?.trim() || "[Team Member Name(s) & Enrollment Placeholder(s)]",
      additionalThanks: rawInput.additionalThanks,
    };

    const teamDetailsLines = input.teamDetails !== "[Team Member Name(s) & Enrollment Placeholder(s)]" 
      ? input.teamDetails.split('\n').filter(line => line.trim() !== '') 
      : [];
    
    const isPlural = teamDetailsLines.length > 1 || (teamDetailsLines.length === 0 && input.teamDetails.includes('\n'));
    
    const processedInput = {
      ...input,
      teamDetailsLines: teamDetailsLines.length > 0 ? teamDetailsLines : undefined,
      teamDetails: teamDetailsLines.length === 0 ? input.teamDetails : undefined,
      pronoun: isPlural ? "We" : "I",
      possessivePronoun: isPlural ? "our" : "my",
    };

    const { output } = await prompt(processedInput);
    return output!;
  }
);
