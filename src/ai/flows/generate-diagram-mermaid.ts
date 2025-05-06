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
  description: z.string().describe('A natural language description of the diagram to be generated (e.g., "flowchart showing user login process", "sequence diagram for API call"). Should be detailed enough for the AI to understand the components and relationships.'),
  diagramTypeHint: z.enum(['flowchart', 'sequenceDiagram', 'classDiagram', 'stateDiagram', 'erDiagram', 'gantt', 'pie', 'mindmap', 'other'])
    .optional()
    .describe('Optional hint about the desired diagram type for better accuracy (defaults to flowchart if unsure).'),
});
export type GenerateDiagramMermaidInput = z.infer<typeof GenerateDiagramMermaidInputSchema>;

const GenerateDiagramMermaidOutputSchema = z.object({
  mermaidCode: z.string().describe('The generated Mermaid.js code block. Must start with the diagram type (e.g., flowchart TD, sequenceDiagram) and contain ONLY valid Mermaid syntax. No markdown fences or extra text.'),
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

  **Example of a VALID "mermaidCode" string for "flowchart showing A to B":**
  \`flowchart TD\\nA --> B\`

  **Example of an INVALID "mermaidCode" string:**
  \`\`\`mermaid\\nflowchart TD\\nA --> B\\n\`\`\` (Contains markdown fences)
  OR
  \`Here is your diagram:\\nflowchart TD\\nA --> B\` (Contains extra text)

  Generate the Mermaid code now based on the provided description. If the description is insufficient, return the specified error diagram.
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
  if (!input.description || input.description.trim().length < 10) { // Stricter input validation
    console.warn("Diagram description is too short. AI might struggle or return error diagram.");
    return { mermaidCode: `graph TD\nError[Description too short. Please provide more details to generate a diagram.]` };
  }

  let output: GenerateDiagramMermaidOutput | undefined;
  try {
    console.log("Calling AI for diagram generation with input:", input);
    const result = await prompt(input);
    output = result.output; 

    if (!output || !output.mermaidCode || typeof output.mermaidCode !== 'string') {
        console.error("AI returned invalid or empty output structure:", output);
        throw new Error("AI returned an invalid output structure for Mermaid code.");
    }

    // Aggressively clean the mermaidCode
    let cleanedCode = output.mermaidCode.trim();

    // Remove potential markdown fences (multiline and case-insensitive)
    // Matches ```mermaid (optional) ... ``` or ``` ... ```
    cleanedCode = cleanedCode.replace(/^```(?:mermaid)?\s*[\r\n]+/, ''); 
    cleanedCode = cleanedCode.replace(/[\r\n]+\s*```$/, '');           

    // Remove any leading/trailing non-Mermaid conversational text if AI includes it
    // This is a heuristic; more sophisticated NLP might be needed for complex cases
    const firstMermaidKeywordIndex = cleanedCode.search(/^(graph|flowchart|sequenceDiagram|classDiagram|stateDiagram|erDiagram|gantt|pie|mindmap|stateDiagram-v2|journey)/i);
    if (firstMermaidKeywordIndex > 0) {
        console.warn("AI output contained leading non-Mermaid text. Attempting to trim.");
        cleanedCode = cleanedCode.substring(firstMermaidKeywordIndex);
    } else if (firstMermaidKeywordIndex === -1 && cleanedCode.length > 0 && !cleanedCode.startsWith("graph TD\nError")) {
        // If no keyword found and it's not our predefined error diagram, it's likely invalid.
        console.warn(`Generated code "${cleanedCode.substring(0,50)}..." doesn't start with a known Mermaid type and is not a recognized error format. Returning error diagram.`);
        return { mermaidCode: `graph TD\nError[AI generated invalid diagram start. Please check your description or try again.]` };
    }
    
    cleanedCode = cleanedCode.trim(); // Final trim after all cleaning

    output.mermaidCode = cleanedCode;

  } catch (error) {
    console.error("Error during AI diagram generation or processing:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return { mermaidCode: `graph TD\nError[AI Generation Failed: ${errorMessage.replace(/"/g, "'").substring(0,100)}${errorMessage.length > 100 ? '...' : ''}] --> CheckLogs` };
  }

  // Validate that the cleaned code starts with a known Mermaid diagram type
  const knownTypes = ['flowchart', 'graph', 'sequenceDiagram', 'classDiagram', 'stateDiagram', 'erDiagram', 'gantt', 'pie', 'mindmap', 'stateDiagram-v2', 'journey'];
  const firstLine = output.mermaidCode.split(/[\r\n]+/)[0]?.trim()?.toLowerCase() || "";

  if (!output.mermaidCode) { // Check if code is empty after cleaning
      console.warn("AI did not return any Mermaid code after cleaning, providing fallback error diagram.");
      return { mermaidCode: `graph TD\nError[AI returned empty code. Please try again.]` };
  }

  if (!knownTypes.some(type => firstLine.startsWith(type)) && !firstLine.startsWith("error[")) { // Allow "error[" for our custom error diagrams
      console.warn(`Generated code "${firstLine.substring(0,30)}..." doesn't start with a known Mermaid type or error format. This might cause rendering issues.`);
      // Return a specific error diagram for this case
      return { mermaidCode: `graph TD\nError[Invalid diagram type or malformed code. First line: ${firstLine.substring(0,50)}...]` };
  }

  console.log("Cleaned AI Mermaid code output:", output.mermaidCode);
  return output;
});

