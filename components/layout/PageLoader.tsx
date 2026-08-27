export default function PageLoader({ label = "Loading" }: { label?: string }) {
  return (
    <div className="flex min-h-[60vh] w-full flex-col items-center justify-center gap-6 py-24">
      <div className="relative h-14 w-14">
        <div className="absolute inset-0 rounded-full border-2 border-border" />
        <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-primary" />
        <div className="animate-cp-pulse absolute inset-3 rounded-full bg-primary/15" />
      </div>

      <div className="flex items-center gap-1.5">
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
        <span className="flex gap-1">
          <span className="animate-cp-dot h-1.5 w-1.5 rounded-full bg-primary" />
          <span className="animate-cp-dot h-1.5 w-1.5 rounded-full bg-primary [animation-delay:0.15s]" />
          <span className="animate-cp-dot h-1.5 w-1.5 rounded-full bg-primary [animation-delay:0.3s]" />
        </span>
      </div>
    </div>
  );
}
