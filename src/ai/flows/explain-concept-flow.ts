
'use server';
/**
 * @fileOverview AI agent to explain a concept in a structured, slide-like format.
 *
 * - explainConcept - Generates a series of "slides" to explain a given concept.
 * - ExplainConceptInput - Input type for the explanation flow.
 * - ExplainConceptOutput - Output type for the explanation flow (defined in @/types/project).
 */

import { ai } from '@/ai/ai-instance';
import { z } from 'genkit';
import type { ExplanationSlide, ExplainConceptOutput } from '@/types/project'; // Import shared types

const ExplainConceptInputSchema = z.object({
  concept: z.string().describe('The concept, term, or phrase to be explained.'),
  projectContext: z.string().optional().describe('Optional context from the project to tailor the explanation (e.g., "Explain this in the context of software engineering for e-sports management.").'),
  complexityLevel: z.enum(['simple', 'detailed', 'expert']).optional().default('simple').describe('The desired level of complexity for the explanation.'),
  maxSlides: z.number().optional().default(5).describe('Maximum number of slides to generate.'),
});
export type ExplainConceptInput = z.infer<typeof ExplainConceptInputSchema>;

// Define Zod schema for a single slide (matches ExplanationSlide interface)
const ExplanationSlideSchema = z.object({
  title: z.string().optional().describe('A concise title for the slide.'),
  content: z.string().describe('The main textual explanation for this slide, formatted in Markdown. Should be clear and easy to understand.'),
  mermaidDiagram: z.string().optional().describe('Optional: Valid Mermaid.js code for a diagram relevant to this slide. Only include if a diagram significantly aids understanding. Keep diagrams simple.'),
});

// Define Zod schema for the overall output
const ExplainConceptOutputSchema = z.object({
  slides: z.array(ExplanationSlideSchema).describe('An array of slides, each explaining a part of the concept. Ordered logically.'),
  conceptTitle: z.string().describe('The original concept that was explained.'),
});

export async function explainConcept(input: ExplainConceptInput): Promise<ExplainConceptOutput> {
  return explainConceptFlow(input);
}

const prompt = ai.definePrompt({
  name: 'explainConceptPrompt',
  input: { schema: ExplainConceptInputSchema },
  output: { schema: ExplainConceptOutputSchema },
  prompt: `You are an AI assistant specialized in breaking down complex topics into easy-to-understand, slide-like explanations.
Your task is to explain the given concept: "{{{concept}}}".

**Context & Constraints:**
- Project Context (if provided): {{{projectContext}}}
- Desired Complexity: {{{complexityLevel}}}
- Maximum Number of Slides: {{{maxSlides}}}

**Instructions for Generating Explanation Slides:**
1.  **Understand the Concept:** First, fully grasp the core meaning of "{{{concept}}}". If project context is provided, tailor the explanation to that context.
2.  **Structure into Slides:** Break down the explanation into a logical sequence of up to {{{maxSlides}}} "slides". Each slide should cover a distinct aspect or build upon the previous one.
3.  **Slide Content (Markdown):** For each slide:
    *   Provide a \`title\` (optional, but recommended for clarity).
    *   Write clear, concise \`content\` in Markdown. Use bullet points, bold text, and simple language appropriate for the '{{{complexityLevel}}}' level.
    *   Avoid overly long paragraphs. Aim for scannable information.
4.  **Diagrams (Optional Mermaid Code):**
    *   If a simple diagram would significantly clarify a point on a slide, provide \`mermaidDiagram\` code for it.
    *   Use basic Mermaid types like \`flowchart TD\`, \`graph LR\`, or simple \`sequenceDiagram\`.
    *   Keep diagrams focused and uncluttered. Do NOT include a diagram for every slide; only when truly beneficial.
    *   Ensure the Mermaid code is valid and directly renderable. Output ONLY the Mermaid syntax, no markdown fences (\`\`\`mermaid ... \`\`\`).
5.  **Overall Flow:** Ensure the slides progress logically, from basic introduction to more specific details or examples, depending on the complexity.
6.  **Output Format:** The final output MUST be a single JSON object matching the 'ExplainConceptOutputSchema', containing a 'slides' array and the 'conceptTitle'.

**Example of a single slide object within the 'slides' array:**
\`\`\`json
{
  "title": "What is a Variable?",
  "content": "- A variable is like a container that stores information.\\n- It has a name (e.g., 'userAge') and can hold different values (e.g., 25, 'hello').\\n- Values can change during program execution.",
  "mermaidDiagram": "graph LR\\nA[Container] -- holds --> B(Value);"
}
\`\`\`

Explain the concept "{{{concept}}}" now, adhering to all instructions and the JSON output format.
The output should be the concept title and an array of slide objects.
`,
});

const explainConceptFlow = ai.defineFlow(
  {
    name: 'explainConceptFlow',
    inputSchema: ExplainConceptInputSchema,
    outputSchema: ExplainConceptOutputSchema,
  },
  async (input) => {
    // Ensure defaults are applied if not present in input
    const processedInput = {
        ...input,
        complexityLevel: input.complexityLevel || 'simple',
        maxSlides: input.maxSlides || 5,
    };
    const { output } = await prompt(processedInput);

    // Basic validation of the output structure
    if (!output || !Array.isArray(output.slides) || typeof output.conceptTitle !== 'string') {
      console.error("AI returned an invalid structure for concept explanation:", output);
      // Return a fallback or throw an error
      return {
        conceptTitle: input.concept,
        slides: [{
          title: "Error",
          content: "Failed to generate explanation. The AI did not return the expected data structure. Please try again."
        }]
      };
    }
    return output!;
  }
);
