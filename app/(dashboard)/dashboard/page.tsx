"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Compass,
  Award,
  BookOpen,
  ArrowRight,
  Sparkles,
  LayoutDashboard,
  CheckCircle2,
} from "lucide-react";

interface CareerRecommendation {
  _id: string;
  careerPath: string;
  matchScore: number;
  reasoning: string;
  selected: boolean;
}

export default function DashboardHome() {
  const { data: session } = useSession();
  const [selectedPath, setSelectedPath] = useState<CareerRecommendation | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch("/api/career/recommendations");
        if (res.ok) {
          const recommendations = await res.json();
          const selected = recommendations.find((rec: CareerRecommendation) => rec.selected);
          setSelectedPath(selected || null);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const cards = [
    {
      title: "Career Discovery",
      description: "Take the AI assessment to discover the best fit jobs and professions based on your profile.",
      href: "/career",
      icon: Compass,
      color: "bg-blue-500/10 text-blue-500",
    },
    {
      title: "Learning Roadmap",
      description: "Follow a tailored step-by-step timeline of Beginner, Intermediate, and Advanced milestones.",
      href: "/roadmap",
      icon: Award,
      color: "bg-purple-500/10 text-purple-500",
      disabled: !selectedPath,
    },
    {
      title: "Courses",
      description: "Explore curated online courses recommended specifically to hit your learning goals.",
      href: "/courses",
      icon: BookOpen,
      color: "bg-emerald-500/10 text-emerald-500",
      disabled: !selectedPath,
    },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome Hero */}
      <div className="flex flex-col gap-2 border-b border-border pb-5">
        <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <LayoutDashboard className="h-7 w-7 text-primary" />
          Dashboard
        </h1>
        <p className="text-muted-foreground text-sm">
          Welcome back, <span className="font-bold text-foreground">{session?.user?.name || "Student"}</span>! Here is an overview of your progress.
        </p>
      </div>

      {/* Profile Overview Card */}
      <div className="relative">
        {loading ? (
          <div className="h-44 w-full animate-pulse rounded-2xl bg-muted" />
        ) : selectedPath ? (
          <Card className="border-border bg-card shadow-sm overflow-hidden relative">
            <div className="absolute inset-y-0 right-0 w-1/3 bg-radial from-primary/5 to-transparent pointer-events-none" />
            <CardHeader className="pb-3">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-2.5 py-0.5 text-xs font-semibold text-primary mb-2 self-start">
                <Sparkles className="h-3 w-3" /> Active Profile
              </div>
              <CardTitle className="font-heading text-2xl font-bold">
                {selectedPath.careerPath}
              </CardTitle>
              <CardDescription>
                Compatibility Score: {selectedPath.matchScore}% Match
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {selectedPath.reasoning}
              </p>
            </CardContent>
            <CardFooter className="pt-2 border-t border-border/50 bg-zinc-50/50 dark:bg-zinc-950/20 flex gap-4">
              <Link href="/roadmap" className={buttonVariants({ size: "sm", className: "font-semibold" })}>
                View Learning Roadmap
                <ArrowRight className="h-4 w-4 ml-1.5" />
              </Link>
              <Link href="/career" className={buttonVariants({ size: "sm", variant: "outline" })}>Change Career Path</Link>
            </CardFooter>
          </Card>
        ) : (
          <Card className="border-dashed border-2 border-border bg-card/50 text-center py-10 px-6 max-w-2xl mx-auto flex flex-col items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <Compass className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h3 className="font-heading font-bold text-lg">No Active Career Path Selected</h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                Unlock learning roadmaps, courses, and AI mentoring by taking our quick Career Discovery questionnaire.
              </p>
            </div>
            <Link href="/career" className={buttonVariants({ variant: "default", className: "font-semibold" })}>
              Get Started
              <ArrowRight className="h-4 w-4 ml-1.5" />
            </Link>
          </Card>
        )}
      </div>

      {/* Navigation shortcuts */}
      <div className="space-y-4">
        <h3 className="font-heading font-bold text-lg">Quick Shortcuts</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {cards.map((card, idx) => (
            <Card
              key={idx}
              className={`flex flex-col border-border transition-all duration-300 ${
                card.disabled ? "opacity-60 bg-muted/40 cursor-not-allowed" : "bg-card hover:shadow-md"
              }`}
            >
              <CardHeader className="pb-2 flex-1">
                <div className={`h-10 w-10 rounded-lg flex items-center justify-center mb-4 ${card.color}`}>
                  <card.icon className="h-5 w-5" />
                </div>
                <CardTitle className="font-heading text-lg font-bold">{card.title}</CardTitle>
                <CardDescription className="text-sm leading-relaxed mt-1">
                  {card.description}
                </CardDescription>
              </CardHeader>
              <CardFooter className="pt-2 border-t border-border/50 bg-zinc-50/50 dark:bg-zinc-950/20">
                {card.disabled ? (
                  <span className="text-xs text-muted-foreground font-semibold">Select career path first</span>
                ) : (
                  <Link href={card.href} className={buttonVariants({ variant: "ghost", size: "sm", className: "w-full justify-between font-semibold group" })}>
                    Navigate
                    <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
