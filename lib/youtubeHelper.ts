export interface YouTubeVideoRec {
  title: string;
  channel: string;
  url: string;
  duration?: string;
}

/**
 * Maps a skill topic to 3-4 high-quality, most-viewed YouTube tutorial links.
 * Uses popular search terms that surface the most-viewed tutorials for the skill.
 */
export function getRecommendedYouTubeVideos(
  skillTitle: string,
  existingRecs?: YouTubeVideoRec[]
): YouTubeVideoRec[] {
  // If valid recs already provided (e.g. from LLM), use them
  if (existingRecs && existingRecs.length >= 3) return existingRecs;

  const q = encodeURIComponent(skillTitle);
  const sortPopular = `&sp=CAMSAhAB`; // YouTube sort=Most Popular filter

  const skillLower = skillTitle.toLowerCase();

  // Detect project/portfolio type topics and return project build videos
  const isProjectTopic =
    skillLower.includes("project") ||
    skillLower.includes("portfolio") ||
    skillLower.includes("capstone") ||
    skillLower.includes("build") ||
    skillLower.includes("deploy") ||
    skillLower.includes("interview");

  if (isProjectTopic) {
    return [
      {
        title: `Build a ${skillTitle} – Full Project Tutorial`,
        channel: "Traversy Media",
        url: `https://www.youtube.com/results?search_query=build+${q}+project+tutorial+2024${sortPopular}`,
        duration: "2-4h",
      },
      {
        title: `${skillTitle} – Step by Step Project from Scratch`,
        channel: "Top Tutorial",
        url: `https://www.youtube.com/results?search_query=${q}+from+scratch+full+project${sortPopular}`,
        duration: "3h+",
      },
      {
        title: `${skillTitle} Project for Your Portfolio (Complete Guide)`,
        channel: "freeCodeCamp",
        url: `https://www.youtube.com/results?search_query=${q}+portfolio+project+for+beginners${sortPopular}`,
        duration: "Series",
      },
    ];
  }


  const CURATED: Record<string, YouTubeVideoRec[]> = {
    html: [
      { title: "HTML Full Course – Build a Website Tutorial", channel: "freeCodeCamp", url: "https://www.youtube.com/watch?v=pQN-pnXPaVg", duration: "2h" },
      { title: "HTML Tutorial for Beginners: HTML Crash Course", channel: "Programming with Mosh", url: "https://www.youtube.com/watch?v=qz0aGYrrlhU", duration: "1h" },
      { title: "HTML Complete Course", channel: "Code With Harry", url: "https://www.youtube.com/watch?v=BsDoLVMnmZs", duration: "5h" },
    ],
    css: [
      { title: "CSS Tutorial – Zero to Hero (Full Course)", channel: "freeCodeCamp", url: "https://www.youtube.com/watch?v=1Rs2ND1ryYc", duration: "6h" },
      { title: "CSS Crash Course for Beginners", channel: "Traversy Media", url: "https://www.youtube.com/watch?v=yfoY53QXEnI", duration: "1.5h" },
      { title: "CSS Full Course", channel: "Bro Code", url: "https://www.youtube.com/watch?v=wRNinF7YQqQ", duration: "11h" },
    ],
    javascript: [
      { title: "JavaScript Programming – Full Course", channel: "freeCodeCamp", url: "https://www.youtube.com/watch?v=jS4aFq5-91M", duration: "7h" },
      { title: "JavaScript Crash Course For Beginners", channel: "Traversy Media", url: "https://www.youtube.com/watch?v=hdI2bqOjy3c", duration: "1.5h" },
      { title: "JavaScript Tutorial for Beginners", channel: "Programming with Mosh", url: "https://www.youtube.com/watch?v=W6NZfCO5SIk", duration: "1h" },
    ],
    react: [
      { title: "React Course – Beginner's Tutorial for React JS", channel: "freeCodeCamp", url: "https://www.youtube.com/watch?v=bMknfKXIFA8", duration: "12h" },
      { title: "React JS Full Course for Beginners", channel: "Dave Gray", url: "https://www.youtube.com/watch?v=RVFAyFWO4go", duration: "9h" },
      { title: "React Crash Course for Beginners 2024", channel: "Academind", url: "https://www.youtube.com/watch?v=Dorf8i6lCuk", duration: "5h" },
    ],
    python: [
      { title: "Python Tutorial for Beginners – Full Course", channel: "Programming with Mosh", url: "https://www.youtube.com/watch?v=_uQrJ0TkZlc", duration: "6h" },
      { title: "Python for Everybody – Full Course", channel: "freeCodeCamp", url: "https://www.youtube.com/watch?v=8DvywoWv6fI", duration: "13h" },
      { title: "100 Days of Code – Python Bootcamp", channel: "Angela Yu", url: `https://www.youtube.com/results?search_query=100+days+of+code+python+angela+yu${sortPopular}`, duration: "Full Bootcamp" },
    ],
    git: [
      { title: "Git and GitHub for Beginners – Crash Course", channel: "freeCodeCamp", url: "https://www.youtube.com/watch?v=RGOj5yH7evk", duration: "1h" },
      { title: "Git Tutorial for Beginners: Learn Git in 1 Hour", channel: "Programming with Mosh", url: "https://www.youtube.com/watch?v=8JJ101D3knE", duration: "1h" },
      { title: "Git & GitHub Crash Course 2024", channel: "Traversy Media", url: "https://www.youtube.com/watch?v=SWYqp7iY_Tc", duration: "45m" },
    ],
    nodejs: [
      { title: "Node.js and Express.js – Full Course", channel: "freeCodeCamp", url: "https://www.youtube.com/watch?v=Oe421EPjeBE", duration: "8h" },
      { title: "Node.js Tutorial for Beginners", channel: "Programming with Mosh", url: "https://www.youtube.com/watch?v=TlB_eWDSMt4", duration: "1.5h" },
      { title: "NodeJS Crash Course", channel: "Traversy Media", url: "https://www.youtube.com/watch?v=fBNz5xF-Kx4", duration: "1.5h" },
    ],
    sql: [
      { title: "SQL Tutorial – Full Database Course for Beginners", channel: "freeCodeCamp", url: "https://www.youtube.com/watch?v=HXV3zeQKqGY", duration: "4h" },
      { title: "MySQL Tutorial for Beginners", channel: "Programming with Mosh", url: "https://www.youtube.com/watch?v=7S_tz1z_5bA", duration: "3h" },
      { title: "SQL for Data Analysis – Complete Course", channel: "Alex the Analyst", url: "https://www.youtube.com/watch?v=RSlqWnp-Dk8", duration: "2h" },
    ],
    typescript: [
      { title: "TypeScript Full Course for Beginners", channel: "freeCodeCamp", url: "https://www.youtube.com/watch?v=30LWjhZzg50", duration: "4h" },
      { title: "TypeScript Crash Course", channel: "Traversy Media", url: "https://www.youtube.com/watch?v=BCg4U1FzODs", duration: "1.5h" },
      { title: "TypeScript Tutorial for Beginners", channel: "Fireship", url: "https://www.youtube.com/watch?v=ahCwqrYpIuM", duration: "30m" },
    ],
    nextjs: [
      { title: "Next.js 14 Full Course 2024", channel: "Dave Gray", url: "https://www.youtube.com/watch?v=ZjAqacIC_3c", duration: "5h" },
      { title: "Next.js Crash Course – Full Tutorial", channel: "Traversy Media", url: "https://www.youtube.com/watch?v=mTz0GXj8NN0", duration: "2h" },
      { title: "Next.js Full Tutorial for Beginners", channel: "freeCodeCamp", url: "https://www.youtube.com/watch?v=KjY94sAKLlw", duration: "9h" },
    ],
    "machine learning": [
      { title: "Machine Learning Course for Beginners", channel: "freeCodeCamp", url: "https://www.youtube.com/watch?v=NWONeJKn6kc", duration: "10h" },
      { title: "Machine Learning Crash Course", channel: "Google Developers", url: "https://www.youtube.com/watch?v=KNAWp2S3w94", duration: "3h" },
      { title: "Machine Learning Full Course – Learn ML in 6 Hours", channel: "Edureka", url: `https://www.youtube.com/results?search_query=machine+learning+full+course+edureka${sortPopular}`, duration: "6h" },
    ],
    "data science": [
      { title: "Data Science Full Course 2024", channel: "freeCodeCamp", url: "https://www.youtube.com/watch?v=ua-CiDNNj30", duration: "12h" },
      { title: "Data Science for Beginners – Complete Playlist", channel: "Ken Jee", url: `https://www.youtube.com/results?search_query=data+science+full+course+ken+jee${sortPopular}`, duration: "Series" },
      { title: "Python for Data Science – Crash Course", channel: "Sentdex", url: `https://www.youtube.com/results?search_query=python+for+data+science+sentdex${sortPopular}`, duration: "Series" },
    ],
    "ui/ux": [
      { title: "UI UX Design Tutorial for Beginners", channel: "DesignCourse", url: "https://www.youtube.com/watch?v=c9Wg6Cb_YlU", duration: "3h" },
      { title: "Figma Tutorial for Beginners 2024", channel: "freeCodeCamp", url: "https://www.youtube.com/watch?v=jwCmIBJ8Jtc", duration: "4h" },
      { title: "UX Research Full Crash Course", channel: "Google UX Design", url: `https://www.youtube.com/results?search_query=ux+design+full+course+google${sortPopular}`, duration: "Series" },
    ],
    docker: [
      { title: "Docker Tutorial for Beginners – Full Course", channel: "freeCodeCamp", url: "https://www.youtube.com/watch?v=fqMOX6JJhGo", duration: "2h" },
      { title: "Docker Crash Course for Beginners", channel: "TechWorld with Nana", url: "https://www.youtube.com/watch?v=pg19Z8LL06w", duration: "4h" },
    ],
  };

  // Fuzzy match skill to curated map
  for (const [key, recs] of Object.entries(CURATED)) {
    if (skillLower.includes(key) || key.split(" ").every((w) => skillLower.includes(w))) {
      return recs;
    }
  }

  // Fallback: Generate smart YouTube search URLs for any topic
  const titleEncoded = encodeURIComponent(skillTitle);
  return [
    {
      title: `${skillTitle} Full Course for Beginners (Most Viewed)`,
      channel: "Top YouTube Tutorial",
      url: `https://www.youtube.com/results?search_query=${titleEncoded}+full+course+for+beginners${sortPopular}`,
      duration: "Full Course",
    },
    {
      title: `${skillTitle} Crash Course – Learn Fast`,
      channel: "Top YouTube Tutorial",
      url: `https://www.youtube.com/results?search_query=${titleEncoded}+crash+course+2024${sortPopular}`,
      duration: "1-2h",
    },
    {
      title: `${skillTitle} Tutorial – Zero to Hero`,
      channel: "Top YouTube Tutorial",
      url: `https://www.youtube.com/results?search_query=${titleEncoded}+tutorial+zero+to+hero${sortPopular}`,
      duration: "Series",
    },
  ];
}
