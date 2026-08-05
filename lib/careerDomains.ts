/**
 * Career domain layer (Phase 2 + Phase 3 long-tail).
 * Named domains get full catalogs. `other` covers niche careers via free-text niche + LLM chips.
 */

export const CAREER_DOMAINS = [
  "technology",
  "healthcare",
  "business",
  "design",
  "law",
  "education",
  "science",
  "engineering",
  "other",
] as const;

export type CareerDomain = (typeof CAREER_DOMAINS)[number];

export interface ResumeSkillLabels {
  technical: string;
  frameworks: string;
  tools: string;
  soft: string;
}

/** Maps to existing ATS score buckets so we keep the same JSON schema. */
export interface DomainResumeRubric {
  /** openSource bucket (0–35) */
  community: { label: string; guidance: string };
  /** selfProjects bucket (0–30) */
  portfolio: { label: string; guidance: string };
  /** production bucket (0–25) */
  experience: { label: string; guidance: string };
  /** technicalSkills bucket (0–10) */
  skills: { label: string; guidance: string };
  bonusExamples: string;
  deductionExamples: string;
  recruiterRole: string;
}

export interface DomainNewsSource {
  url: string;
  source: string;
  tags: string[];
  category: "Featured" | "Live Feed" | "In-Depth Analysis";
}

export interface DomainConfig {
  id: CareerDomain;
  label: string;
  description: string;
  interests: string[];
  subjects: string[];
  skillSuggestions: string[];
  goalExamples: string[];
  defaultJobQuery: string;
  skillLabels: ResumeSkillLabels;
  resumeRubric: DomainResumeRubric;
  newsQueries: Array<{ q: string; tags: string[] }>;
  newsFeeds: DomainNewsSource[];
  featureFlags: {
    showHackathons: boolean;
    showProjects: boolean;
  };
}

const TECHNOLOGY: DomainConfig = {
  id: "technology",
  label: "Technology",
  description: "Software, data, AI, cybersecurity, and product engineering",
  interests: [
    "Software Engineering",
    "Artificial Intelligence",
    "Data Science",
    "Cybersecurity",
    "Product Management",
    "UI/UX Design",
    "Cloud & DevOps",
    "Mobile Development",
  ],
  subjects: [
    "Computer Science",
    "Mathematics",
    "Statistics & Probability",
    "Data Structures & Algorithms",
    "Web Development",
    "Machine Learning & AI",
    "Database Systems",
    "Computer Networks",
  ],
  skillSuggestions: [
    "Python",
    "JavaScript",
    "SQL",
    "React",
    "Git",
    "Problem Solving",
    "System Design",
    "Communication",
  ],
  goalExamples: [
    "I want to become a software engineer building production systems.",
    "I want to work in AI/ML research or applied machine learning.",
  ],
  defaultJobQuery: "software engineer",
  skillLabels: {
    technical: "Languages",
    frameworks: "Frameworks & Libraries",
    tools: "Developer Tools",
    soft: "Soft Skills",
  },
  resumeRubric: {
    community: {
      label: "Open Source / Community",
      guidance: "External OSS contributions, PRs, GSoC, hackathons, tech communities (0–35)",
    },
    portfolio: {
      label: "Self Projects",
      guidance: "Personal projects with complexity, demos, GitHub, real impact — not tutorials (0–30)",
    },
    experience: {
      label: "Production Experience",
      guidance: "Internships/jobs with ownership, shipped systems, measurable outcomes (0–25)",
    },
    skills: {
      label: "Technical Skills",
      guidance: "Demonstrated depth via projects/experience; named tech alone scores low (0–10)",
    },
    bonusExamples: "GSoC (+5), founder (+5), portfolio (+2), technical blogs (+3)",
    deductionExamples: "Tutorial-only projects, missing links, generic project names",
    recruiterRole: "senior engineering recruiter",
  },
  newsQueries: [
    { q: "India tech hiring internship", tags: ["India", "Hiring", "Internship"] },
    { q: "India startup funding", tags: ["India", "Startups", "Funding"] },
    { q: "software developer jobs India", tags: ["India", "Jobs", "Technology"] },
  ],
  newsFeeds: [
    {
      url: "https://techcrunch.com/tag/india/feed/",
      source: "TechCrunch India",
      tags: ["India", "Startups", "Technology"],
      category: "Featured",
    },
    {
      url: "https://www.livemint.com/rss/technology",
      source: "Livemint Tech",
      tags: ["India", "Technology"],
      category: "In-Depth Analysis",
    },
    {
      url: "https://feeds.arstechnica.com/arstechnica/technology-lab",
      source: "Ars Technica",
      tags: ["Technology", "Analysis"],
      category: "In-Depth Analysis",
    },
  ],
  featureFlags: { showHackathons: true, showProjects: true },
};

