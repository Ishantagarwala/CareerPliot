import PageLoader from "@/components/layout/PageLoader";

export default function RootLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
      <PageLoader label="Career Pilot" />
    </div>
  );
}
