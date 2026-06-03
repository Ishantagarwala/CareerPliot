"use client";

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, Sparkles, Loader2 } from "lucide-react";

interface CareerRecommendation {
  _id: string;
  careerPath: string;
  matchScore: number;
  reasoning: string;
  selected: boolean;
}

interface RecommendationCardProps {
  rec: CareerRecommendation;
  onSelect: (id: string) => Promise<void>;
  selectingId: string | null;
}

export default function RecommendationCard({ rec, onSelect, selectingId }: RecommendationCardProps) {
  const isSelected = rec.selected;
  const isSelecting = selectingId === rec._id;

  // Compute a match score color
  const getScoreColor = (score: number) => {
    if (score >= 90) return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
    if (score >= 80) return "bg-purple-500/10 text-purple-500 border-purple-500/20";
    return "bg-blue-500/10 text-blue-500 border-blue-500/20";
  };

  return (
    <Card className={`relative overflow-hidden transition-all duration-300 ${isSelected ? "border-primary ring-2 ring-primary/20 bg-primary/[0.02]" : "border-border hover:shadow-md"}`}>
      {isSelected && (
        <div className="absolute top-0 right-0 bg-primary text-primary-foreground px-3 py-1 rounded-bl-lg text-xs font-semibold flex items-center gap-1">
          <Check className="h-3 w-3" /> Selected Path
        </div>
      )}
      
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start gap-4 pr-16">
          <div>
            <CardTitle className="font-heading text-xl font-bold text-foreground">
              {rec.careerPath}
            </CardTitle>
            <CardDescription className="mt-1">
              AI Match Compatibility
            </CardDescription>
          </div>
          <Badge className={`text-sm font-semibold py-1 px-2.5 ${getScoreColor(rec.matchScore)}`}>
            {rec.matchScore}% Match
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="pb-4">
        <div className="flex gap-2 items-start text-sm text-muted-foreground leading-relaxed bg-muted/30 p-3 rounded-lg border border-border/50">
          <Sparkles className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
          <p>{rec.reasoning}</p>
        </div>
      </CardContent>

      <CardFooter className="pt-2 border-t border-border/50 bg-zinc-50/50 dark:bg-zinc-950/20">
        <Button
          variant={isSelected ? "secondary" : "default"}
          onClick={() => onSelect(rec._id)}
          disabled={isSelected || isSelecting}
          className="w-full font-semibold"
        >
          {isSelecting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Selecting...
            </>
          ) : isSelected ? (
            <>
              <Check className="h-4 w-4 mr-2" />
              Current Career Path
            </>
          ) : (
            "Select This Career Path"
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