const HEALTHCARE: DomainConfig = {
  id: "healthcare",
  label: "Healthcare",
  description: "Medicine, public health, clinical care, and life sciences",
  interests: [
    "Healthcare & Medical",
    "Biotechnology & Life Sciences",
    "Public Health",
    "Nursing & Allied Health",
    "Clinical Research",
    "Health Education",
    "Pharmacy",
    "Mental Health & Counseling",
  ],
  subjects: [
    "Biology",
    "Chemistry",
    "Medicine / Pre-Med",
    "Psychology",
    "Anatomy & Physiology",
    "Public Health",
    "Biochemistry",
    "Statistics & Probability",
  ],
  skillSuggestions: [
    "Patient Communication",
    "Research",
    "Empathy",
    "Clinical Observation",
    "Writing",
    "First Aid / CPR",
    "Data Literacy",
    "Teamwork",
  ],
  goalExamples: [
    "I want a career in medicine, public health, or health education.",
    "I want to work in clinical research or biotechnology.",
  ],
  defaultJobQuery: "health educator OR public health OR clinical research",
  skillLabels: {
    technical: "Clinical / Scientific Skills",
    frameworks: "Methods & Protocols",
    tools: "Tools & Platforms",
    soft: "Patient & Soft Skills",
  },
  resumeRubric: {
    community: {
      label: "Service & Outreach",
      guidance: "Volunteering, community health camps, patient education, NGO work (0–35)",
    },
    portfolio: {
      label: "Projects & Research",
      guidance: "Case studies, research posters, health campaigns, lab/field projects (0–30)",
    },
    experience: {
      label: "Clinical / Field Experience",
      guidance: "Shadowing, internships, hospital/clinic work, supervised practice (0–25)",
    },
    skills: {
      label: "Domain Skills",
      guidance: "Clinical, scientific, or health-education skills shown with evidence (0–10)",
    },
    bonusExamples: "CHES/CPR (+3–5), published abstract (+5), leadership in health club (+3)",
    deductionExamples: "Vague duties, no supervised practice, unverifiable claims",
    recruiterRole: "healthcare hiring manager / public health recruiter",
  },
  newsQueries: [
    { q: "India public health careers", tags: ["India", "Healthcare", "Hiring"] },
    { q: "India healthcare policy hospital", tags: ["India", "Healthcare", "Policy"] },
    { q: "medical internship India students", tags: ["India", "Healthcare", "Internship"] },
  ],
  newsFeeds: [
    {
      url: "https://www.thehindu.com/sci-tech/health/feeder/default.rss",
      source: "The Hindu Health",
      tags: ["India", "Healthcare"],
      category: "In-Depth Analysis",
    },
    {
      url: "https://www.livemint.com/rss/science",
      source: "Livemint Science",
      tags: ["India", "Healthcare", "Science"],
      category: "Live Feed",
    },
  ],
  featureFlags: { showHackathons: false, showProjects: true },
};

const BUSINESS: DomainConfig = {
  id: "business",
  label: "Business & Finance",
  description: "Finance, accounting, consulting, marketing, and entrepreneurship",
  interests: [
    "Finance & Accounting",
    "Business Management",
    "Consulting",
    "Digital Marketing",
    "Entrepreneurship",
    "Investment Banking",
    "Human Resources",
    "Operations & Supply Chain",
  ],
  subjects: [
    "Economics",
    "Accounting & Commerce",
    "Business Studies",
    "Mathematics",
    "Statistics & Probability",
    "Marketing",
    "Corporate Finance",
    "Management",
  ],
  skillSuggestions: [
    "Excel",
    "Financial Analysis",
    "Communication",
    "Presentation",
    "Market Research",
    "Negotiation",
    "SQL",
    "Leadership",
  ],
  goalExamples: [
    "I want to become a CA, analyst, or consultant.",
    "I want to build a career in marketing or entrepreneurship.",
  ],
  defaultJobQuery: "finance analyst OR accountant OR business analyst",
  skillLabels: {
    technical: "Analytical Skills",
    frameworks: "Frameworks & Methods",
    tools: "Business Tools",
    soft: "Professional Skills",
  },
  resumeRubric: {
    community: {
      label: "Leadership & Campus Impact",
      guidance: "Clubs, competitions, case contests, student orgs, community initiatives (0–35)",
    },
    portfolio: {
      label: "Casework & Projects",
      guidance: "Case competitions, business plans, analyses, live projects with outcomes (0–30)",
    },
    experience: {
      label: "Internships & Work",
      guidance: "Articleship, finance/marketing/ops internships with measurable results (0–25)",
    },
    skills: {
      label: "Business Skills",
      guidance: "Excel, analysis, domain tools shown through evidence (0–10)",
    },
    bonusExamples: "CA/CFA progress (+5), competition wins (+3–5), founded venture (+5)",
    deductionExamples: "Buzzword-only bullets, no numbers, unclear ownership",
    recruiterRole: "business and finance recruiter",
  },
  newsQueries: [
    { q: "India finance jobs hiring graduates", tags: ["India", "Business", "Hiring"] },
    { q: "India startup funding economy", tags: ["India", "Business", "Funding"] },
    { q: "CA articleship internship India", tags: ["India", "Business", "Internship"] },
  ],
  newsFeeds: [
    {
      url: "https://www.moneycontrol.com/rss/business.xml",
      source: "Moneycontrol Business",
      tags: ["India", "Business"],
      category: "Featured",
    },
    {
      url: "https://economictimes.indiatimes.com/markets/rssfeeds/1977021501.cms",
      source: "ET Markets",
      tags: ["India", "Business", "Finance"],
      category: "Live Feed",
    },
    {
      url: "https://inc42.com/feed/",
      source: "Inc42",
      tags: ["India", "Startups", "Business"],
      category: "Featured",
    },
  ],
  featureFlags: { showHackathons: false, showProjects: true },
};

