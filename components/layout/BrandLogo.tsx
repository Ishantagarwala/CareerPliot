import { cn } from "@/lib/utils";

type BrandLogoProps = {
  className?: string;
  imgClassName?: string;
  size?: "sm" | "md" | "lg";
  alt?: string;
};

const sizeMap = {
  sm: "h-8 w-8",
  md: "h-10 w-10",
  lg: "h-14 w-14",
};

/** Career Pilot mark — use wherever the product brand appears. */
export default function BrandLogo({
  className,
  imgClassName,
  size = "md",
  alt = "Career Pilot",
}: BrandLogoProps) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center overflow-hidden border-2 border-black bg-card",
        sizeMap[size],
        className
      )}
    >
      <img
        src="/logo.png"
        alt={alt}
        className={cn("h-full w-full object-cover", imgClassName)}
      />
    </span>
  );
}
