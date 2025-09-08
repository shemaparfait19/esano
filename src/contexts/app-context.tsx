'use client';

import type { AnalyzeDnaAndPredictRelativesOutput } from '@/ai/flows/ai-dna-prediction';
import type { AncestryEstimationOutput } from '@/ai/flows/ai-ancestry-estimation';
import type { GenerationalInsightsOutput } from '@/ai/flows/ai-generational-insights';
import { createContext, useContext, useState, type ReactNode } from 'react';

type AppState = {
  relatives: AnalyzeDnaAndPredictRelativesOutput | null;
  setRelatives: (relatives: AnalyzeDnaAndPredictRelativesOutput | null) => void;
  ancestry: AncestryEstimationOutput | null;
  setAncestry: (ancestry: AncestryEstimationOutput | null) => void;
  insights: GenerationalInsightsOutput | null;
  setInsights: (insights: GenerationalInsightsOutput | null) => void;
  isAnalyzing: boolean;
  setIsAnalyzing: (isAnalyzing: boolean) => void;
  analysisCompleted: boolean;
  setAnalysisCompleted: (completed: boolean) => void;
};

const AppContext = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [relatives, setRelatives] = useState<AnalyzeDnaAndPredictRelativesOutput | null>(null);
  const [ancestry, setAncestry] = useState<AncestryEstimationOutput | null>(null);
  const [insights, setInsights] = useState<GenerationalInsightsOutput | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisCompleted, setAnalysisCompleted] = useState(false);

  const value = {
    relatives,
    setRelatives,
    ancestry,
    setAncestry,
    insights,
    setInsights,
    isAnalyzing,
    setIsAnalyzing,
    analysisCompleted,
    setAnalysisCompleted,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
}
