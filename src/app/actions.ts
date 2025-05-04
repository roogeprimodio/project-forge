// src/app/actions.ts
"use server";
import { generateReportSection, GenerateReportSectionInput } from '@/ai/flows/generate-report-section';
import type { GenerateReportSectionOutput } from '@/ai/flows/generate-report-section';
import { summarizeReportSection, SummarizeReportSectionInput } from '@/ai/flows/summarize-report-section';
import type { SummarizeReportSectionOutput } from '@/ai/flows/summarize-report-section';


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
    // Check if the error has a specific structure from Genkit or API response
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


// Add other server actions (like generate TOC) here later if needed