import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Star, ExternalLink, GraduationCap } from "lucide-react";

interface Course {
  _id: string;
  title: string;
  platform: string;
  url: string;
  skillLevel: "beginner" | "intermediate" | "advanced";
  isFree: boolean;
  rating?: number;
}

interface CourseCardProps {
  course: Course;
}

export default function CourseCard({ course }: CourseCardProps) {
  // Star rendering helper
  const renderStars = (rating: number = 5) => {
    const stars = [];
    const floor = Math.floor(rating);
    for (let i = 1; i <= 5; i++) {
      if (i <= floor) {
        stars.push(<Star key={i} className="h-3.5 w-3.5 fill-amber-400 text-amber-400 shrink-0" />);
      } else {
        stars.push(<Star key={i} className="h-3.5 w-3.5 text-zinc-300 shrink-0" />);
      }
    }
    return stars;
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case "beginner":
        return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      case "intermediate":
        return "bg-purple-500/10 text-purple-500 border-purple-500/20";
      case "advanced":
        return "bg-pink-500/10 text-pink-500 border-pink-500/20";
      default:
        return "bg-zinc-500/10 text-zinc-500 border-zinc-500/20";
    }
  };

  return (
    <Card className="flex flex-col border-border bg-card hover:shadow-md transition-all duration-300">
      <CardHeader className="pb-3 flex-1">
        <div className="flex justify-between items-start gap-2 mb-3">
          <Badge variant="outline" className="font-semibold px-2 py-0.5 text-xs bg-muted">
            {course.platform}
          </Badge>
          <div className="flex gap-1">
            <Badge variant="outline" className={`capitalize font-semibold text-xs ${getLevelColor(course.skillLevel)}`}>
              {course.skillLevel}
            </Badge>
            <Badge className={`text-xs font-semibold ${course.isFree ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-amber-500/10 text-amber-500 border-amber-500/20"}`}>
              {course.isFree ? "Free" : "Paid"}
            </Badge>
          </div>
        </div>
        
        <CardTitle className="font-heading text-base font-bold text-foreground leading-snug line-clamp-2">
          {course.title}
        </CardTitle>
      </CardHeader>

      <CardContent className="pb-4">
        {course.rating && (
          <div className="flex items-center gap-1.5">
            <div className="flex">{renderStars(course.rating)}</div>
            <span className="text-xs font-bold text-foreground mt-0.5">{course.rating.toFixed(1)}</span>
          </div>
        )}
      </CardContent>

      <CardFooter className="pt-3 border-t border-border/50 bg-zinc-50/50 dark:bg-zinc-950/20">
        <a href={course.url} target="_blank" rel="noopener noreferrer" className={buttonVariants({ variant: "ghost", size: "sm", className: "w-full justify-between font-semibold hover:bg-primary/5 hover:text-primary group" })}>
          <span className="flex items-center gap-1.5">
            <GraduationCap className="h-4 w-4" /> Go to Course
          </span>
          <ExternalLink className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </a>
      </CardFooter>
    </Card>
  );
}
