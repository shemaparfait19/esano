import type { AnalyzeDnaAndPredictRelativesOutput } from "@/ai/schemas/ai-dna-prediction";
import type { AncestryEstimationOutput } from "@/ai/schemas/ai-ancestry-estimation";
import type { GenerationalInsightsOutput } from "@/ai/schemas/ai-generational-insights";

export interface UserProfile {
    userId: string;
    dnaData: string;
    dnaFileName: string;
    analysis?: {
        relatives: AnalyzeDnaAndPredictRelativesOutput;
        ancestry: AncestryEstimationOutput;
        insights: GenerationalInsightsOutput;
        completedAt: string;
    };
    createdAt?: string;
    updatedAt?: string;
}
