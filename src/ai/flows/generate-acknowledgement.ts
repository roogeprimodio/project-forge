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
  teamDetails: z.string().describe('Team member names (e.g., "John Doe\\nJane Smith"). Each member on a new line. Used to determine if "I" or "We" should be used.'),
  additionalThanks: z.string().optional().describe('Any specific individuals, groups, or resources the student(s) want to thank additionally (e.g., "librarian for resources", "lab assistant for technical help", "parents for support").'),
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
  input: { schema: GenerateAcknowledgementInputSchema },
  output: { schema: GenerateAcknowledgementOutputSchema },
  prompt: `You are an AI assistant tasked with writing a heartfelt and professional acknowledgement section for a student project report in Markdown format.

  **Project & People Details:**
  - Project Title: {{{projectTitle}}}
  - Project Guide: {{{guideName}}}
  - Institute: {{{instituteName}}}
  - Branch/Department: {{{branch}}}
  {{#if hodName}}- Head of Department: {{{hodName}}}{{/if}}
  - Team Members (to determine "I" vs "We"):
    {{{teamDetails}}}
  {{#if additionalThanks}}- Specific people/groups to thank: {{{additionalThanks}}}{{/if}}

  **Instructions for Generating the Acknowledgement:**
  1.  Use a sincere and appreciative tone.
  2.  Start by expressing gratitude to the project guide, **{{{guideName}}}**, for their guidance, support, and mentorship.
  3.  Thank the **{{{instituteName}}}** and the Department of **{{{branch}}}** (and the Head of Department, **{{#if hodName}}{{{hodName}}}{{else}}[HOD Name]{{/if}}**, if provided) for providing the necessary facilities and environment.
  4.  If specific additional thanks ({{{additionalThanks}}}) are provided, incorporate them naturally (e.g., thanking family, friends, specific faculty, or staff).
  5.  Use "I" or "We" appropriately based on the number of team members implied by \`teamDetails\` (if multiple lines/names, use "We"; otherwise, use "I").
  6.  Conclude with a general expression of gratitude.
  7.  The output should be well-formatted Markdown.
  8.  Do NOT include a heading like "# Acknowledgement" in the output; only provide the acknowledgement text itself.
  9.  Output ONLY the Markdown paragraph(s) for the acknowledgement. No extra text or explanations.

  **Example (if "We" is appropriate):**
  "We would like to express our sincere gratitude to our project guide, {{{guideName}}}, for their invaluable guidance, constant encouragement, and insightful feedback throughout the duration of this project. His/Her expertise and support were instrumental in navigating the complexities of '{{{projectTitle}}}'.
  
  We extend our heartfelt thanks to the Department of {{{branch}}} and {{{instituteName}}} for providing us with the necessary resources and a conducive academic environment. {{#if hodName}}We are also grateful to Prof. {{{hodName}}}, Head of the Department, for their support.{{/if}}
  
  {{#if additionalThanks}}We would also like to thank {{{additionalThanks}}}.{{/if}}
  
  Finally, we are immensely grateful to our parents, friends, and well-wishers for their unwavering support and understanding during this endeavor."

  **Example (if "I" is appropriate):**
  "I would like to express my sincere gratitude to my project guide, {{{guideName}}}, for their invaluable guidance, constant encouragement, and insightful feedback throughout the duration of this project. His/Her expertise and support were instrumental in navigating the complexities of '{{{projectTitle}}}'.
  
  I extend my heartfelt thanks to the Department of {{{branch}}} and {{{instituteName}}} for providing me with the necessary resources and a conducive academic environment. {{#if hodName}}I am also grateful to Prof. {{{hodName}}}, Head of the Department, for their support.{{/if}}
  
  {{#if additionalThanks}}I would also like tothank {{{additionalThanks}}}.{{/if}}
  
  Finally, I am immensely grateful to my parents, friends, and well-wishers for their unwavering support and understanding during this endeavor."


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
     // Simple logic to determine "I" vs "We" based on teamDetails
    const isPlural = input.teamDetails.split('\n').filter(line => line.trim() !== '').length > 1;
    const pronoun = isPlural ? "We" : "I";
    const possessivePronoun = isPlural ? "our" : "my";
    
    // Pass these to the prompt, though the prompt itself is also trying to infer.
    // This explicit passing can be used if Handlebars helpers were more advanced.
    // For now, the prompt uses conditional logic based on teamDetails structure.
    const processedInput = { ...input, pronoun, possessivePronoun };

    const { output } = await prompt(processedInput);
    return output!;
  }
);