const DESIGN: DomainConfig = {
  id: "design",
  label: "Design & Creative",
  description: "UX/UI, visual design, media, writing, and creative direction",
  interests: [
    "UI/UX Design",
    "Graphic Design",
    "Creative Writing & Media",
    "Journalism & Content",
    "Product Design",
    "Animation & Motion",
    "Brand & Marketing Design",
    "Arts, Fashion & Performing Arts",
  ],
  subjects: [
    "Design & Fine Arts",
    "Media & Communication",
    "English / Literature",
    "Psychology",
    "Visual Communication",
    "Human-Computer Interaction",
    "Marketing",
    "Photography",
  ],
  skillSuggestions: [
    "Figma",
    "Writing",
    "Visual Design",
    "User Research",
    "Storytelling",
    "Prototyping",
    "Adobe Creative Suite",
    "Presentation",
  ],
  goalExamples: [
    "I want to become a UX designer or product designer.",
    "I want a career in content, journalism, or creative media.",
  ],
  defaultJobQuery: "UX designer OR graphic designer OR content writer",
  skillLabels: {
    technical: "Craft Skills",
    frameworks: "Methods & Process",
    tools: "Design Tools",
    soft: "Collaboration Skills",
  },
  resumeRubric: {
    community: {
      label: "Community & Visibility",
      guidance: "Design communities, published work, talks, open design contributions (0–35)",
    },
    portfolio: {
      label: "Portfolio Pieces",
      guidance: "Case studies with process, outcomes, live links — not unexplained mockups (0–30)",
    },
    experience: {
      label: "Client / Work Experience",
      guidance: "Internships, freelance, shipped products, measurable design impact (0–25)",
    },
    skills: {
      label: "Craft Skills",
      guidance: "Research, visual, interaction, or writing craft shown with evidence (0–10)",
    },
    bonusExamples: "Strong case study (+5), published articles (+3), design award (+5)",
    deductionExamples: "No portfolio link, aesthetic-only work with no problem framing",
    recruiterRole: "design and creative hiring lead",
  },
  newsQueries: [
    { q: "motion graphics designer jobs India", tags: ["India", "Design", "Hiring"] },
    { q: "animation motion design careers India", tags: ["India", "Design", "Animation"] },
    { q: "UX UI design jobs India hiring", tags: ["India", "Design", "Hiring"] },
    { q: "creative industry graphic design India", tags: ["India", "Design", "Creative"] },
  ],
  newsFeeds: [
    {
      url: "https://www.smashingmagazine.com/feed/",
      source: "Smashing Magazine",
      tags: ["Design", "UX", "Creative"],
      category: "In-Depth Analysis",
    },
    {
      url: "https://css-tricks.com/feed/",
      source: "CSS-Tricks",
      tags: ["Design", "UX", "Creative"],
      category: "Live Feed",
    },
    {
      url: "https://www.creativebloq.com/feed",
      source: "Creative Bloq",
      tags: ["Design", "Creative", "Animation"],
      category: "Featured",
    },
  ],
  featureFlags: { showHackathons: false, showProjects: true },
};

