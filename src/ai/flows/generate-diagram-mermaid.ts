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
  mermaidCode: z.string().describe('The generated Mermaid.js code block. Ensure it starts with the diagram type (e.g., flowchart TD, sequenceDiagram) and contains valid Mermaid syntax.'),
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
  prompt: `You are an expert in generating Mermaid.js diagram code. Based on the user's description, create valid Mermaid syntax.

  Description: {{{description}}}
  {{#if diagramTypeHint}}Diagram Type Hint: {{{diagramTypeHint}}}{{/if}}

  Instructions:
  1. Determine the most appropriate Mermaid diagram type based on the description and hint (default to 'flowchart TD' if unsure or 'other').
  2. Generate the complete Mermaid code block, starting with the diagram type declaration (e.g., \`flowchart TD\`, \`sequenceDiagram\`, \`classDiagram\`, etc.).
  3. Ensure the syntax is correct and follows Mermaid best practices.
  4. Do NOT include the markdown code fence (\`\`\`mermaid ... \`\`\`) in the output, only the raw Mermaid code itself.
  5. Keep the diagram relatively simple and clear, focusing on the core elements described.

  Example Output for "flowchart TD; A-->B; B-->C;":
  {
    "mermaidCode": "flowchart TD\\nA-->B\\nB-->C"
  }

  Provide ONLY the JSON output with the "mermaidCode" field containing the generated Mermaid syntax.
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
  const { output } = await prompt(input);

  // Basic validation or fallback
  if (!output?.mermaidCode?.trim()) {
      console.warn("AI did not return Mermaid code, providing fallback.");
      // Provide a basic fallback
      return { mermaidCode: `graph TD\nA[Start] --> B{Error?}; B -- Yes --> C[Handle Error]; B -- No --> D[Success];` };
  }

  // Ensure the output doesn't accidentally contain markdown fences
  output.mermaidCode = output.mermaidCode.replace(/^```mermaid\s*/, '').replace(/\s*```$/, '').trim();

  return output;
});
