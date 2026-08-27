import ResumeBuilder from "@/components/resume/ResumeBuilder";

export default async function ResumeBuilderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div className="space-y-8">
      <div className="border-b border-border pb-6 print:hidden">
        <h1 className="flex items-center gap-3 font-display text-2xl font-bold tracking-tight text-foreground">
          <span className="material-symbols-outlined text-[28px] text-primary">edit_document</span>
          Resume Workspace
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Edit structured resume sections, preview the final document, and run AI-powered ATS checks.
        </p>
      </div>

      <ResumeBuilder resumeId={id} />
    </div>
  );
}
