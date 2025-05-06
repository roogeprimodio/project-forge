'use server';
/**
 * @fileOverview AI agent to generate a project report acknowledgement section.
 *
 * - generateAcknowledgement - Generates Markdown content for an acknowledgement.
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
  teamDetails: z.string().describe('Team member names and enrollment numbers (e.g., "John Doe - 12345\\nJane Smith - 67890"). Each member on a new line. Used to determine if "I" or "We" should be used and for the signature.'),
  additionalThanks: z.string().optional().describe('Any specific individuals, groups, or resources the student(s) want to thank additionally (e.g., "librarian for resources", "lab assistant for technical help", "parents for support", "friend Amit Sharma for constant supervision").'),
});
export type GenerateAcknowledgementInput = z.infer<typeof GenerateAcknowledgementInputSchema>;

const GenerateAcknowledgementOutputSchema = z.object({
  acknowledgementMarkdown: z.string().describe('The generated Markdown content for the acknowledgement section. Should be sincere and well-formatted.'),
});
export type GenerateAcknowledgementOutput = z.infer<typeof GenerateAcknowledgementOutputSchema>;

export async function generateAcknowledgement(input: GenerateAcknowledgementInput): Promise<GenerateAcknowledgementOutput> {
  return generateAcknowledgementFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateAcknowledgementPrompt',
  input: { schema: GenerateAcknowledgementInputSchema.extend({ teamDetailsLines: z.array(z.string()).optional() }) },
  output: { schema: GenerateAcknowledgementOutputSchema },
  prompt: `You are an AI assistant tasked with writing a heartfelt and professional acknowledgement section for a student project report in Markdown format, similar to the provided example.

  **Example Content (for tone and structure reference):**
  "This project has taken a lot of time and work on my part. However, it would not have been possible without the kind support and cooperation of many individuals and organizations. I'd like to take this opportunity to thank each of you personally.

  I owe a lot to Ms. Kinjal and my friend Amit Sharma for their guidance and constant supervision, as well as for providing important project specifics. As a way of expressing my gratitude for their steadfast support and assistance throughout our project's preparation, all my friends and colleagues who started the conversation as well as those who contributed critical review input are being recognized here. Our college's Prof. Kinjal Bagariya provided me with all the resources I needed and a welcoming work environment, and for that I am grateful.

  To the Head of the Department, Prof. Ajay Bariya I would like to express my gratitude for his cordial collaboration and support in my Endeavor.

  With sincere regards,

  Jagadish Odedara (210640107001)"

  **Project & People Details (Use these to customize):**
  - Project Title: {{{projectTitle}}}
  - Project Guide: {{{guideName}}}
  - Institute: {{{instituteName}}}
  - Branch/Department: {{{branch}}}
  {{#if hodName}}- Head of Department: {{{hodName}}}{{/if}}
  - Team Members & Enrollment (for signature and "I" vs "We" pronoun):
    {{#if teamDetailsLines}}
    {{#each teamDetailsLines}}
    {{this}}
    {{/each}}
    {{else}}
    {{{teamDetails}}}
    {{/if}}
  {{#if additionalThanks}}- Specific people/groups to thank: {{{additionalThanks}}}{{/if}}

  **Instructions for Generating the Acknowledgement:**
  1.  Use a sincere, appreciative, and formal tone.
  2.  The output should be well-formatted Markdown.
  3.  Start with a general statement about the effort and support received.
  4.  Specifically thank the project guide, **{{{guideName}}}**, for their guidance, support, and mentorship.
  5.  Thank the **{{{instituteName}}}** and the Department of **{{{branch}}}**. If a Head of Department (HOD) name ({{{hodName}}}) is provided, thank them explicitly.
  6.  If specific additional thanks ({{{additionalThanks}}}) are provided, incorporate them naturally. This could include friends, family, specific faculty, or staff.
  7.  Use "I" or "We" (and corresponding possessives like "my"/"our") appropriately based on the number of team members implied by \`teamDetailsLines\` (if multiple entries, use "We"; otherwise, use "I").
  8.  Conclude with a closing like "With sincere regards," or similar, followed by the names and enrollment numbers of all team members (from \`teamDetailsLines\`). Each member on a new line.
  9.  Do NOT include a heading like "# Acknowledgement" in the output; only provide the acknowledgement text itself.
  10. Output ONLY the Markdown content for the acknowledgement. No extra text or explanations.

  Generate the acknowledgement now.
  `,
});

const generateAcknowledgementFlow = ai.defineFlow(
  {
    name: 'generateAcknowledgementFlow',
    inputSchema: GenerateAcknowledgementInputSchema,
    outputSchema: GenerateAcknowledgementOutputSchema,
  },
  async input => {
    // Pre-process teamDetails into an array of lines for easier use in Handlebars
    const teamDetailsLines = input.teamDetails.split('\n').filter(line => line.trim() !== '');
    
    const processedInput = {
      ...input,
      teamDetailsLines: teamDetailsLines
    };

    const { output } = await prompt(processedInput);
    return output!;
  }
);
