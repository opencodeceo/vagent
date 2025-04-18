"use server";

/**
 * @fileOverview Generates a script for a phone call based on a given topic or goal.
 *
 * - generateCallScript - A function that generates a call script.
 * - GenerateCallScriptInput - The input type for the generateCallScript function.
 * - GenerateCallScriptOutput - The return type for the generateCallScript function.
 */

import { ai } from "@/ai/ai-instance";
import { z } from "genkit";

const GenerateCallScriptInputSchema = z.object({
  topic: z.string().describe("The topic or goal of the phone call."),
});
export type GenerateCallScriptInput = z.infer<
  typeof GenerateCallScriptInputSchema
>;

const GenerateCallScriptOutputSchema = z.object({
  script: z.string().describe("The generated script for the phone call."),
});
export type GenerateCallScriptOutput = z.infer<
  typeof GenerateCallScriptOutputSchema
>;

export async function generateCallScript(
  input: GenerateCallScriptInput
): Promise<GenerateCallScriptOutput> {
  return generateCallScriptFlow(input);
}

const prompt = ai.definePrompt({
  name: "generateCallScriptPrompt",
  input: {
    schema: z.object({
      topic: z.string().describe("The topic or goal of the phone call."),
    }),
  },
  output: {
    schema: z.object({
      script: z.string().describe("The generated script for the phone call."),
    }),
  },
  prompt: `You are an AI assistant that specializes in generating phone call scripts.

  Based on the topic or goal provided, generate a script that can be used to guide the conversation.

  Topic or Goal: {{{topic}}}

  Script:`,
});

const generateCallScriptFlow = ai.defineFlow<
  typeof GenerateCallScriptInputSchema,
  typeof GenerateCallScriptOutputSchema
>(
  {
    name: "generateCallScriptFlow",
    inputSchema: GenerateCallScriptInputSchema,
    outputSchema: GenerateCallScriptOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
