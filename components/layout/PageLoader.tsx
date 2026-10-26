"use client";

import LiquidWaveSpinner from "@/components/ui/spinner-10";

export default function PageLoader({
  label = "Loading",
  size = "md",
}: {
  label?: string;
  size?: "sm" | "md" | "lg";
}) {
  const dynamicWords =
    label && label !== "Loading"
      ? [
          label,
          "Calibrating career nodes ...",
          "Syncing student workspace ...",
        ]
      : [
          "Loading assets ...",
          "Calibrating career nodes ...",
          "Preparing student workspace ...",
        ];

  return (
    <div className="flex flex-col items-center justify-center py-16 min-h-[50vh] w-full bg-transparent">
      <LiquidWaveSpinner size={size} words={dynamicWords} />
    </div>
  );
}
