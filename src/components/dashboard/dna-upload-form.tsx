'use client';

import { useState, useTransition, useCallback, type ChangeEvent, type DragEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { analyzeDna } from '@/app/actions';
import { useAppContext } from '@/contexts/app-context';
import { UploadCloud, File, Loader2, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';

export function DnaUploadForm() {
  const [file, setFile] = useState<File | null>(null);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const router = useRouter();
  const { setRelatives, setAncestry, setInsights, setIsAnalyzing, setAnalysisCompleted } = useAppContext();
  const [isDragOver, setIsDragOver] = useState(false);

  const handleFileChange = (selectedFile: File | null) => {
    if (selectedFile) {
        // Basic validation for file type could be added here
        setFile(selectedFile);
    }
  };

  const onFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    handleFileChange(e.target.files?.[0] ?? null);
  };
  
  const onDrop = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragOver(false);
    handleFileChange(event.dataTransfer.files?.[0] ?? null);
  }, []);

  const onDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragOver(true);
  }, []);

  const onDragLeave = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleSubmit = () => {
    if (!file) {
      toast({
        title: 'No file selected',
        description: 'Please select a DNA file to upload.',
        variant: 'destructive',
      });
      return;
    }

    startTransition(async () => {
      setIsAnalyzing(true);
      setAnalysisCompleted(false);
      try {
        // In a real app, you'd read the file content. For this demo, we'll send a mock string.
        const mockDnaData = `mock_dna_data_from_${file.name}`;
        const results = await analyzeDna(mockDnaData, file.name);
        
        setRelatives(results.relatives);
        setAncestry(results.ancestry);
        setInsights(results.insights);
        setAnalysisCompleted(true);

        toast({
          title: 'Analysis Complete',
          description: "Your DNA has been analyzed. Explore your results!",
          variant: 'default',
        });
        router.push('/dashboard/relatives');
      } catch (error) {
        toast({
          title: 'Analysis Failed',
          description: error instanceof Error ? error.message : "An unknown error occurred.",
          variant: 'destructive',
        });
        setAnalysisCompleted(false);
      } finally {
        setIsAnalyzing(false);
      }
    });
  };

  return (
    <div className="space-y-6">
       <div 
        className={cn(
            "relative flex flex-col items-center justify-center w-full p-12 border-2 border-dashed rounded-lg cursor-pointer transition-colors",
            isDragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/50",
            file && "border-primary bg-primary/5"
        )}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onClick={() => document.getElementById('file-upload')?.click()}
      >
        <div className="flex flex-col items-center justify-center text-center">
            {isPending ? (
                <Loader2 className="h-12 w-12 text-primary animate-spin" />
            ) : file ? (
                <CheckCircle className="h-12 w-12 text-primary" />
            ) : (
                <UploadCloud className="h-12 w-12 text-muted-foreground" />
            )}
            <p className="mt-4 text-lg font-semibold text-foreground">
                {isPending ? "Analyzing..." : file ? `${file.name} selected` : "Drag & drop your file here"}
            </p>
            <p className="text-sm text-muted-foreground">
                {isPending ? "This may take a moment." : file ? "Click to choose a different file" : "or click to browse"}
            </p>
        </div>
        <Input 
          id="file-upload" 
          type="file" 
          className="absolute h-full w-full opacity-0 cursor-pointer"
          onChange={onFileChange}
          disabled={isPending}
        />
      </div>

      {file && (
        <div className="flex items-center justify-between p-3 border rounded-lg bg-background">
            <div className="flex items-center gap-3">
                <File className="h-6 w-6 text-primary" />
                <div>
                    <p className="font-medium">{file.name}</p>
                    <p className="text-sm text-muted-foreground">{Math.round(file.size / 1024)} KB</p>
                </div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setFile(null)} disabled={isPending}>
              Remove
            </Button>
        </div>
      )}

      <Button
        onClick={handleSubmit}
        disabled={!file || isPending}
        className="w-full sm:w-auto"
        size="lg"
      >
        {isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Analyzing...
          </>
        ) : (
          'Start Analysis'
        )}
      </Button>
    </div>
  );
}
