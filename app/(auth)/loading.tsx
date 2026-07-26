import PageLoader from "@/components/layout/PageLoader";

export default function AuthLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
      <PageLoader label="Loading" />
    </div>
  );
}