const LAW: DomainConfig = {
  id: "law",
  label: "Law & Public Policy",
  description: "Law, governance, policy, civil services, and advocacy",
  interests: [
    "Law & Public Policy",
    "Civil Services",
    "Corporate Law",
    "Human Rights & Advocacy",
    "Public Administration",
    "Compliance & Governance",
    "International Relations",
    "Legal Research",
  ],
  subjects: [
    "Political Science",
    "Law / Legal Studies",
    "History",
    "Sociology",
    "Economics",
    "English / Literature",
    "Constitutional Law",
    "Public Administration",
  ],
  skillSuggestions: [
    "Legal Research",
    "Writing",
    "Critical Thinking",
    "Public Speaking",
    "Debate",
    "Analysis",
    "Negotiation",
    "Policy Brief Writing",
  ],
  goalExamples: [
    "I want to become a lawyer, policy analyst, or civil servant.",
    "I want to work in compliance, advocacy, or public administration.",
  ],
  defaultJobQuery: "legal intern OR policy analyst OR law graduate",
  skillLabels: {
    technical: "Legal / Analytical Skills",
    frameworks: "Areas of Law & Policy",
    tools: "Research Tools",
    soft: "Advocacy & Soft Skills",
  },
  resumeRubric: {
    community: {
      label: "Advocacy & Leadership",
      guidance: "Moot courts, debate, legal aid clinics, policy forums, student government (0–35)",
    },
    portfolio: {
      label: "Research & Writing",
      guidance: "Memos, papers, policy briefs, published pieces, competition memorials (0–30)",
    },
    experience: {
      label: "Internships & Clerkships",
      guidance: "Law firm, NGO, chambers, government internships with concrete work (0–25)",
    },
    skills: {
      label: "Legal Skills",
      guidance: "Research, drafting, argumentation shown with evidence (0–10)",
    },
    bonusExamples: "Moot wins (+5), published article (+3), legal aid hours (+3)",
    deductionExamples: "Vague internship bullets, no writing samples, title inflation",
    recruiterRole: "legal and public-policy recruiter",
  },
  newsQueries: [
    { q: "India law internship hiring graduates", tags: ["India", "Law", "Hiring"] },
    { q: "India public policy civil services", tags: ["India", "Law", "Policy"] },
    { q: "Supreme Court India legal news careers", tags: ["India", "Law"] },
  ],
  newsFeeds: [
    {
      url: "https://www.livelaw.in/rss/news",
      source: "LiveLaw",
      tags: ["India", "Law"],
      category: "Featured",
    },
    {
      url: "https://www.thehindu.com/news/national/feeder/default.rss",
      source: "The Hindu National",
      tags: ["India", "Policy", "Law"],
      category: "In-Depth Analysis",
    },
  ],
  featureFlags: { showHackathons: false, showProjects: true },
};

const EDUCATION: DomainConfig = {
  id: "education",
  label: "Education & Teaching",
  description: "Teaching, edtech, curriculum, counseling, and academic careers",
  interests: [
    "School Teaching",
    "Higher Education",
    "Special Education",
    "Educational Counseling",
    "Curriculum Design",
    "EdTech",
    "Early Childhood Education",
    "Training & Facilitation",
  ],
  subjects: [
    "Education / Pedagogy",
    "Psychology",
    "English / Literature",
    "Mathematics",
    "Child Development",
    "Sociology",
    "Subject Specialization",
    "Assessment & Evaluation",
  ],
  skillSuggestions: [
    "Lesson Planning",
    "Classroom Management",
    "Communication",
    "Mentoring",
    "Curriculum Design",
    "Public Speaking",
    "Empathy",
    "Assessment Design",
  ],
  goalExamples: [
    "I want to become a school teacher or education counselor.",
    "I want to build a career in curriculum design or edtech.",
  ],
  defaultJobQuery: "teacher OR educator OR academic counselor",
  skillLabels: {
    technical: "Teaching Skills",
    frameworks: "Pedagogy & Methods",
    tools: "Classroom & EdTech Tools",
    soft: "Student & Soft Skills",
  },
  resumeRubric: {
    community: {
      label: "Community & Mentorship",
      guidance: "Tutoring, volunteering, mentoring, education clubs, outreach (0–35)",
    },
    portfolio: {
      label: "Teaching Portfolio",
      guidance: "Lesson plans, demos, curriculum samples, student outcomes (0–30)",
    },
    experience: {
      label: "Teaching Experience",
      guidance: "Internships, practice teaching, tutoring jobs, facilitation roles (0–25)",
    },
    skills: {
      label: "Education Skills",
      guidance: "Pedagogy and subject skills shown with evidence (0–10)",
    },
    bonusExamples: "B.Ed/M.Ed progress (+5), teaching award (+3), published resource (+3)",
    deductionExamples: "No practice evidence, vague 'helped students' bullets",
    recruiterRole: "education hiring lead",
  },
  newsQueries: [
    { q: "India teacher jobs hiring education", tags: ["India", "Education", "Hiring"] },
    { q: "NEP education policy India careers", tags: ["India", "Education", "Policy"] },
    { q: "edtech teaching careers India", tags: ["India", "Education", "EdTech"] },
  ],
  newsFeeds: [
    {
      url: "https://www.thehindu.com/education/feeder/default.rss",
      source: "The Hindu Education",
      tags: ["India", "Education"],
      category: "Featured",
    },
  ],
  featureFlags: { showHackathons: false, showProjects: true },
};

