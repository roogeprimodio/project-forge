// src/ai/flows/generate-project-outline.ts
'use server';
/**
 * @fileOverview AI agent to generate a hierarchical project report outline.
 *
 * - generateProjectOutline - Generates a list of suggested section names and sub-sections based on project context.
 * - GenerateProjectOutlineInput - Input type for the generation flow.
 * - GenerateProjectOutlineOutput - Output type for the generation flow (hierarchical).
 */

import { ai } from '@/ai/ai-instance';
import { z } from 'genkit';

// Recursive schema for sections and sub-sections
const OutlineSectionSchema: z.ZodType<any> = z.lazy(() => // Use z.lazy for recursion
    z.object({
        name: z.string().describe('The name of the section or sub-section.'),
        subSections: z.array(OutlineSectionSchema).optional().describe('An optional array of sub-sections nested under this section.'),
    })
);

const GenerateProjectOutlineInputSchema = z.object({
  projectTitle: z.string().describe('The title of the project.'),
  projectContext: z.string().describe('A brief description of the project, its goals, scope, and key features or technologies involved.'),
});
export type GenerateProjectOutlineInput = z.infer<typeof GenerateProjectOutlineInputSchema>;

const GenerateProjectOutlineOutputSchema = z.object({
  sections: z.array(OutlineSectionSchema).describe('An ordered, hierarchical list of suggested sections and sub-sections for the report.'),
});
export type GenerateProjectOutlineOutput = z.infer<typeof GenerateProjectOutlineOutputSchema>;

export async function generateProjectOutline(input: GenerateProjectOutlineInput): Promise<GenerateProjectOutlineOutput> {
  return generateProjectOutlineFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateProjectOutlinePrompt',
  input: {
    schema: GenerateProjectOutlineInputSchema,
  },
  output: {
    schema: GenerateProjectOutlineOutputSchema, // Use the hierarchical schema
  },
  prompt: `You are an AI assistant helping students structure their final year project reports.

  Based on the project title and context provided below, generate a comprehensive and logically ordered HIERARCHICAL list of section names suitable for the report. Include standard academic sections like Introduction, Methodology, Conclusion, and References. ALSO, suggest relevant sub-sections where appropriate based on the project's context. Aim for 1-2 levels of nesting (e.g., 1. Introduction -> 1.1 Background).

  Project Title: {{{projectTitle}}}
  Project Context: {{{projectContext}}}

  Think about the typical flow of a technical or research report. Consider sections that might cover background, problem definition, proposed solution, implementation details, evaluation, and future work, tailored to the specifics mentioned in the context. Break down larger sections into logical sub-sections.

  Provide the output strictly as a JSON object containing a single key "sections" which is an array of section objects. Each section object must have a "name" (string) and can optionally have a "subSections" (array of nested section objects). Do not include any other text or explanations.

  Example Output:
  {
    "sections": [
      {
        "name": "Introduction",
        "subSections": [
          { "name": "1.1 Background and Motivation" },
          { "name": "1.2 Problem Statement" },
          { "name": "1.3 Objectives" }
        ]
      },
      { "name": "Literature Review" },
      {
        "name": "Methodology",
        "subSections": [
          { "name": "3.1 System Architecture" },
          { "name": "3.2 Algorithms Used" }
        ]
      },
      { "name": "Implementation" },
      { "name": "Results and Discussion" },
      { "name": "Conclusion" },
      { "name": "References" }
    ]
  }
  `,
});

const generateProjectOutlineFlow = ai.defineFlow<
  typeof GenerateProjectOutlineInputSchema,
  typeof GenerateProjectOutlineOutputSchema
>({
  name: 'generateProjectOutlineFlow',
  inputSchema: GenerateProjectOutlineInputSchema,
  outputSchema: GenerateProjectOutlineOutputSchema,
},
async input => {
  const { output } = await prompt(input);

  // Basic validation or fallback if needed
  if (!output?.sections || output.sections.length === 0) {
      console.warn("AI did not return suggested sections, providing fallback.");
      // Provide a basic fallback outline (non-hierarchical)
      return { sections: [{ name: "Introduction" }, { name: "Main Content" }, { name: "Conclusion" }, { name: "References" }] };
  }

  return output;
});
