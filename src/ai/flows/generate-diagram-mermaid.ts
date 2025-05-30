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
import { BaseAiInputSchema, getModel, getConfig, getMissingApiKeyError } from './common';

const GenerateDiagramMermaidInputSchemaInternal = z.object({
  description: z.string().describe('A natural language description of the diagram to be generated (e.g., "flowchart showing user login process", "sequence diagram for API call"). Should be detailed enough for the AI to understand the components and relationships.'),
  diagramTypeHint: z.enum(['flowchart', 'sequenceDiagram', 'classDiagram', 'stateDiagram', 'erDiagram', 'gantt', 'pie', 'mindmap', 'other'])
    .optional()
    .describe('Optional hint about the desired diagram type for better accuracy (defaults to flowchart if unsure).'),
});

export const GenerateDiagramMermaidInputSchema = GenerateDiagramMermaidInputSchemaInternal.merge(BaseAiInputSchema);
export type GenerateDiagramMermaidInput = z.infer<typeof GenerateDiagramMermaidInputSchema>;

const GenerateDiagramMermaidOutputSchema = z.object({
  mermaidCode: z.string().describe('The generated Mermaid.js code block. Must start with the diagram type (e.g., flowchart TD, sequenceDiagram) and contain ONLY valid Mermaid syntax. No markdown fences or extra text.'),
  error: z.string().optional(),
});
export type GenerateDiagramMermaidOutput = z.infer<typeof GenerateDiagramMermaidOutputSchema>;

export async function generateDiagramMermaid(input: GenerateDiagramMermaidInput): Promise<GenerateDiagramMermaidOutput> {
  const apiKeyError = getMissingApiKeyError(
    input.aiModel || 'gemini',
    input.userApiKey,
    !!process.env.GOOGLE_GENAI_API_KEY,
    !!process.env.OPENAI_API_KEY
  );
  if (apiKeyError) {
    return { mermaidCode: `graph TD\nError["${apiKeyError.replace(/"/g, "'")}"]`, error: apiKeyError };
  }
  return generateDiagramMermaidFlow(input);
}

const generateDiagramMermaidPrompt = ai.definePrompt({
  name: 'generateDiagramMermaidPrompt',
  input: {
    schema: GenerateDiagramMermaidInputSchemaInternal,
  },
  output: {
    schema: GenerateDiagramMermaidOutputSchema,
  },
  prompt: `You are an expert in generating Mermaid.js diagram code. Your primary goal is to produce syntactically correct and logically sound Mermaid code based on the user's description.

  User Description:
  {{{description}}}

  {{#if diagramTypeHint}}Preferred Diagram Type: {{{diagramTypeHint}}}{{/if}}

  **Critical Instructions for Generating Mermaid Code:**
  1.  **Determine Diagram Type:** Based on the description and any provided hint, select the most appropriate Mermaid diagram type. Common types include: \`flowchart TD\` (or LR, RL, BT), \`sequenceDiagram\`, \`classDiagram\`, \`stateDiagram-v2\`, \`erDiagram\`, \`gantt\`, \`pie\`, \`mindmap\`. If no hint is given or "other" is selected, infer the best type from the description. If still unsure, default to \`flowchart TD\`.
  2.  **Mermaid Syntax Only:** The output for "mermaidCode" MUST be *only* the raw Mermaid syntax.
     *   It MUST start *exactly* with the diagram type declaration (e.g., \`flowchart TD\`, \`sequenceDiagram\`).
     *   It MUST NOT include the Markdown code fences (e.g., \`\`\`mermaid ... \`\`\`).
     *   It MUST NOT include any other text, explanations, apologies, or conversational elements.
  3.  **Syntax Correctness:** Ensure the generated syntax is 100% valid and adheres strictly to Mermaid standards. Pay close attention to:
      *   Node shapes and text: \`id[Text]\` for boxes, \`id(Text)\` for rounded, \`id((Text))\` for circles, \`id{Text}\` for diamonds, etc.
      *   Link types: \`---\` (solid), \`-- text ---\` (solid with text), \`-.-\` (dotted), \`-. text .-\` (dotted with text), \`===\` (thick), \`== text ===\` (thick with text), \`-->\`, \`--o\`, \`--x\`, etc.
      *   Terminators: Use semicolons (;) where appropriate, especially in flowcharts if not implied by newlines.
      *   Participant and actor declaration in sequence diagrams.
      *   Class and relationship definitions in class diagrams.
      *   State transitions in state diagrams.
  4.  **Clarity and Simplicity:** Keep the diagram relatively simple and clear, focusing on accurately representing the core elements and relationships described by the user. Avoid overly complex or cluttered diagrams unless specifically requested.
  5.  **Handle Ambiguity/Insufficient Input:** If the description is too short, unclear, or missing critical information that prevents diagram generation, output a simple error diagram like: \`graph TD\\nError[Description unclear or insufficient. Please provide more details.]\`. Do NOT attempt to generate a complex diagram from poor input.
  6.  **Output Structure:** Ensure the entire output is a single JSON object with one key: "mermaidCode", whose value is the string of Mermaid syntax.

  Generate the Mermaid code now based on the provided description. If the description is insufficient, return the specified error diagram.
  `,
});

