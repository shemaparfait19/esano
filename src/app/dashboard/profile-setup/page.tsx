"use client";

import React from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { saveUserProfile } from "@/app/actions";
import { db } from "@/lib/firebase";
import { doc, setDoc } from "firebase/firestore";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const schema = z.object({
  fullName: z.string().min(2, "Your full name is required"),
  birthDate: z.string().optional(),
  birthPlace: z.string().optional(),
  clanOrCulturalInfo: z.string().optional(),
  relativesNames: z.string().optional(), // comma separated
  nid: z.string().optional(),
  phoneNumber: z.string().optional(),
  socialMedias: z.string().optional(),
  location: z.string().optional(),
  maritalStatus: z.string().optional(),
  spouseName: z.string().optional(),
  education: z.string().optional(),
  work: z.string().optional(),
});

export default function ProfileSetupPage() {
  const { user, userProfile, loading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
    if (!loading && userProfile?.profileCompleted) {
      router.replace("/dashboard");
    }
  }, [loading, user, userProfile, router]);

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      fullName: userProfile?.fullName ?? "",
      birthDate: userProfile?.birthDate ?? "",
      birthPlace: userProfile?.birthPlace ?? "",
      clanOrCulturalInfo: userProfile?.clanOrCulturalInfo ?? "",
      relativesNames: (userProfile?.relativesNames ?? []).join(", "),
      nid: userProfile?.nid ?? "",
      phoneNumber: userProfile?.phoneNumber ?? "",
      socialMedias: userProfile?.socialMedias ?? "",
      location: userProfile?.location ?? "",
      maritalStatus: userProfile?.maritalStatus ?? "",
      spouseName: userProfile?.spouseName ?? "",
      education: userProfile?.education ?? "",
      work: userProfile?.work ?? "",
    },
  });

  async function onSubmit(values: z.infer<typeof schema>) {
    if (!user) return;
    const relatives = (values.relativesNames ?? "")
      .split(",")
      .map((s: string) => s.trim())
      .filter(Boolean);
    try {
      const nowIso = new Date().toISOString();
      await setDoc(
        doc(db, "users", user.uid),
        {
          userId: user.uid,
          fullName: values.fullName,
          birthDate: values.birthDate || undefined,
          birthPlace: values.birthPlace || undefined,
          clanOrCulturalInfo: values.clanOrCulturalInfo || undefined,
          relativesNames: relatives,
          nid: values.nid || undefined,
          phoneNumber: values.phoneNumber || undefined,
          socialMedias: values.socialMedias || undefined,
          location: values.location || undefined,
          maritalStatus: values.maritalStatus || undefined,
          spouseName: values.spouseName || undefined,
          education: values.education || undefined,
          work: values.work || undefined,
          profileCompleted: true,
          updatedAt: nowIso,
        },
        { merge: true }
      );
      toast({ title: "Profile saved", description: "Thanks! Let's continue." });
      router.replace("/dashboard");
    } catch (e: any) {
      toast({
        title: "Save failed",
        description: e?.message ?? "Try again",
        variant: "destructive",
      });
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-headline text-3xl font-bold text-primary md:text-4xl">
          Complete Your Profile
        </h1>
        <p className="mt-2 text-lg text-muted-foreground">
          Provide details so AI can suggest potential family connections.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="font-headline text-2xl text-primary">
            Required Information
          </CardTitle>
          <CardDescription>
            We use this to personalize AI matching. You control your privacy.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="grid gap-6 md:grid-cols-2"
            >
              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Jane Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="birthDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Birth Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="birthPlace"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Birth Place</FormLabel>
                    <FormControl>
                      <Input placeholder="City, Country" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="clanOrCulturalInfo"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Clan / Cultural Info</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Tribe, clan, region, language group"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="relativesNames"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Known Relatives (comma separated)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., John Doe, Mary Doe, ..."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="nid"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>National ID</FormLabel>
                    <FormControl>
                      <Input placeholder="Your National ID" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phoneNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number</FormLabel>
                    <FormControl>
                      <Input placeholder="+1234567890" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="socialMedias"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Social Media Links</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="e.g., Facebook: url, Twitter: url"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Current Location</FormLabel>
                    <FormControl>
                      <Input placeholder="City, Country" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="maritalStatus"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Marital Status</FormLabel>
                    <FormControl>
                      <Input placeholder="Single, Married, etc." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="spouseName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Spouse Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Spouse's full name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="education"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Education Information</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Degrees, schools, etc."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="work"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Work/Job Information</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Occupation, company, etc."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="md:col-span-2">
                <Button type="submit" className="w-full sm:w-auto">
                  Save and Continue
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
