// src/ai/flows/generate-diagram-mermaid.ts
'use server';
/**
 * @fileOverview AI agent to generate Mermaid.js diagram code.
 *
 * - generateDiagramMermaid - Generates Mermaid syntax based on a description.
 * - GenerateDiagramMermaidInput - Input type for the generation flow.
 * - GenerateDiagramMermaidOutput - Output type for the generation flow.
 */

import { ai } from '@/ai/ai-instance';
import { z } from 'genkit';

const GenerateDiagramMermaidInputSchema = z.object({
  description: z.string().describe('A natural language description of the diagram to be generated (e.g., "flowchart showing user login process", "sequence diagram for API call").'),
  diagramTypeHint: z.enum(['flowchart', 'sequenceDiagram', 'classDiagram', 'stateDiagram', 'erDiagram', 'gantt', 'pie', 'mindmap', 'other'])
    .optional()
    .describe('Optional hint about the desired diagram type for better accuracy (defaults to flowchart if unsure).'),
});
export type GenerateDiagramMermaidInput = z.infer<typeof GenerateDiagramMermaidInputSchema>;

const GenerateDiagramMermaidOutputSchema = z.object({
  mermaidCode: z.string().describe('The generated Mermaid.js code block. Ensure it starts with the diagram type (e.g., flowchart TD, sequenceDiagram) and contains ONLY valid Mermaid syntax.'),
});
export type GenerateDiagramMermaidOutput = z.infer<typeof GenerateDiagramMermaidOutputSchema>;

export async function generateDiagramMermaid(input: GenerateDiagramMermaidInput): Promise<GenerateDiagramMermaidOutput> {
  return generateDiagramMermaidFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateDiagramMermaidPrompt',
  input: {
    schema: GenerateDiagramMermaidInputSchema,
  },
  output: {
    schema: GenerateDiagramMermaidOutputSchema,
  },
  prompt: `You are an expert in generating Mermaid.js diagram code. Based on the user's description, create ONLY valid Mermaid syntax.

  Description: {{{description}}}
  {{#if diagramTypeHint}}Diagram Type Hint: {{{diagramTypeHint}}}{{/if}}

  **Critical Instructions:**
  1. Determine the most appropriate Mermaid diagram type based on the description and hint (default to 'flowchart TD' if unsure or 'other').
  2. Generate the complete Mermaid code block, starting *exactly* with the diagram type declaration (e.g., \`flowchart TD\`, \`sequenceDiagram\`, \`classDiagram\`, etc.).
  3. Ensure the syntax is 100% correct and adheres strictly to Mermaid standards. Pay close attention to node shapes (e.g., [], (), {}), link types (-->,-- text -->, ===), and terminators (;).
  4. **Crucially, do NOT include the markdown code fence (\`\`\`mermaid ... \`\`\`) in the output.** Output ONLY the raw Mermaid code itself.
  5. Do NOT include any introductory text, explanations, or apologies.
  6. Keep the diagram relatively simple and clear, focusing on the core elements described. Avoid overly complex structures unless specifically requested.

  **Example Output for "flowchart TD; A-->B; B-->C;":**
  {
    "mermaidCode": "flowchart TD\\nA[Start] --> B{Decision};\\nB -- Yes --> C[End];\\nB -- No --> D[Alternative];"
  }

  Provide ONLY the JSON output with the "mermaidCode" field containing the generated, valid Mermaid syntax.
  `,
});

const generateDiagramMermaidFlow = ai.defineFlow<
  typeof GenerateDiagramMermaidInputSchema,
  typeof GenerateDiagramMermaidOutputSchema
>({
  name: 'generateDiagramMermaidFlow',
  inputSchema: GenerateDiagramMermaidInputSchema,
  outputSchema: GenerateDiagramMermaidOutputSchema,
},
async input => {
    let output: GenerateDiagramMermaidOutput | undefined;
    try {
        const result = await prompt(input);
        output = result.output;
    } catch (error) {
        console.error("Error calling AI for diagram generation:", error);
        // Optionally, return a specific error structure or re-throw
        throw new Error(`AI generation failed: ${error instanceof Error ? error.message : String(error)}`);
    }


  // Basic validation or fallback
  if (!output?.mermaidCode?.trim()) {
      console.warn("AI did not return valid Mermaid code, providing fallback.");
      // Provide a basic fallback diagram
      return { mermaidCode: `graph TD\nA[Start] --> B{Error?};\nB -- Yes --> C[Handle Error];\nB -- No --> D[Success];` };
  }

  // Further cleanup: remove potential markdown fences and trim whitespace aggressively
  output.mermaidCode = output.mermaidCode
    .replace(/^```mermaid\s*/im, '') // Case-insensitive multiline start fence
    .replace(/\s*```$/im, '')        // Case-insensitive multiline end fence
    .trim();

  // Add a simple check for starting with a known diagram type (basic validation)
   const knownTypes = ['flowchart', 'graph', 'sequenceDiagram', 'classDiagram', 'stateDiagram', 'erDiagram', 'gantt', 'pie', 'mindmap'];
   if (!knownTypes.some(type => output!.mermaidCode.toLowerCase().startsWith(type))) {
       console.warn("Generated code doesn't start with a known Mermaid type. Providing fallback.");
       return { mermaidCode: `graph TD\nE[Invalid Start] --> F[Check AI Output];` };
   }


  return output;
});

