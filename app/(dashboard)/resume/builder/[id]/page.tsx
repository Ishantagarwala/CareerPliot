import ResumeBuilder from "@/components/resume/ResumeBuilder";

export default async function ResumeBuilderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div className="space-y-8">
      <div className="border-b border-[#262626] pb-6 print:hidden">
        <h1
          className="text-3xl font-bold text-white tracking-tight flex items-center gap-3"
          style={{ fontFamily: "'Hanken Grotesk', system-ui, sans-serif" }}
        >
          <span className="material-symbols-outlined text-[28px]">edit_document</span>
          Resume Workspace
        </h1>
        <p className="text-sm text-[#8e9192] mt-2">
          Edit structured resume sections, preview the final document, and run AI-powered ATS checks.
        </p>
      </div>

      <ResumeBuilder resumeId={id} />
    </div>
  );
}
