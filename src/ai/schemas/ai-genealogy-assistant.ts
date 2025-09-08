import {z} from 'genkit';

export const GenealogyAssistantInputSchema = z.object({
  query: z.string().describe('The user query about genealogy or DNA analysis.'),
});
export type GenealogyAssistantInput = z.infer<typeof GenealogyAssistantInputSchema>;

export const GenealogyAssistantOutputSchema = z.string().describe('The AI assistant\'s response to the user query.');
export type GenealogyAssistantOutput = z.infer<typeof GenealogyAssistantOutputSchema>;
