export default function PageLoader({ label = "Loading" }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-6 py-24 min-h-[60vh] w-full">
      <div className="relative h-16 w-16">
        {/* Neo-brutalist spinning square */}
        <div className="absolute inset-0 border-4 border-black bg-card animate-cp-spin" />
        <div className="absolute inset-0 border-4 border-black bg-primary animate-cp-spin [animation-delay:-0.4s] opacity-70" />
        <div className="absolute inset-3 border-2 border-black bg-cyan animate-cp-pulse" />
      </div>

      <div className="flex items-center gap-1.5">
        <span className="font-display text-sm font-bold uppercase tracking-[0.2em] text-foreground">
          {label}
        </span>
        <span className="flex gap-1">
          <span className="h-1.5 w-1.5 bg-primary border border-black animate-cp-bounce" />
          <span className="h-1.5 w-1.5 bg-primary border border-black animate-cp-bounce [animation-delay:0.15s]" />
          <span className="h-1.5 w-1.5 bg-primary border border-black animate-cp-bounce [animation-delay:0.3s]" />
        </span>
      </div>
    </div>
  );
}