const generateDiagramMermaidFlow = ai.defineFlow(
  {
    name: 'generateDiagramMermaidFlow',
    inputSchema: GenerateDiagramMermaidInputSchema,
    outputSchema: GenerateDiagramMermaidOutputSchema,
  },
  async (input) => {
    const { userApiKey, aiModel, ...promptData } = input;
    const model = getModel({ aiModel, userApiKey });
    const config = getConfig({ aiModel, userApiKey });

    if (!promptData.description || promptData.description.trim().length < 10) {
      const errorMsg = `graph TD\nError[Description too short. Please provide more details to generate a diagram.]`;
      return { mermaidCode: errorMsg, error: "Description too short." };
    }

    let output: GenerateDiagramMermaidOutput | undefined;
    try {
      const result = await generateDiagramMermaidPrompt(promptData, { model, config });
      output = result.output;

      if (!output || !output.mermaidCode || typeof output.mermaidCode !== 'string') {
          throw new Error("AI returned an invalid output structure for Mermaid code.");
      }

      let cleanedCode = output.mermaidCode.trim();
      cleanedCode = cleanedCode.replace(/^```(?:mermaid)?\s*[\r\n]+/, '');
      cleanedCode = cleanedCode.replace(/[\r\n]+\s*```$/, '');
      const firstMermaidKeywordIndex = cleanedCode.search(/^(graph|flowchart|sequenceDiagram|classDiagram|stateDiagram|erDiagram|gantt|pie|mindmap|stateDiagram-v2|journey)/i);
      if (firstMermaidKeywordIndex > 0) {
          cleanedCode = cleanedCode.substring(firstMermaidKeywordIndex);
      } else if (firstMermaidKeywordIndex === -1 && cleanedCode.length > 0 && !cleanedCode.startsWith("graph TD\nError")) {
          const errorMsg = `graph TD\nError[AI generated invalid diagram start. Please check your description or try again.]`;
          return { mermaidCode: errorMsg, error: "AI generated invalid diagram start." };
      }
      cleanedCode = cleanedCode.trim();
      output.mermaidCode = cleanedCode;

    } catch (error: any) {
      console.error("Error during AI diagram generation or processing:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorDiagram = `graph TD\nError[AI Generation Failed: ${errorMessage.replace(/"/g, "'").substring(0,100)}${errorMessage.length > 100 ? '...' : ''}] --> CheckLogs`;
      return { mermaidCode: errorDiagram, error: `AI Generation Failed: ${errorMessage}` };
    }

    const knownTypes = ['flowchart', 'graph', 'sequenceDiagram', 'classDiagram', 'stateDiagram', 'erDiagram', 'gantt', 'pie', 'mindmap', 'stateDiagram-v2', 'journey'];
    const firstLine = output.mermaidCode.split(/[\r\n]+/)[0]?.trim()?.toLowerCase() || "";

    if (!output.mermaidCode) {
        const errorMsg = `graph TD\nError[AI returned empty code. Please try again.]`;
        return { mermaidCode: errorMsg, error: "AI returned empty code." };
    }

    if (!knownTypes.some(type => firstLine.startsWith(type)) && !firstLine.startsWith("error[")) {
        const errorMsg = `graph TD\nError[Invalid diagram type or malformed code. First line: ${firstLine.substring(0,50)}...]`;
        return { mermaidCode: errorMsg, error: `Invalid diagram type or malformed code. First line: ${firstLine.substring(0,50)}...`};
    }

    return output;
  }
);