const SCIENCE: DomainConfig = {
  id: "science",
  label: "Science & Research",
  description: "Pure/applied sciences, lab research, environment, and academia",
  interests: [
    "Scientific Research",
    "Laboratory Science",
    "Environmental Science",
    "Physics & Astronomy",
    "Chemistry",
    "Earth Sciences",
    "Science Communication",
    "Academic Research",
  ],
  subjects: [
    "Physics",
    "Chemistry",
    "Biology",
    "Mathematics",
    "Environmental Studies",
    "Statistics & Probability",
    "Research Methodology",
    "Earth Science / Geology",
  ],
  skillSuggestions: [
    "Lab Techniques",
    "Research",
    "Data Analysis",
    "Scientific Writing",
    "Experiment Design",
    "Critical Thinking",
    "Python",
    "Presentation",
  ],
  goalExamples: [
    "I want to become a research scientist or lab analyst.",
    "I want a career in environmental science or science communication.",
  ],
  defaultJobQuery: "research assistant OR lab analyst OR scientist",
  skillLabels: {
    technical: "Scientific Skills",
    frameworks: "Methods & Techniques",
    tools: "Lab & Analysis Tools",
    soft: "Collaboration Skills",
  },
  resumeRubric: {
    community: {
      label: "Scientific Community",
      guidance: "Conferences, science clubs, outreach, open research contributions (0–35)",
    },
    portfolio: {
      label: "Research & Projects",
      guidance: "Lab projects, posters, papers, reproducible analyses (0–30)",
    },
    experience: {
      label: "Lab / Field Experience",
      guidance: "Internships, RA roles, field work with concrete methods/results (0–25)",
    },
    skills: {
      label: "Science Skills",
      guidance: "Methods and tools shown through evidence (0–10)",
    },
    bonusExamples: "Poster/paper (+5), olympiad (+3), funded project (+5)",
    deductionExamples: "Methods missing, unverifiable lab claims",
    recruiterRole: "science and research recruiter",
  },
  newsQueries: [
    { q: "India research internship science careers", tags: ["India", "Science", "Hiring"] },
    { q: "India laboratory scientist jobs", tags: ["India", "Science", "Hiring"] },
    { q: "environmental science careers India", tags: ["India", "Science", "Environment"] },
  ],
  newsFeeds: [
    {
      url: "https://www.thehindu.com/sci-tech/science/feeder/default.rss",
      source: "The Hindu Science",
      tags: ["India", "Science"],
      category: "Featured",
    },
    {
      url: "https://www.livemint.com/rss/science",
      source: "Livemint Science",
      tags: ["India", "Science"],
      category: "Live Feed",
    },
  ],
  featureFlags: { showHackathons: false, showProjects: true },
};

const ENGINEERING: DomainConfig = {
  id: "engineering",
  label: "Core Engineering",
  description: "Mechanical, electrical, civil, chemical, and related engineering",
  interests: [
    "Mechanical Engineering",
    "Electrical / Electronics",
    "Civil / Structural",
    "Chemical Engineering",
    "Automotive / Aerospace",
    "Manufacturing & Industrial",
    "Robotics & Embedded (Hardware)",
    "Energy & Power Systems",
  ],
  subjects: [
    "Physics",
    "Mathematics",
    "Engineering Drawing / CAD",
    "Thermodynamics",
    "Circuits & Electronics",
    "Strength of Materials",
    "Manufacturing Processes",
    "Control Systems",
  ],
  skillSuggestions: [
    "CAD / SolidWorks",
    "MATLAB",
    "Circuit Design",
    "Problem Solving",
    "Project Management",
    "Manufacturing Basics",
    "Technical Drawing",
    "Communication",
  ],
  goalExamples: [
    "I want to become a mechanical or electrical engineer in industry.",
    "I want a career in civil engineering, manufacturing, or energy systems.",
  ],
  defaultJobQuery: "mechanical engineer OR electrical engineer OR civil engineer graduate",
  skillLabels: {
    technical: "Engineering Skills",
    frameworks: "Methods & Standards",
    tools: "Engineering Tools",
    soft: "Professional Skills",
  },
  resumeRubric: {
    community: {
      label: "Clubs & Competitions",
      guidance: "SAE, robotics, tech clubs, hackathons-for-hardware, engineering societies (0–35)",
    },
    portfolio: {
      label: "Engineering Projects",
      guidance: "CAD models, prototypes, labs, competition bots with measurable results (0–30)",
    },
    experience: {
      label: "Internships & Shop Floor",
      guidance: "Plant/site internships, design office work, field engineering (0–25)",
    },
    skills: {
      label: "Engineering Skills",
      guidance: "CAD, analysis, and domain tools shown with evidence (0–10)",
    },
    bonusExamples: "Competition win (+5), patent/prototype (+5), GATE progress (+3)",
    deductionExamples: "Coursework-only projects, no drawings/specs linked",
    recruiterRole: "engineering hiring manager",
  },
  newsQueries: [
    { q: "India mechanical electrical engineer hiring", tags: ["India", "Engineering", "Hiring"] },
    { q: "civil engineering jobs India graduates", tags: ["India", "Engineering", "Hiring"] },
    { q: "manufacturing engineering careers India", tags: ["India", "Engineering"] },
  ],
  newsFeeds: [
    {
      url: "https://www.thehindu.com/sci-tech/technology/feeder/default.rss",
      source: "The Hindu Tech",
      tags: ["India", "Engineering", "Technology"],
      category: "Live Feed",
    },
  ],
  featureFlags: { showHackathons: true, showProjects: true },
};

