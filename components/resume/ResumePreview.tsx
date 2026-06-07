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
    <ul className="list-disc ml-5 mt-1 space-y-0.5 text-[10.5px] leading-snug">
      {filtered.map((item, index) => (
        <li key={index}>{item}</li>
      ))}
    </ul>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-2.5">
      <h2 className="text-[13px] font-bold uppercase tracking-wide border-b border-black pb-0.5 leading-none">
        {title}
      </h2>
      <div className="pt-1.5">{children}</div>
    </section>
  );
}

function HeadingRow({
  title,
  meta,
  subtitle,
  detail,
}: {
  title?: string;
  meta?: string;
  subtitle?: string;
  detail?: string;
}) {
  return (
    <div className="mb-1.5">
      <div className="flex justify-between gap-4 text-[11px] leading-tight">
        <p className="font-bold">{title}</p>
        {meta && <p className="font-bold text-right shrink-0">{meta}</p>}
      </div>
      {(subtitle || detail) && (
        <div className="flex justify-between gap-4 text-[10.5px] italic leading-tight">
          <p>{subtitle}</p>
          {detail && <p className="text-right shrink-0">{detail}</p>}
        </div>
      )}
    </div>
  );
}

export default function ResumePreview({ resume }: ResumePreviewProps) {
  const content = resume?.content || {};
  const personal = content.personalInfo || {};
  const skills = content.skills || {};
  const contactLine = [
    personal.phone,
    personal.email,
    personal.linkedin,
    personal.github,
    personal.portfolio,
  ].filter(Boolean);

  return (
    <article
      id="resume-preview"
      className="bg-white text-black shadow-xl print:shadow-none mx-auto w-full max-w-[8.5in] min-h-[11in] px-[0.42in] py-[0.34in] font-serif"
    >
      <header className="text-center">
        <h1 className="text-[24px] font-bold uppercase tracking-wide leading-none">
          {personal.fullName || "Your Name"}
        </h1>
        {contactLine.length > 0 && (
          <p className="text-[10.5px] mt-2 leading-tight">
            {contactLine.join("  |  ")}
          </p>
        )}
        {personal.location && (
          <p className="text-[10.5px] leading-tight">{personal.location}</p>
        )}
      </header>

      {personal.summary && (
        <Section title="Summary">
          <p className="text-[10.5px] leading-snug">{personal.summary}</p>
        </Section>
      )}

      {(content.education || []).length > 0 && (
        <Section title="Education">
          <div className="space-y-1">
            {content.education.map((item: any, index: number) => (
              <HeadingRow
                key={index}
                title={item.institution}
                meta={[item.startDate, item.endDate].filter(Boolean).join(" - ")}
                subtitle={[item.degree, item.field].filter(Boolean).join(" in ")}
                detail={item.gpa ? `CGPA: ${item.gpa}` : undefined}
              />
            ))}
          </div>
        </Section>
      )}

      <Section title="Skills">
        <div className="text-[10.5px] leading-snug space-y-0.5">
          {Object.entries({
            Languages: skills.technical,
            "AI/ML & Frameworks": skills.frameworks,
            "Developer Tools": skills.tools,
            Interpersonal: skills.soft,
          }).map(([key, value]) => (
            Array.isArray(value) && value.length > 0 ? (
              <p key={key}>
                <strong>{key}:</strong> {value.join(", ")}
              </p>
            ) : null
          ))}
        </div>
      </Section>

      {(content.experience || []).length > 0 && (
        <Section title="Experience">
          <div className="space-y-1">
            {content.experience.map((item: any, index: number) => (
              <div key={index}>
                <HeadingRow
                  title={[item.company, item.title].filter(Boolean).join(", ")}
                  meta={[item.startDate, item.current ? "Present" : item.endDate].filter(Boolean).join(" -- ")}
                  subtitle={item.location}
                />
                <ListItems items={item.bullets} />
              </div>
            ))}
          </div>
        </Section>
      )}

      {(content.projects || []).length > 0 && (
        <Section title="Projects">
          <div className="space-y-1">
            {content.projects.map((item: any, index: number) => (
              <div key={index}>
                <HeadingRow
                  title={[item.name, (item.technologies || []).length ? `| ${item.technologies.join(", ")}` : ""].filter(Boolean).join(" ")}
                  meta={item.year || ""}
                  subtitle={item.github || item.url}
                />
                {item.description && (
                  <p className="text-[10.5px] leading-snug">{item.description}</p>
                )}
                <ListItems items={item.bullets} />
              </div>
            ))}
          </div>
        </Section>
      )}

      {(content.certifications || []).length > 0 && (
        <Section title="Certifications">
          <div className="space-y-1">
            {content.certifications.map((item: any, index: number) => (
              <HeadingRow
                key={index}
                title={item.name}
                meta={item.date}
                subtitle={item.issuer}
                detail={item.url}
              />
            ))}
          </div>
        </Section>
      )}

      {(content.customSections || []).map((section: any, sectionIndex: number) => (
        section?.title && (section.items || []).length > 0 ? (
          <Section key={sectionIndex} title={section.title}>
            <div className="space-y-1">
              {section.items.map((item: any, itemIndex: number) => (
                <div key={itemIndex}>
                  <HeadingRow
                    title={item.heading}
                    meta={item.date}
                    subtitle={item.subheading}
                    detail={item.link}
                  />
                  <ListItems items={item.bullets} />
                </div>
              ))}
            </div>
          </Section>
        ) : null
      ))}
    </article>
  );
}
