import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import dbConnect from "@/lib/db";
import UserProfile from "@/models/UserProfile";
import CareerRecommendation from "@/models/CareerRecommendation";
import Roadmap from "@/models/Roadmap";
import Course from "@/models/Course";
import Document from "@/models/Document";
import ChatHistory from "@/models/ChatHistory";
import UserProgress from "@/models/UserProgress";
import Todo from "@/models/Todo";
import News from "@/models/News";

export async function GET(req: Request) {
  const response = await handleSeed();
  if (response.status === 200) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }
  return response;
}

export async function POST() {
  return handleSeed();
}

async function handleSeed() {
  try {
    const session = await auth();
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ message: "Unauthorized. Please log in first." }, { status: 401 });
    }

    const userId = session.user.id;
    await dbConnect();

    // 1. Clear existing seed data for this specific user
    await UserProfile.deleteMany({ userId });
    await CareerRecommendation.deleteMany({ userId });
    await Roadmap.deleteMany({ userId });
    await Document.deleteMany({ userId });
    await ChatHistory.deleteMany({ userId });
    await UserProgress.deleteMany({ userId });
    await Todo.deleteMany({ userId });
    
    // Clear and rebuild public Tech News
    await News.deleteMany({});

    // 2. Create User Profile
    const profile = new UserProfile({
      userId,
      interests: ["Coding", "Web UI", "Design Systems"],
      goals: "Become a Full-Stack Web Developer and build highly interactive client interfaces.",
      subjects: ["Web Technology", "Database Systems"],
      skills: [
        { name: "JavaScript", level: "intermediate" },
        { name: "CSS/HTML", level: "intermediate" },
        { name: "Databases", level: "beginner" },
      ],
      currentCourse: "B.Tech in Computer Science & Engineering",
      activeCurriculum: [
        {
          title: "Advanced AI Systems Architecture",
          platform: "Stanford Online",
          progress: 68,
          estCompletion: "Q3 2026"
        },
        {
          title: "Executive Leadership in Tech",
          platform: "Wharton Executive Ed",
          progress: 32,
          estCompletion: "Q4 2026"
        }
      ],
      futureGoals: {
        shortTerm: [
          "Transition to VP of Engineering role",
          "Complete ML Operations Certification"
        ],
        longTerm: [
          "Chief Technology Officer (CTO) position",
          "Found specialized AI logistics startup"
        ]
      },
      assessedAt: new Date(),
    });
    await profile.save();

    // 3. Create Career Recommendation
    const careerPath = "Full-Stack Web Developer";
    const recommendation = new CareerRecommendation({
      userId,
      careerPath,
      matchScore: 94,
      reasoning: "Based on your interest in interactive web interfaces, design systems, and database management, a Full-Stack Web Developer path fits you perfectly. Your solid foundation in JavaScript and Web Tech subjects matches the core requirements of modern front-end frameworks (like React/Next.js) and API architecture.",
      selected: true,
    });
    await recommendation.save();

    // 4. Create Roadmap
    const roadmap = new Roadmap({
      userId,
      careerPath,
      currentStage: "intermediate",
      stages: [
        {
          name: "beginner",
          milestones: [
            { title: "Master HTML & CSS foundations, including layout grids", completed: true, completedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) },
            { title: "Learn Git/GitHub workflows, branches, and collaboration", completed: true, completedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000) },
            { title: "Understand Javascript DOM manipulation and event loops", completed: true, completedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) },
          ],
        },
        {
          name: "intermediate",
          milestones: [
            { title: "Build single-page apps using React component states", completed: true, completedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) },
            { title: "Design clean document schemas using Mongoose & MongoDB", completed: false },
            { title: "Secure backend routes with token authentication (NextAuth)", completed: false },
          ],
        },
        {
          name: "advanced",
          milestones: [
            { title: "Optimize server components and asset compression in Next.js", completed: false },
            { title: "Deploy apps to Vercel and set up CD/CI pipelines", completed: false },
          ],
        },
      ],
    });
    await roadmap.save();

    // 5. Create Courses
    await Course.deleteMany({ careerPath });
    const mockCourses = [
      {
        title: "HTML & CSS for Beginners",
        platform: "Scrimba",
        url: "https://scrimba.com/learn/htmlandcss",
        careerPath,
        skillLevel: "beginner",
        isFree: true,
        rating: 4.8,
      },
      {
        title: "Modern JavaScript (ES6+)",
        platform: "Udemy",
        url: "https://www.udemy.com/course/modern-javascript-from-the-beginning/",
        careerPath,
        skillLevel: "beginner",
        isFree: false,
        rating: 4.7,
      },
      {
        title: "React Fundamentals Tutorial",
        platform: "YouTube (freeCodeCamp)",
        url: "https://www.youtube.com/watch?v=bMknfKXIFA8",
        careerPath,
        skillLevel: "intermediate",
        isFree: true,
        rating: 4.9,
      },
      {
        title: "Complete Next.js Web Developer",
        platform: "ZTM Academy",
        url: "https://zerotomastery.io/courses/learn-next-js/",
        careerPath,
        skillLevel: "advanced",
        isFree: false,
        rating: 4.8,
      },
    ];
    await Course.insertMany(mockCourses);

    // 6. Create Analyzed PDF Document
    const document = new Document({
      userId,
      filename: "Web_Dev_Syllabus.pdf",
      fileUrl: "/uploads/Web_Dev_Syllabus.pdf",
      summary: "### Course Overview\nThis syllabus outlines the foundational components of modern Full-Stack Web Development, focusing on React, Next.js, Node.js, and MongoDB database integration.\n\n### Key Learning Outcomes\n- Understand Client-Server architecture and RESTful APIs.\n- Learn state management and React hook lifecycles.\n- Integrate server-side rendering (SSR) and routing configurations.\n\n### Grading Policies\n- 40% Practical assignments and mini-projects.\n- 60% Final term project and evaluation.",
      questions: [
        {
          question: "What server-side technologies are introduced in the syllabus outcomes?",
          options: ["React & Next.js", "Java & Spring Boot", "Django & Python", "Laravel & PHP"],
          answer: "React & Next.js",
          type: "mcq",
        },
        {
          question: "What percentage of the final evaluation grade is decided by practical assignments?",
          options: ["20%", "30%", "40%", "60%"],
          answer: "40%",
          type: "mcq",
        },
        {
          question: "Explain the difference between Client-Side Rendering (CSR) and Server-Side Rendering (SSR) in Next.js.",
          answer: "Client-Side Rendering (CSR) downloads a minimal HTML shell and rendering happens in the user's browser via JavaScript. Server-Side Rendering (SSR) generates the full HTML page on the server for each request, delivering faster initial loads and better SEO.",
          type: "flashcard",
        },
      ],
    });
    await document.save();

    // 7. Create Chat History
    const chat = new ChatHistory({
      userId,
      messages: [
        {
          role: "user",
          content: "Hi! Can you explain how React state works under the hood?",
          sentAt: new Date(Date.now() - 30 * 60 * 1000),
        },
        {
          role: "assistant",
          content: "Hello! Of course! In React, **State** is local component memory that persists across renders. When you trigger a state update via `setState`:\n\n1. React schedules a re-render of the component.\n2. In the next render pass, React compares the virtual DOM tree using its diffing algorithm.\n3. It updates only the specific changed nodes in the actual DOM.\n\nThink of it as a variable that React watches closely—whenever it changes, React automatically updates the screen for you!",
          sentAt: new Date(Date.now() - 29 * 60 * 1000),
        },
        {
          role: "user",
          content: "Thanks, that makes sense. What is a hook?",
          sentAt: new Date(Date.now() - 15 * 60 * 1000),
        },
        {
          role: "assistant",
          content: "Great! A **Hook** is a special JavaScript function that lets you 'hook into' React features like state and lifecycle methods. \n\nBefore hooks (React 16.8), you could only use state inside Class components. With hooks like `useState` and `useEffect`, you can write fully stateful Functional components, making your code cleaner and easier to share!",
          sentAt: new Date(Date.now() - 14 * 60 * 1000),
        },
      ],
    });
    await chat.save();

    // 8. Create User Progress metrics
    const progress = new UserProgress({
      userId,
      coursesCompleted: 2,
      pdfsAnalyzed: 1,
      tutorSessions: 2,
      streakDays: 5,
      lastActive: new Date(),
    });
    await progress.save();

    // 9. Seed default daily todos
    const defaultTodos = [
      { userId, text: "Review Q3 Architecture Doc", completed: true, createdAt: new Date(Date.now() - 50000) },
      { userId, text: "Team sync preparation", completed: true, createdAt: new Date(Date.now() - 40000) },
      { userId, text: "Deep Work: Algorithm Refactoring", completed: false, createdAt: new Date(Date.now() - 30000) },
      { userId, text: "Respond to executive briefs", completed: false, createdAt: new Date(Date.now() - 20000) },
      { userId, text: "Weekly retrospective", completed: false, createdAt: new Date(Date.now() - 10000) }
    ];
    await Todo.insertMany(defaultTodos);

    // 10. Seed high-signal Tech News (or let live fetch handle it)
    // Drop the News collection cleanly to avoid unique index conflicts
    try {
      await News.collection.drop();
    } catch {
      // Collection might not exist yet — that's fine
    }

    const techNewsData = [
      {
        title: "The Engineering Management Exodus: Why Top Talent is Leaving GCCs for Indian Startups",
        summary: "Global Capability Centers (GCCs) in India are facing a unique attrition challenge. Senior engineering leaders are increasingly migrating towards hyper-growth domestic startups offering superior equity upside and faster decision-making autonomy.",
        content: "Global Capability Centers (GCCs) in India are facing a unique attrition challenge. Senior engineering leaders are increasingly migrating towards hyper-growth domestic startups offering superior equity upside and faster decision-making autonomy. We analyze the compensation data and career trajectories driving this structural shift.",
        readTime: "5 Min Read",
        tags: ["Leadership", "Hiring", "India"],
        category: "Featured",
        sourceUrl: "https://inc42.com",
        source: "Inc42",
        fetchedAt: new Date(),
        imageUrl: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=800&q=80",
        imageAlt: "Stark skyscraper architectural shot",
        publishedAt: new Date()
      },
      {
        title: "India's New AI Regulation Framework: Implications for Startup Founders",
        summary: "A deep dive into the draft policy requiring algorithmic transparency and its potential impact on series A funding cycles.",
        content: "A deep dive into the draft policy requiring algorithmic transparency and its potential impact on series A funding cycles.",
        readTime: "3 Min Read",
        tags: ["Policy", "India", "AI/ML"],
        category: "Live Feed",
        sourceUrl: "https://yourstory.com",
        source: "YourStory",
        fetchedAt: new Date(),
        publishedAt: new Date(Date.now() - 3600000)
      },
      {
        title: "Peak XV Allocates $250M for DeepTech SaaS in Bangalore",
        summary: "The fund aims to capture value in infrastructure layer startups, shifting focus away from consumer tech.",
        content: "The fund aims to capture value in infrastructure layer startups, shifting focus away from consumer tech.",
        readTime: "4 Min Read",
        tags: ["Funding", "Startups", "India"],
        category: "Live Feed",
        sourceUrl: "https://economictimes.indiatimes.com",
        source: "ET Tech",
        fetchedAt: new Date(),
        publishedAt: new Date(Date.now() - 7200000)
      },
      {
        title: "Top Tech Internship Programs Opening in India: Summer 2026 Roundup",
        summary: "Major companies including Google, Microsoft, Amazon, and Flipkart have opened their summer 2026 internship applications. Here's what you need to know about eligibility, stipends, and deadlines.",
        content: "Major companies including Google, Microsoft, Amazon, and Flipkart have opened their summer 2026 internship applications.",
        readTime: "3 Min Read",
        tags: ["Internship", "Hiring", "India"],
        category: "Live Feed",
        sourceUrl: "https://inc42.com",
        source: "Inc42",
        fetchedAt: new Date(),
        publishedAt: new Date(Date.now() - 86400000)
      },
      {
        title: "Q3 Compensation Benchmark: VP Engineering Salaries in India",
        summary: "Exclusive data on cash vs. equity splits for series B/C startups in major Indian metros.",
        content: "Exclusive data on cash vs. equity splits for series B/C startups in major Indian metros.",
        readTime: "8 Min Read",
        tags: ["Hiring", "India", "Tech Industry"],
        category: "In-Depth Analysis",
        sourceUrl: "https://economictimes.indiatimes.com",
        source: "ET Tech",
        fetchedAt: new Date(),
        imageUrl: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=800&q=80",
        imageAlt: "Data chart visualization",
        publishedAt: new Date(Date.now() - 172800000)
      },
      {
        title: "Transitioning from Enterprise to Hyper-growth: FAANG Directors Share Insights",
        summary: "Candid insights from three former FAANG directors who successfully integrated into Indian unicorn cultures.",
        content: "Candid insights from three former FAANG directors who successfully integrated into Indian unicorn cultures.",
        readTime: "10 Min Read",
        tags: ["Hiring", "Leadership", "India"],
        category: "In-Depth Analysis",
        sourceUrl: "https://yourstory.com",
        source: "YourStory",
        fetchedAt: new Date(),
        imageUrl: "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=800&q=80",
        imageAlt: "Corporate boardroom",
        publishedAt: new Date(Date.now() - 259200000)
      },
      {
        title: "The Architecture Overhaul: Post-Funding Tech Priorities",
        summary: "When technical debt becomes strategic debt. A guide for incoming CTOs managing legacy system modernization.",
        content: "When technical debt becomes strategic debt. A guide for incoming CTOs managing legacy system modernization.",
        readTime: "6 Min Read",
        tags: ["Tech Industry", "AI/ML", "Startups"],
        category: "In-Depth Analysis",
        sourceUrl: "https://techcrunch.com",
        source: "TechCrunch",
        fetchedAt: new Date(),
        imageUrl: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=800&q=80",
        imageAlt: "Server room networking wires",
        publishedAt: new Date(Date.now() - 345600000)
      }
    ];
    await News.insertMany(techNewsData);

    return NextResponse.json({
      message: "Database seeded successfully for demo!",
      details: {
        profileCreated: true,
        careerPathSeeded: careerPath,
        milestonesTotal: 8,
        milestonesCompleted: 4,
        coursesSeededCount: mockCourses.length,
        analyzedPdfsCount: 1,
        chatMessagesCount: 4,
        habitStreakDays: 5,
        todosSeededCount: defaultTodos.length,
        newsSeededCount: techNewsData.length
      },
    });
  } catch (error: any) {
    console.error("Database seed error:", error);
    return NextResponse.json(
      { message: "Seeding failed.", error: error.message },
      { status: 500 }
    );
  }
}

