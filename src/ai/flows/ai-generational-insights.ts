'use server';

/**
 * @fileOverview An AI agent that analyzes genetic markers to provide insights into health predispositions, phenotypic traits, and ancestral origins.
 *
 * - getGenerationalInsights - A function that processes genetic data and returns AI-driven insights.
 * - GenerationalInsightsInput - The input type for the getGenerationalInsights function.
 * - GenerationalInsightsOutput - The return type for the getGenerationalInsights function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

export const GenerationalInsightsInputSchema = z.object({
  geneticMarkers: z
    .string()
    .describe(
      'A string containing genetic marker data (SNPs, Indels) in a standardized format.'
    ),
});
export type GenerationalInsightsInput = z.infer<typeof GenerationalInsightsInputSchema>;

export const GenerationalInsightsOutputSchema = z.object({
  healthInsights: z
    .string()
    .describe(
      'AI-generated insights into potential health predispositions based on the genetic markers, with clear disclaimers that this is not medical advice.'
    ),
  traitInsights: z
    .string()
    .describe(
      'AI-generated insights into phenotypic traits (e.g., eye color, hair type) based on the genetic markers.'
    ),
  ancestryInsights: z
    .string()
    .describe(
      'AI-generated insights into ancestral origins and potential historical group connections based on the genetic markers.'
    ),
});
export type GenerationalInsightsOutput = z.infer<typeof GenerationalInsightsOutputSchema>;

export async function getGenerationalInsights(
  input: GenerationalInsightsInput
): Promise<GenerationalInsightsOutput> {
  return generationalInsightsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generationalInsightsPrompt',
  input: {schema: GenerationalInsightsInputSchema},
  output: {schema: GenerationalInsightsOutputSchema},
  prompt: `You are an AI assistant specialized in analyzing genetic data to provide insights into health, traits, and ancestry.

  Analyze the provided genetic marker data and generate insights into the following areas:

  - Health Predispositions: Identify potential health risks and predispositions based on the genetic markers. Provide clear disclaimers that these insights are not medical diagnoses and users should consult healthcare professionals for medical advice.
  - Phenotypic Traits: Determine potential phenotypic traits (e.g., eye color, hair type) based on the genetic markers.
  - Ancestral Origins: Infer ancestral origins and potential historical group connections based on the genetic markers.

  Genetic Marker Data: {{{geneticMarkers}}}

  Format your response as follows:

  Health Insights: [AI-generated insights into potential health predispositions with disclaimers]
  Trait Insights: [AI-generated insights into phenotypic traits]
  Ancestry Insights: [AI-generated insights into ancestral origins]
  `,
});

const generationalInsightsFlow = ai.defineFlow(
  {
    name: 'generationalInsightsFlow',
    inputSchema: GenerationalInsightsInputSchema,
    outputSchema: GenerationalInsightsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input, { model: googleAI.model('gemini-1.5-flash') });
    return output!;
  }
);
