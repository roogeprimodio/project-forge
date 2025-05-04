"use server";
import { generateReportSection, GenerateReportSectionInput } from '@/ai/flows/generate-report-section';
import type { GenerateReportSectionOutput } from '@/ai/flows/generate-report-section';

/**
 * Server action to generate a report section using the AI flow.
 * Handles potential errors during the AI call.
 */
export async function generateSectionAction(input: GenerateReportSectionInput): Promise<GenerateReportSectionOutput | { error: string }> {
  try {
    const result = await generateReportSection(input);
    return result;
  } catch (error) {
    console.error("Error generating report section:", error);
    return { error: error instanceof Error ? error.message : "An unknown error occurred during section generation." };
  }
}

// Add other server actions (like summarize, generate TOC) here later if needed
