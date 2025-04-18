"use server";
/**
 * @fileOverview Drafts an email based on a user-provided prompt.
 *
 * - draftEmail - A function that handles the email drafting process.
 * - DraftEmailInput - The input type for the draftEmail function.
 * - DraftEmailOutput - The return type for the draftEmail function.
 */

import { ai } from "@/ai/ai-instance";
import { z } from "genkit";

const DraftEmailInputSchema = z.object({
  prompt: z
    .string()
    .describe("The prompt describing the desired email content."),
});
export type DraftEmailInput = z.infer<typeof DraftEmailInputSchema>;

const DraftEmailOutputSchema = z.object({
  emailDraft: z.string().describe("The drafted email content."),
});
export type DraftEmailOutput = z.infer<typeof DraftEmailOutputSchema>;

export async function draftEmail(
  input: DraftEmailInput
): Promise<DraftEmailOutput> {
  return draftEmailFlow(input);
}

const prompt = ai.definePrompt({
  name: "draftEmailPrompt",
  input: {
    schema: z.object({
      prompt: z
        .string()
        .describe("The prompt describing the desired email content."),
    }),
  },
  output: {
    schema: z.object({
      emailDraft: z.string().describe("The drafted email content."),
    }),
  },
  prompt: `You are an AI email assistant. Please draft an email based on the following prompt: {{{prompt}}}`,
});

const draftEmailFlow = ai.defineFlow<
  typeof DraftEmailInputSchema,
  typeof DraftEmailOutputSchema
>(
  {
    name: "draftEmailFlow",
    inputSchema: DraftEmailInputSchema,
    outputSchema: DraftEmailOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
