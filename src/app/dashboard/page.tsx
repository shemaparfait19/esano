'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAppContext } from '@/contexts/app-context';
import { ArrowRight, Dna, Globe, Users, BarChart, Bot } from 'lucide-react';
import Image from 'next/image';

const features = [
  {
    title: 'DNA Analysis',
    description: 'Upload your raw DNA file to begin your journey.',
    href: '/dashboard/dna-analysis',
    icon: Dna,
  },
  {
    title: 'Find Relatives',
    description: 'Discover and connect with potential family members.',
    href: '/dashboard/relatives',
    icon: Users,
  },
  {
    title: 'Explore Ancestry',
    description: 'See your ethnicity estimates and geographic origins.',
    href: '/dashboard/ancestry',
    icon: Globe,
  },
  {
    title: 'View Insights',
    description: 'Learn about your genetic traits and heritage.',
    href: '/dashboard/insights',
    icon: BarChart,
  },
];

export default function DashboardPage() {
  const { analysisCompleted, relatives, ancestry } = useAppContext();

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-headline text-3xl font-bold text-primary md:text-4xl">
          Welcome to Your Dashboard
        </h1>
        <p className="mt-2 text-lg text-muted-foreground">
          Your personal space to explore your genetic story.
        </p>
      </div>

      {!analysisCompleted ? (
        <Card className="bg-gradient-to-br from-primary/5 via-background to-background">
          <CardHeader>
            <CardTitle className="font-headline text-2xl text-primary flex items-center gap-2">
              <Dna className="h-6 w-6" /> Start Your Discovery
            </CardTitle>
            <CardDescription>
              You haven't analyzed any DNA data yet. Upload your file to unlock your personalized reports and insights.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                <Image src="https://picsum.photos/300/200" width={300} height={200} alt="DNA Helix" data-ai-hint="dna abstract" className="rounded-lg object-cover" />
                <div className="flex-1">
                    <p className="mb-4 text-foreground/80">Supported formats include AncestryDNA, 23andMe, and MyHeritage. Your data is encrypted and secure.</p>
                     <Button asChild>
                        <Link href="/dashboard/dna-analysis">
                        Upload DNA File <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                    </Button>
                </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card className="col-span-1 lg:col-span-1">
             <CardHeader>
                <CardTitle className="font-headline text-xl text-primary flex items-center gap-2">
                    <Users/> Relative Matches
                </CardTitle>
             </CardHeader>
             <CardContent>
                <p className="text-4xl font-bold">{relatives?.length || 0}</p>
                <p className="text-sm text-muted-foreground">potential relatives found.</p>
                <Button variant="link" className="px-0 mt-2" asChild>
                    <Link href="/dashboard/relatives">View Matches <ArrowRight className="ml-1 h-4 w-4"/></Link>
                </Button>
             </CardContent>
          </Card>
          <Card className="col-span-1 lg:col-span-2">
             <CardHeader>
                <CardTitle className="font-headline text-xl text-primary flex items-center gap-2">
                    <Globe/> Ancestry Composition
                </CardTitle>
             </CardHeader>
             <CardContent>
                <p className="text-foreground/80 line-clamp-2">{ancestry?.ethnicityEstimates || "No ancestry data available."}</p>
                <Button variant="link" className="px-0 mt-2" asChild>
                    <Link href="/dashboard/ancestry">Explore Your Origins <ArrowRight className="ml-1 h-4 w-4"/></Link>
                </Button>
             </CardContent>
          </Card>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {features.map((feature) => (
          <Link href={feature.href} key={feature.title} className="group">
            <Card className="h-full transition-all group-hover:border-primary/50 group-hover:shadow-md">
              <CardHeader className="flex flex-row items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="bg-primary/10 p-3 rounded-lg">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="font-headline text-xl text-primary">{feature.title}</CardTitle>
                    <CardDescription>{feature.description}</CardDescription>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1" />
              </CardHeader>
            </Card>
          </Link>
        ))}
         <Link href="/dashboard/assistant" className="group md:col-span-2">
            <Card className="h-full transition-all bg-primary/5 group-hover:border-primary/50 group-hover:shadow-md">
              <CardHeader className="flex flex-row items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="bg-primary/10 p-3 rounded-lg">
                    <Bot className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="font-headline text-xl text-primary">AI Genealogy Assistant</CardTitle>
                    <CardDescription>Have questions? Ask our AI assistant for help with your research or understanding your results.</CardDescription>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1" />
              </CardHeader>
            </Card>
          </Link>
      </div>
    </div>
  );
}
