"use client";

interface ResumePreviewProps {
  resume: any;
}

function ListItems({ items }: { items?: string[] }) {
  const filtered = (items || []).filter(Boolean);
  if (filtered.length === 0) {
    return null;
  }

  return (
    <ul className="list-disc ml-5 space-y-1">
      {filtered.map((item, index) => (
        <li key={index}>{item}</li>
      ))}
    </ul>
  );
}

export default function ResumePreview({ resume }: ResumePreviewProps) {
  const content = resume?.content || {};
  const personal = content.personalInfo || {};
  const skills = content.skills || {};

  return (
    <article id="resume-preview" className="bg-white text-[#111] p-8 shadow-xl print:shadow-none print:p-0">
      <header className="border-b border-[#d4d4d4] pb-4">
        <h1 className="text-3xl font-bold tracking-tight">{personal.fullName || "Your Name"}</h1>
        <p className="text-sm mt-2 text-[#444]">
          {[personal.email, personal.phone, personal.location].filter(Boolean).join(" | ")}
        </p>
        <p className="text-sm text-[#444]">
          {[personal.linkedin, personal.github, personal.portfolio].filter(Boolean).join(" | ")}
        </p>
      </header>

      {personal.summary && (
        <section className="mt-5">
          <h2 className="text-sm font-bold uppercase tracking-widest border-b border-[#e5e5e5] pb-1">Summary</h2>
          <p className="text-sm mt-2 leading-relaxed">{personal.summary}</p>
        </section>
      )}

      <section className="mt-5">
        <h2 className="text-sm font-bold uppercase tracking-widest border-b border-[#e5e5e5] pb-1">Skills</h2>
        <div className="text-sm mt-2 space-y-1">
          {Object.entries(skills).map(([key, value]) => (
            Array.isArray(value) && value.length > 0 ? (
              <p key={key}>
                <strong className="capitalize">{key}:</strong> {value.join(", ")}
              </p>
            ) : null
          ))}
        </div>
      </section>

      {(content.experience || []).length > 0 && (
        <section className="mt-5">
          <h2 className="text-sm font-bold uppercase tracking-widest border-b border-[#e5e5e5] pb-1">Experience</h2>
          <div className="space-y-4 mt-3">
            {content.experience.map((item: any, index: number) => (
              <div key={index}>
                <div className="flex justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-sm">{item.title}</h3>
                    <p className="text-sm text-[#444]">{item.company} {item.location ? `- ${item.location}` : ""}</p>
                  </div>
                  <p className="text-xs text-[#555]">{item.startDate} - {item.current ? "Present" : item.endDate}</p>
                </div>
                <ListItems items={item.bullets} />
              </div>
            ))}
          </div>
        </section>
      )}

      {(content.projects || []).length > 0 && (
        <section className="mt-5">
          <h2 className="text-sm font-bold uppercase tracking-widest border-b border-[#e5e5e5] pb-1">Projects</h2>
          <div className="space-y-4 mt-3">
            {content.projects.map((item: any, index: number) => (
              <div key={index}>
                <h3 className="font-bold text-sm">{item.name}</h3>
                <p className="text-sm">{item.description}</p>
                <p className="text-xs text-[#555]">{(item.technologies || []).join(", ")}</p>
                <ListItems items={item.bullets} />
              </div>
            ))}
          </div>
        </section>
      )}

      {(content.education || []).length > 0 && (
        <section className="mt-5">
          <h2 className="text-sm font-bold uppercase tracking-widest border-b border-[#e5e5e5] pb-1">Education</h2>
          <div className="space-y-3 mt-3">
            {content.education.map((item: any, index: number) => (
              <div key={index} className="flex justify-between gap-3 text-sm">
                <div>
                  <p className="font-bold">{item.degree} {item.field ? `in ${item.field}` : ""}</p>
                  <p className="text-[#444]">{item.institution}</p>
                </div>
                <p className="text-xs text-[#555]">{item.startDate} - {item.endDate}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </article>
  );
}
