'use client';

import { useAppContext } from '@/contexts/app-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Dna, Globe, Loader2 } from 'lucide-react';
import { AncestryChart } from '@/components/dashboard/ancestry-chart';
import { Skeleton } from '@/components/ui/skeleton';

export default function AncestryPage() {
  const { ancestry, isAnalyzing, analysisCompleted } = useAppContext();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-headline text-3xl font-bold text-primary md:text-4xl">
          Ancestry Composition
        </h1>
        <p className="mt-2 text-lg text-muted-foreground">
          Explore your roots and see where in the world your DNA comes from.
        </p>
      </div>

      {isAnalyzing && (
        <Card>
            <CardHeader>
                <Skeleton className="h-8 w-2/3" />
                <Skeleton className="h-4 w-1/2" />
            </CardHeader>
            <CardContent className="flex flex-col lg:flex-row items-center gap-8">
                <div className="w-full lg:w-1/2">
                    <Skeleton className="aspect-square rounded-full w-full max-w-sm mx-auto" />
                </div>
                <div className="w-full lg:w-1/2 space-y-4">
                    <Skeleton className="h-6 w-full" />
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-6 w-full" />
                    <Skeleton className="h-6 w-5/6" />
                </div>
            </CardContent>
        </Card>
      )}

      {!isAnalyzing && !analysisCompleted && (
        <Card className="text-center">
          <CardHeader>
            <div className="mx-auto bg-primary/10 p-3 rounded-full w-fit">
              <Dna className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="font-headline text-2xl text-primary mt-4">
              No Ancestry Data Found
            </CardTitle>
            <CardDescription>
              Upload your DNA file to see your ancestry composition.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/dashboard/dna-analysis">Upload DNA</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {!isAnalyzing && analysisCompleted && ancestry && (
        <Card>
            <CardHeader>
                <CardTitle className="font-headline text-2xl text-primary flex items-center gap-2">
                    <Globe className="h-6 w-6" /> Your Ethnicity Estimate
                </CardTitle>
                <CardDescription>
                    Based on your DNA compared to reference populations from around the world.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <AncestryChart data={ancestry.ethnicityEstimates} />
            </CardContent>
        </Card>
      )}
    </div>
  );
}
