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
        name: z.string().describe('The full name of the section or sub-section (e.g., "1.1 Background and Motivation").'),
        subSections: z.array(OutlineSectionSchema).optional().describe('An optional array of sub-sections nested under this section. Each sub-section should follow the same structure.'),
    }).describe('A single section or sub-section in the report outline.')
);

const GenerateProjectOutlineInputSchema = z.object({
  projectTitle: z.string().describe('The title of the project.'),
  projectContext: z.string().describe('A detailed description of the project, its goals, scope, target audience, key features, technologies used, and methodology (if known). More context leads to better outlines.'),
});
export type GenerateProjectOutlineInput = z.infer<typeof GenerateProjectOutlineInputSchema>;

const GenerateProjectOutlineOutputSchema = z.object({
  sections: z.array(OutlineSectionSchema).describe('An ordered, hierarchical list of suggested sections and sub-sections for the report. The structure should represent a logical flow for a technical or research report.'),
});
export type GenerateProjectOutlineOutput = z.infer<typeof GenerateProjectOutlineOutputSchema>;

export async function generateProjectOutline(input: GenerateProjectOutlineInput): Promise<GenerateProjectOutlineOutput> {
  // Add a basic check for minimal context length before calling the flow
  if (!input.projectContext || input.projectContext.trim().length < 30) { // Increased minimum length slightly
      console.warn("Project context is very short, AI outline generation might be suboptimal.");
      // Optionally, you could return a specific error or default structure here
      // return { error: "Project context is too short for effective outline generation." };
  }
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
  prompt: `You are an AI expert in structuring academic and technical project reports.

  Based on the project title and the detailed context provided below, generate a comprehensive and logically ordered HIERARCHICAL list of section names suitable for the final report.

  **Project Title:** {{{projectTitle}}}
  **Project Context:** {{{projectContext}}}

  **Instructions:**
  1.  **Standard Sections:** Include essential academic sections like Introduction, Literature Review (if applicable), Methodology/System Design, Implementation, Results/Evaluation, Discussion, Conclusion, and References. Adapt these based on the project context.
  2.  **Sub-sections:** Break down major sections into relevant, specific sub-sections (1-2 levels deep). For example:
      *   Introduction might have: Background, Problem Statement, Objectives, Scope.
      *   Methodology might have: System Architecture, Algorithms Used, Data Collection (if relevant).
      *   Implementation might have: Tools & Technologies, Key Modules/Components, Challenges Faced.
      *   Results might have: Performance Metrics, User Feedback Analysis, Comparison with Alternatives.
  3.  **Context is Key:** Tailor the sections and sub-sections *specifically* to the details provided in the project context. If it mentions specific technologies, features, or evaluation methods, reflect those in the outline.
  4.  **Logical Flow:** Ensure the sections follow a clear, logical progression from problem definition to solution and evaluation.
  5.  **Numbering (Optional but helpful for AI):** You can optionally prefix names like "1. Introduction", "1.1 Background" to reinforce hierarchy, but the JSON structure is primary.
  6.  **Output Format:** Provide the output *strictly* as a JSON object matching the output schema: a single key "sections", which is an array of section objects. Each section object must have a "name" (string) and can optionally have a "subSections" (array of nested section objects matching the same structure). Do *not* include any other text, explanations, or markdown formatting outside the JSON.

  **Example Output Structure:**
  \`\`\`json
  {
    "sections": [
      {
        "name": "1. Introduction",
        "subSections": [
          { "name": "1.1 Background and Motivation" },
          { "name": "1.2 Problem Statement" },
          { "name": "1.3 Objectives" },
          { "name": "1.4 Scope and Limitations" }
        ]
      },
      { "name": "2. Literature Review" },
      {
        "name": "3. Methodology",
        "subSections": [
          { "name": "3.1 System Architecture" },
          { "name": "3.2 Data Collection and Preprocessing" },
          { "name": "3.3 Algorithms and Models Used" }
        ]
      },
      // ... other sections and sub-sections based on context ...
      { "name": "N. Conclusion" },
      { "name": "References" },
      { "name": "Appendix" }
    ]
  }
  \`\`\`
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
    let output: GenerateProjectOutlineOutput | undefined;

    try {
        const result = await prompt(input);
        output = result.output;

        // Basic validation of the AI response
        if (!output?.sections || !Array.isArray(output.sections) || output.sections.length === 0) {
            console.warn("AI did not return a valid section array, providing fallback.");
            // Provide a more structured fallback outline
            return { sections: [
                { name: "Introduction" },
                { name: "Methodology" },
                { name: "Implementation" },
                { name: "Results" },
                { name: "Conclusion" },
                { name: "References" }
            ]};
        }

        // Optional: Add further validation/cleanup here if needed (e.g., trim names, check depth)

        return output;

    } catch (error) {
        console.error("Error calling AI for project outline generation:", error);
        // Re-throw or return a structured error
        // throw new Error(`AI outline generation failed: ${error instanceof Error ? error.message : String(error)}`);
         return { sections: [ // Provide fallback on error
            { name: "Introduction (Error Generating)" },
            { name: "Main Content" },
            { name: "Conclusion" }
        ]};
    }
});
