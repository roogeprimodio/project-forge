
// src/app/actions.ts
"use server";
import { generateReportSection, GenerateReportSectionInput, GenerateReportSectionOutput } from '@/ai/flows/generate-report-section';
import { summarizeReportSection, SummarizeReportSectionInput, SummarizeReportSectionOutput } from '@/ai/flows/summarize-report-section';
import { generateProjectOutline, GenerateProjectOutlineInput, GenerateProjectOutlineOutput } from '@/ai/flows/generate-project-outline';
import { suggestImprovements, SuggestImprovementsInput, SuggestImprovementsOutput } from '@/ai/flows/suggest-improvements';
import { generateDiagramMermaid, GenerateDiagramMermaidInput, GenerateDiagramMermaidOutput } from '@/ai/flows/generate-diagram-mermaid';

import { generateCoverPage, GenerateCoverPageInput, GenerateCoverPageOutput } from '@/ai/flows/generate-cover-page';
import { generateCertificate, GenerateCertificateInput, GenerateCertificateOutput } from '@/ai/flows/generate-certificate';
import { generateDeclaration, GenerateDeclarationInput, GenerateDeclarationOutput } from '@/ai/flows/generate-declaration';
import { generateAbstract, GenerateAbstractInput, GenerateAbstractOutput } from '@/ai/flows/generate-abstract';
import { generateAcknowledgement, GenerateAcknowledgementInput, GenerateAcknowledgementOutput } from '@/ai/flows/generate-acknowledgement';

import { explainConcept, ExplainConceptInput, ExplainConceptOutput as ExplainConceptOutputFlow } from '@/ai/flows/explain-concept-flow'; // Renamed import
import type { ExplainConceptOutput } from '@/types/project'; // Keep this type for client-side if it has specific client needs

import { generateImageFromPrompt, GenerateImageFromPromptInput, GenerateImageFromPromptOutput } from '@/ai/flows/generate-image-from-prompt-flow';
import { parseTextToOutline, ParseTextToOutlineInput, ParseTextToOutlineOutput } from '@/ai/flows/parse-text-to-outline-flow';

// Helper to handle potential errors from AI flows more consistently
async function handleAiAction<T_Input extends { userApiKey?: string; aiModel?: 'gemini' | 'openai' }, T_Output extends { error?: string }>(
  actionFn: (input: T_Input) => Promise<T_Output>,
  input: T_Input,
  actionName: string
): Promise<T_Output | { error: string }> {
  try {
    console.log(`Calling ${actionName} with input:`, { ...input, userApiKey: input.userApiKey ? 'present' : 'absent' });
    const result = await actionFn(input);
    if (result.error) {
      console.warn(`${actionName} returned an error:`, result.error);
      // Don't re-wrap if already an error object
      return result.error.startsWith("Error:") || result.error.includes("API key") ? { error: result.error } : { error: `${actionName} Failed: ${result.error}` };
    }
    console.log(`${actionName} successful.`);
    return result;
  } catch (error) {
    console.error(`Critical error in ${actionName} action:`, error);
    const errorMessage = error instanceof Error ? error.message : `An unknown error occurred during ${actionName}.`;
    return { error: `Critical Failure in ${actionName}: ${errorMessage}` };
  }
}


export async function generateSectionAction(input: GenerateReportSectionInput): Promise<GenerateReportSectionOutput | { error: string }> {
  return handleAiAction(generateReportSection, input, "Generate Section");
}

export async function summarizeSectionAction(input: SummarizeReportSectionInput): Promise<SummarizeReportSectionOutput | { error: string }> {
  if (!input.sectionText || input.sectionText.trim().length === 0) {
      return { error: "Section content is empty, cannot summarize." };
  }
  return handleAiAction(summarizeReportSection, input, "Summarize Section");
}

export async function generateOutlineAction(input: GenerateProjectOutlineInput): Promise<GenerateProjectOutlineOutput | { error: string }> {
  if (!input.projectTitle || !input.projectContext) {
    return { error: "Project title and context are required to generate an outline." };
  }
  return handleAiAction(generateProjectOutline, input, "Generate Outline");
}

export async function suggestImprovementsAction(input: SuggestImprovementsInput): Promise<SuggestImprovementsOutput | { error: string }> {
  if (!input.allSectionsContent?.trim() && !input.projectContext?.trim()) {
      return { error: "Please provide project context or some section content to get suggestions." };
  }
  return handleAiAction(suggestImprovements, input, "Suggest Improvements");
}

export async function generateDiagramAction(input: GenerateDiagramMermaidInput): Promise<GenerateDiagramMermaidOutput | { error: string }> {
  if (!input.description?.trim()) {
    return { error: "Diagram description cannot be empty." };
  }
  return handleAiAction(generateDiagramMermaid, input, "Generate Diagram");
}

export async function generateCoverPageAction(input: GenerateCoverPageInput): Promise<GenerateCoverPageOutput | { error: string }> {
    return handleAiAction(generateCoverPage, input, "Generate Cover Page");
}

export async function generateCertificateAction(input: GenerateCertificateInput): Promise<GenerateCertificateOutput | { error: string }> {
    return handleAiAction(generateCertificate, input, "Generate Certificate");
}

export async function generateDeclarationAction(input: GenerateDeclarationInput): Promise<GenerateDeclarationOutput | { error: string }> {
    return handleAiAction(generateDeclaration, input, "Generate Declaration");
}

export async function generateAbstractAction(input: GenerateAbstractInput): Promise<GenerateAbstractOutput | { error: string }> {
    if (!input.projectContext || input.projectContext.trim().length < 50) {
        return { error: "Project context is too short to generate a meaningful abstract. Please provide more details about the project."};
    }
    return handleAiAction(generateAbstract, input, "Generate Abstract");
}

export async function generateAcknowledgementAction(input: GenerateAcknowledgementInput): Promise<GenerateAcknowledgementOutput | { error: string }> {
    return handleAiAction(generateAcknowledgement, input, "Generate Acknowledgement");
}

export async function explainConceptAction(input: ExplainConceptInput): Promise<ExplainConceptOutputFlow | { error: string }> {
  if (!input.concept.trim()) {
    return { error: "Concept to explain cannot be empty." };
  }
  return handleAiAction(explainConcept, input, "Explain Concept");
}

export async function generateImageForSlideAction(input: GenerateImageFromPromptInput): Promise<GenerateImageFromPromptOutput> {
    if (!input.prompt?.trim()) {
        return { generatedImageUrl: '', error: "Image prompt cannot be empty." };
    }
    // This action might not fit the handleAiAction pattern perfectly if its output isn't { generatedImageUrl: string, error?: string }
    // For now, let's call it directly and handle its specific error structure.
    try {
        console.log("Generating image for slide with prompt:", input.prompt, "User API Key Present:", !!input.userApiKey);
        const result = await generateImageFromPrompt(input); // generateImageFromPromptFlow is internal
        if (result.error) {
            return { generatedImageUrl: '', error: result.error };
        }
        return result;
    } catch (error) {
        console.error("Error in generateImageForSlideAction:", error);
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred during image generation for slide.";
        return { generatedImageUrl: '', error: `AI Image Generation Failed: ${errorMessage}` };
    }
}

export async function parseTextOutlineAction(input: ParseTextToOutlineInput): Promise<ParseTextToOutlineOutput | { error: string }> {
  if (!input.textOutline.trim()) {
    return { sections: [] };
  }
  return handleAiAction(parseTextToOutline, input, "Parse Text Outline");
}