const OTHER: DomainConfig = {
  id: "other",
  label: "Other / Niche Path",
  description: "Hospitality, trades, sports, agriculture, defense, and anything else — describe your niche",
  interests: [
    "Hospitality & Tourism",
    "Sports & Fitness",
    "Agriculture & Food",
    "Defense & Security",
    "Skilled Trades",
    "Social Work & NGOs",
    "Aviation & Logistics",
    "Custom Niche",
  ],
  subjects: [
    "General Studies",
    "Vocational Training",
    "Business Studies",
    "Physical Education",
    "Agriculture",
    "Hospitality Management",
    "Languages",
    "Practical Skills",
  ],
  skillSuggestions: [
    "Communication",
    "Problem Solving",
    "Customer Service",
    "Teamwork",
    "Time Management",
    "Hands-on Skills",
    "Leadership",
    "Adaptability",
  ],
  goalExamples: [
    "I want a career in hospitality, aviation, or tourism.",
    "I want to pursue a skilled trade, sports, agriculture, or another niche field.",
  ],
  defaultJobQuery: "graduate jobs OR entry level careers India",
  skillLabels: {
    technical: "Core Skills",
    frameworks: "Methods & Knowledge Areas",
    tools: "Tools & Platforms",
    soft: "Professional Skills",
  },
  resumeRubric: {
    community: {
      label: "Community Impact",
      guidance: "Clubs, volunteering, competitions, community service in your niche (0–35)",
    },
    portfolio: {
      label: "Projects & Proof",
      guidance: "Portfolio pieces, certifications, case work, or demonstrable outputs (0–30)",
    },
    experience: {
      label: "Relevant Experience",
      guidance: "Internships, apprenticeships, part-time work with concrete outcomes (0–25)",
    },
    skills: {
      label: "Domain Skills",
      guidance: "Niche skills shown with evidence (0–10)",
    },
    bonusExamples: "Industry certificate (+3–5), competition (+3), leadership (+3)",
    deductionExamples: "Generic bullets, no niche proof",
    recruiterRole: "generalist career recruiter",
  },
  newsQueries: [
    { q: "India graduate hiring careers", tags: ["India", "Hiring"] },
    { q: "India internship opportunities students", tags: ["India", "Internship", "Hiring"] },
  ],
  newsFeeds: [
    {
      url: "https://yourstory.com/feed",
      source: "YourStory",
      tags: ["India", "Careers"],
      category: "Live Feed",
    },
  ],
  featureFlags: { showHackathons: false, showProjects: true },
};

export const DOMAIN_CONFIGS: Record<CareerDomain, DomainConfig> = {
  technology: TECHNOLOGY,
  healthcare: HEALTHCARE,
  business: BUSINESS,
  design: DESIGN,
  law: LAW,
  education: EDUCATION,
  science: SCIENCE,
  engineering: ENGINEERING,
  other: OTHER,
};

export const DOMAIN_LIST: DomainConfig[] = CAREER_DOMAINS.map((id) => DOMAIN_CONFIGS[id]);

const INTEREST_TO_DOMAIN: Array<{ needle: string; domain: CareerDomain }> = [
  { needle: "software", domain: "technology" },
  { needle: "artificial intelligence", domain: "technology" },
  { needle: "data science", domain: "technology" },
  { needle: "cyber", domain: "technology" },
  { needle: "devops", domain: "technology" },
  { needle: "cloud", domain: "technology" },
  { needle: "coding", domain: "technology" },
  { needle: "healthcare", domain: "healthcare" },
  { needle: "medical", domain: "healthcare" },
  { needle: "biotech", domain: "healthcare" },
  { needle: "nursing", domain: "healthcare" },
  { needle: "public health", domain: "healthcare" },
  { needle: "pharmacy", domain: "healthcare" },
  { needle: "finance", domain: "business" },
  { needle: "accounting", domain: "business" },
  { needle: "business", domain: "business" },
  { needle: "marketing", domain: "business" },
  { needle: "entrepreneur", domain: "business" },
  { needle: "consulting", domain: "business" },
  { needle: "ui/ux", domain: "design" },
  { needle: "design", domain: "design" },
  { needle: "creative", domain: "design" },
  { needle: "journalism", domain: "design" },
  { needle: "media", domain: "design" },
  { needle: "writing", domain: "design" },
  { needle: "motion", domain: "design" },
  { needle: "animation", domain: "design" },
  { needle: "graphic", domain: "design" },
  { needle: "illustrat", domain: "design" },
  { needle: "law", domain: "law" },
  { needle: "policy", domain: "law" },
  { needle: "civil service", domain: "law" },
  { needle: "governance", domain: "law" },
  { needle: "teach", domain: "education" },
  { needle: "education", domain: "education" },
  { needle: "pedagogy", domain: "education" },
  { needle: "professor", domain: "education" },
  { needle: "counselor", domain: "education" },
  { needle: "research", domain: "science" },
  { needle: "physics", domain: "science" },
  { needle: "chemistry", domain: "science" },
  { needle: "laboratory", domain: "science" },
  { needle: "environment", domain: "science" },
  { needle: "mechanical", domain: "engineering" },
  { needle: "electrical", domain: "engineering" },
  { needle: "civil engineer", domain: "engineering" },
  { needle: "chemical engineer", domain: "engineering" },
  { needle: "manufacturing", domain: "engineering" },
  { needle: "hospitality", domain: "other" },
  { needle: "tourism", domain: "other" },
  { needle: "agriculture", domain: "other" },
  { needle: "sports", domain: "other" },
  { needle: "aviation", domain: "other" },
  { needle: "trade", domain: "other" },
];

