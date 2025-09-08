import type { AnalyzeDnaAndPredictRelativesOutput } from "@/ai/schemas/ai-dna-prediction";
import type { AncestryEstimationOutput } from "@/ai/schemas/ai-ancestry-estimation";
import type { GenerationalInsightsOutput } from "@/ai/schemas/ai-generational-insights";

export interface UserProfile {
    userId: string;
    email?: string;
    displayName?: string;
    dnaData?: string;
    dnaFileName?: string;
    analysis?: {
        relatives: AnalyzeDnaAndPredictRelativesOutput;
        ancestry: AncestryEstimationOutput;
        insights: GenerationalInsightsOutput;
        completedAt: string;
    };
    familyTree?: any; // Define a proper type for family tree later
    createdAt?: string;
    updatedAt?: string;
}
