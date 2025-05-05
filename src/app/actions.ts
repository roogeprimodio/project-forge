// src/app/actions.ts
"use server";
import { generateReportSection, GenerateReportSectionInput } from '@/ai/flows/generate-report-section';
import type { GenerateReportSectionOutput } from '@/ai/flows/generate-report-section';
import { summarizeReportSection, SummarizeReportSectionInput } from '@/ai/flows/summarize-report-section';
import type { SummarizeReportSectionOutput } from '@/ai/flows/summarize-report-section';
import { generateProjectOutline, GenerateProjectOutlineInput } from '@/ai/flows/generate-project-outline';
import type { GenerateProjectOutlineOutput } from '@/ai/flows/generate-project-outline';
import { suggestImprovements, SuggestImprovementsInput } from '@/ai/flows/suggest-improvements';
import type { SuggestImprovementsOutput } from '@/ai/flows/suggest-improvements';
import { generateDiagramMermaid, GenerateDiagramMermaidInput } from '@/ai/flows/generate-diagram-mermaid'; // Import diagram flow
import type { GenerateDiagramMermaidOutput } from '@/ai/flows/generate-diagram-mermaid'; // Import diagram flow types


/**
 * Server action to generate a report section using the AI flow.
 * Handles potential errors during the AI call.
 */
export async function generateSectionAction(input: GenerateReportSectionInput): Promise<GenerateReportSectionOutput | { error: string }> {
  try {
    console.log("Generating section with input:", input);
    const result = await generateReportSection(input);
    console.log("Generation result:", result);
    return result;
  } catch (error) {
    console.error("Error generating report section:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred during section generation.";
    return { error: errorMessage };
  }
}

/**
 * Server action to summarize a report section using the AI flow.
 * Handles potential errors during the AI call.
 */
export async function summarizeSectionAction(input: SummarizeReportSectionInput): Promise<SummarizeReportSectionOutput | { error: string }> {
  try {
    console.log("Summarizing section with input:", { projectTitle: input.projectTitle, sectionTextLength: input.sectionText.length });
    if (!input.sectionText || input.sectionText.trim().length === 0) {
        return { error: "Section content is empty, cannot summarize." };
    }
    const result = await summarizeReportSection(input);
    console.log("Summarization result:", { summaryLength: result.summary.length });
    return result;
  } catch (error) {
    console.error("Error summarizing report section:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred during section summarization.";
    return { error: errorMessage };
  }
}

/**
 * Server action to generate a project outline (list of sections) using the AI flow.
 * Handles potential errors during the AI call.
 */
export async function generateOutlineAction(input: GenerateProjectOutlineInput): Promise<GenerateProjectOutlineOutput | { error: string }> {
  try {
    console.log("Generating project outline with input:", input);
    if (!input.projectTitle || !input.projectContext) {
      return { error: "Project title and context are required to generate an outline." };
    }
    const result = await generateProjectOutline(input);
    console.log("Outline generation result:", result);

    // Check if the result itself is an error object (from the flow's fallback)
    // or if the structure is invalid.
    if (!result || typeof result !== 'object' || !Array.isArray(result.sections)) {
        console.warn("AI outline generation returned unexpected format or fallback. Result:", result);
        return { error: "AI failed to generate a valid outline structure. Please try again or adjust the project context." };
    }
    return result; // Should have the 'sections' key now
  } catch (error) {
    console.error("Error generating project outline:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred during outline generation.";
    return { error: errorMessage };
  }
}

/**
 * Server action to suggest improvements for the project report using the AI flow.
 * Handles potential errors during the AI call.
 */
export async function suggestImprovementsAction(input: SuggestImprovementsInput): Promise<SuggestImprovementsOutput | { error: string }> {
  try {
    console.log("Suggesting improvements with input:", input);
    const result = await suggestImprovements(input);
    console.log("Suggestion result:", result);
    return result;
  } catch (error) {
    console.error("Error suggesting improvements:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred while suggesting improvements.";
    return { error: errorMessage };
  }
}

/**
 * Server action to generate Mermaid diagram code using the AI flow.
 * Handles potential errors during the AI call.
 */
export async function generateDiagramAction(input: GenerateDiagramMermaidInput): Promise<GenerateDiagramMermaidOutput | { error: string }> {
  try {
    console.log("Generating diagram with input:", input);
    if (!input.description?.trim()) {
      return { error: "Diagram description cannot be empty." };
    }
    const result = await generateDiagramMermaid(input);
    console.log("Diagram generation result:", result);
    return result;
  } catch (error) {
    console.error("Error generating diagram:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred during diagram generation.";
    return { error: errorMessage };
  }
}