export function isCareerDomain(value: unknown): value is CareerDomain {
  return typeof value === "string" && (CAREER_DOMAINS as readonly string[]).includes(value);
}

export function getDomainConfig(domain?: string | null): DomainConfig {
  if (isCareerDomain(domain)) return DOMAIN_CONFIGS[domain];
  return DOMAIN_CONFIGS.technology;
}

/** Infer primary domain from interests/subjects/goals/career path. */
export function inferCareerDomain(input: {
  interests?: string[];
  subjects?: string[];
  goals?: string;
  careerPath?: string;
}): CareerDomain {
  const hay = [
    ...(input.interests || []),
    ...(input.subjects || []),
    input.goals || "",
    input.careerPath || "",
  ]
    .join(" ")
    .toLowerCase();

  const scores: Record<CareerDomain, number> = {
    technology: 0,
    healthcare: 0,
    business: 0,
    design: 0,
    law: 0,
    education: 0,
    science: 0,
    engineering: 0,
    other: 0,
  };

  for (const { needle, domain } of INTEREST_TO_DOMAIN) {
    if (hay.includes(needle)) scores[domain] += 2;
  }

  // Soft boosts for common subject keywords
  if (/\b(biology|medicine|anatomy|nursing)\b/.test(hay)) scores.healthcare += 3;
  if (/\b(computer|programming|algorithm|software)\b/.test(hay)) scores.technology += 3;
  if (/\b(economics|accounting|commerce|mba|finance)\b/.test(hay)) scores.business += 3;
  if (/\b(figma|ux|ui|graphic|graphics|motion|animation|after effects|illustrator|literature|journalism)\b/.test(hay)) {
    scores.design += 3;
  }
  if (/\b(political|constitutional|legal|moot|upsc)\b/.test(hay)) scores.law += 3;
  if (/\b(teaching|b\.?ed|pedagogy|classroom|educator)\b/.test(hay)) scores.education += 3;
  if (/\b(physics|chemistry|research methodology|lab work|scientist)\b/.test(hay)) scores.science += 3;
  if (/\b(mechanical|electrical|civil|cad|solidworks|manufacturing)\b/.test(hay)) {
    scores.engineering += 3;
  }
  if (/\b(hospitality|tourism|agriculture|sports|aviation|chef|pilot)\b/.test(hay)) {
    scores.other += 3;
  }

  // Selected career path is the strongest signal when present
  if (input.careerPath?.trim()) {
    const pathHay = input.careerPath.toLowerCase();
    for (const { needle, domain } of INTEREST_TO_DOMAIN) {
      if (pathHay.includes(needle)) scores[domain] += 4;
    }
  }

  const ranked = CAREER_DOMAINS.map((id) => ({ id, score: scores[id] })).sort(
    (a, b) => b.score - a.score
  );

  if (ranked[0].score === 0) return "technology";
  return ranked[0].id;
}

