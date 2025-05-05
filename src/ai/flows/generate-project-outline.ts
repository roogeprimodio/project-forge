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
        name: z.string().describe('The full name of the section or sub-section (e.g., "1.1 Background and Motivation"). Should be descriptive and appropriate for a report heading.'),
        subSections: z.array(OutlineSectionSchema).optional().describe('An optional array of sub-sections nested under this section. Each sub-section must follow the same structure. Only include sub-sections where logical subdivision is appropriate.'),
    }).describe('A single section or sub-section in the report outline. Sections should be logically ordered.')
);

const GenerateProjectOutlineInputSchema = z.object({
  projectTitle: z.string().describe('The title of the project.'),
  projectContext: z.string().describe('A detailed description of the project, its goals, scope, target audience, key features, technologies used, and methodology (if known). More context leads to better outlines.'),
});
export type GenerateProjectOutlineInput = z.infer<typeof GenerateProjectOutlineInputSchema>;

const GenerateProjectOutlineOutputSchema = z.object({
  sections: z.array(OutlineSectionSchema).describe('An ordered, hierarchical list of suggested sections and sub-sections for the report. The structure must strictly follow the schema, with sections containing optional subSections arrays.'),
});
export type GenerateProjectOutlineOutput = z.infer<typeof GenerateProjectOutlineOutputSchema>;

// Basic validation function for the outline structure
const validateOutlineStructure = (sections: any[]): boolean => {
    if (!Array.isArray(sections)) return false;
    return sections.every(section => {
        if (typeof section !== 'object' || !section || typeof section.name !== 'string') {
            return false;
        }
        if (section.subSections) {
            if (!Array.isArray(section.subSections)) return false;
            // Recursively validate sub-sections
            if (!validateOutlineStructure(section.subSections)) return false;
        }
        return true;
    });
};


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

  **Critical Instructions:**
  1.  **Standard Sections:** Include essential academic sections like Introduction, Literature Review (if applicable), Methodology/System Design, Implementation, Results/Evaluation, Discussion, Conclusion, and References. Adapt these based on the project context.
  2.  **Hierarchical Structure:** The output *must* be a hierarchical JSON structure. Major sections should be top-level elements in the "sections" array. Use the "subSections" array within a section object to represent nested sub-sections (1-2 levels deep is typical).
      *   Example: "Introduction" might contain "Background", "Problem Statement", "Objectives" in its "subSections" array.
  3.  **Context is Key:** Tailor the sections and sub-sections *specifically* to the details provided in the project context. If it mentions specific technologies, features, or evaluation methods, reflect those in the outline structure.
  4.  **Logical Flow:** Ensure the sections follow a clear, logical progression from problem definition to solution and evaluation.
  5.  **Naming:** Section names should be clear, descriptive, and appropriate for report headings.
  6.  **Strict JSON Output:** The output *must* be a single JSON object matching the output schema exactly. Do *not* include any text, explanations, apologies, or markdown formatting outside the JSON object. The JSON must start with \`{\` and end with \`}\`. The top-level key must be "sections", containing an array of objects. Each object must have a "name" (string) and optionally a "subSections" (array of similar objects).

  **Example Valid JSON Output Structure:**
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
          { "name": "3.2 Algorithms Used" }
        ]
      },
      { "name": "4. Implementation" },
      { "name": "5. Results and Evaluation" },
      { "name": "6. Discussion" },
      { "name": "7. Conclusion" },
      { "name": "References" },
      { "name": "Appendix" }
    ]
  }
  \`\`\`

  **Ensure the final output is ONLY the valid JSON object as described.**
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
    const fallbackOutline: GenerateProjectOutlineOutput = { sections: [
        { name: "Introduction" },
        { name: "Methodology" },
        { name: "Implementation" },
        { name: "Results" },
        { name: "Conclusion" },
        { name: "References" }
    ]};

    try {
        const result = await prompt(input);
        output = result.output;

        // Enhanced Validation of the AI response structure
        if (!output || typeof output !== 'object' || !validateOutlineStructure(output.sections)) {
            console.warn("AI did not return a valid hierarchical section structure. Output:", output);
            return fallbackOutline; // Provide a structured fallback outline
        }

        // Optional: Add further validation/cleanup here if needed (e.g., trim names, check depth)

        return output;

    } catch (error) {
        console.error("Error calling AI for project outline generation:", error);
        // Consider specific error handling, e.g., for API errors vs. content issues
         if (error instanceof Error && error.message.includes("invalid argument")) {
             console.warn("AI generation failed possibly due to invalid context. Returning fallback.");
             // Potentially add a specific error indicator in the fallback
             // fallbackOutline.sections.unshift({ name: "Error: Invalid Context?" });
             return fallbackOutline;
         }
         // General fallback on other errors
         return fallbackOutline;
    }
});