/** Tags / keywords used to keep news on-domain. */
export function domainNewsMatchers(domain: CareerDomain): {
  includeTags: string[];
  includeKeywords: string[];
} {
  switch (domain) {
    case "healthcare":
      return {
        includeTags: ["Healthcare", "Science"],
        includeKeywords: [
          "health",
          "hospital",
          "medical",
          "pharma",
          "clinical",
          "doctor",
          "nursing",
          "biotech",
          "patient",
        ],
      };
    case "business":
      return {
        includeTags: ["Business", "Finance", "Funding"],
        includeKeywords: [
          "finance",
          "market",
          "bank",
          "economy",
          "startup",
          "funding",
          "accounting",
          "ipo",
          "revenue",
        ],
      };
    case "design":
      return {
        includeTags: ["Design", "UX", "Creative", "Animation", "Media"],
        includeKeywords: [
          "design",
          "motion",
          "graphic",
          "animation",
          "illustrat",
          "creative",
          "ux",
          "ui ",
          "figma",
          "adobe",
          "after effects",
          "portfolio",
          "branding",
          "typography",
          "visual",
        ],
      };
    case "law":
      return {
        includeTags: ["Law"],
        includeKeywords: [
          "law",
          "court",
          "legal",
          "advocate",
          "judiciary",
          "constitution",
          "supreme court",
          "high court",
          "legislation",
        ],
      };
    case "education":
      return {
        includeTags: ["Education", "EdTech"],
        includeKeywords: [
          "education",
          "teacher",
          "school",
          "university",
          "curriculum",
          "student",
          "classroom",
          "edtech",
          "nep",
        ],
      };
    case "science":
      return {
        includeTags: ["Science", "Environment"],
        includeKeywords: [
          "science",
          "research",
          "laboratory",
          "physics",
          "chemistry",
          "climate",
          "environment",
          "scientist",
        ],
      };
    case "engineering":
      return {
        includeTags: ["Engineering"],
        includeKeywords: [
          "mechanical",
          "electrical",
          "civil",
          "manufacturing",
          "engineer",
          "infrastructure",
          "power",
          "automotive",
        ],
      };
    case "other":
      return {
        includeTags: ["Careers", "Hiring", "Internship"],
        includeKeywords: [
          "career",
          "hiring",
          "internship",
          "hospitality",
          "tourism",
          "agriculture",
          "sports",
          "aviation",
        ],
      };
    case "technology":
    default:
      return {
        includeTags: ["Technology", "AI/ML", "Cloud", "Cybersecurity", "Startups"],
        includeKeywords: [
          "software",
          "developer",
          "artificial intelligence",
          "machine learning",
          "startup",
          "cloud",
          "saas",
          "cyber",
        ],
      };
  }
}

export function articleMatchesDomain(
  article: { title?: string; summary?: string; tags?: string[]; source?: string },
  domain: CareerDomain
): boolean {
  const { includeTags, includeKeywords } = domainNewsMatchers(domain);
  const tags = (article.tags || []).map((t) => t.toLowerCase());
  const text = `${article.title || ""} ${article.summary || ""}`.toLowerCase();
  const source = (article.source || "").toLowerCase();

  const trustedDesignSources = [
    "creative bloq",
    "smashing magazine",
    "css-tricks",
    "its nice that",
    "motionographer",
    "awn",
  ];

  if (domain === "design" && trustedDesignSources.some((s) => source.includes(s))) {
    return true;
  }

  const strongTagHit = includeTags.some((t) => tags.includes(t.toLowerCase()));
  const keywordHit = includeKeywords.some((kw) => {
    const escaped = kw.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`(?:^|[^a-z])${escaped}`, "i").test(text);
  });

  const techNoise = tags.some((t) =>
    ["technology", "ai/ml", "cloud", "cybersecurity", "tech industry"].includes(t)
  );

  // Design domain: never keep tech/startup dumps just because a stale "Design" tag exists
  if (domain === "design") {
    if (techNoise) return keywordHit && strongTagHit && tags.includes("creative");
    return (strongTagHit && !tags.includes("startups")) || keywordHit;
  }

  return strongTagHit || keywordHit;
}

/** Union of all interest chips across domains (assessment fallback). */
export function allDomainInterests(): string[] {
  return Array.from(new Set(DOMAIN_LIST.flatMap((d) => d.interests)));
}

export function allDomainSubjects(): string[] {
  return Array.from(new Set(DOMAIN_LIST.flatMap((d) => d.subjects)));
}

export function allSkillSuggestions(): string[] {
  return Array.from(new Set(DOMAIN_LIST.flatMap((d) => d.skillSuggestions)));
}

/** Build keyword list from a free-text niche / career path for news & jobs. */
export function nicheKeywords(niche?: string | null, careerPath?: string | null): string[] {
  const raw = `${niche || ""} ${careerPath || ""}`.toLowerCase();
  const tokens = raw
    .split(/[^a-z0-9+#]+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 4)
    .filter(
      (t) =>
        ![
          "with",
          "from",
          "that",
          "this",
          "have",
          "want",
          "into",
          "career",
          "path",
          "field",
          "other",
          "niche",
        ].includes(t)
    );
  return Array.from(new Set(tokens)).slice(0, 12);
}

export function articleMatchesNiche(
  article: { title?: string; summary?: string; tags?: string[]; source?: string },
  niche?: string | null,
  careerPath?: string | null
): boolean {
  const keys = nicheKeywords(niche, careerPath);
  if (keys.length === 0) {
    return articleMatchesDomain(article, "other");
  }
  const text = `${article.title || ""} ${article.summary || ""} ${(article.tags || []).join(" ")}`.toLowerCase();
  return keys.some((k) => text.includes(k));
}
