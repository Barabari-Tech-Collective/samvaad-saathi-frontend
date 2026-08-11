import { InterviewItem } from "./app/(protected)/history/_components/types";
import { ReportResponse } from "./app/(protected)/report-summary/_components/types";

export const HARDCODED_INTERVIEWS: InterviewItem[] = [
  {
    interviewId: 9991,
    track: "Full Stack Developer",
    difficulty: "HARD",
    status: "completed",
    createdAt: new Date().toISOString(),
    knowledgePercentage: 56,
    speechFluencyPercentage: 55,
    resumeUsed: false,
    attemptsCount: 1,
  },
  {
    interviewId: 9992,
    track: "HR Communication",
    difficulty: "HARD",
    status: "completed",
    createdAt: new Date().toISOString(),
    knowledgePercentage: 71,
    speechFluencyPercentage: 70,
    resumeUsed: false,
    attemptsCount: 1,
  },
  {
    interviewId: 9993,
    track: "Node JS",
    difficulty: "HARD",
    status: "completed",
    createdAt: new Date().toISOString(),
    knowledgePercentage: 56,
    speechFluencyPercentage: 54,
    resumeUsed: false,
    attemptsCount: 1,
  },
];

export const HARDCODED_REPORTS: Record<number, ReportResponse> = {
  9991: {
    reportId: "9991",
    candidateInfo: {
      name: "User",
      interviewDate: new Date().toISOString(),
      roleTopic: "Full Stack Developer",
      duration: "55 mins",
      durationFeedback: "You effectively managed your time across all 7 complex questions, leaving room for deep-dive follow-ups.",
    },
    scoreSummary: {
      knowledgeCompetence: {
        score: 56,
        maxScore: 100,
        average: 5.6,
        maxAverage: 10,
        percentage: 56,
        criteria: { accuracy: 6, depth: 5, relevance: 6, examples: 5, terminology: 6 },
      },
      speechAndStructure: {
        score: 55,
        maxScore: 100,
        average: 5.5,
        maxAverage: 10,
        percentage: 55,
        criteria: { fluency: 6, structure: 5, pacing: 6, grammar: 5 },
      },
    },
    questionAnalysis: [
      {
        id: 1,
        totalQuestions: 7,
        type: "Technical question",
        question: "How would you design a scalable microservices architecture for an e-commerce application handling millions of concurrent users during a flash sale?",
        feedback: { 
          strengths: "You correctly identified the need for load balancing and message queues (like Kafka or RabbitMQ) to handle burst traffic asynchronously. Your choice of a NoSQL database for the shopping cart was appropriate for high-write scenarios.", 
          areasOfImprovement: "You struggled to explain how you would handle distributed transactions and maintain data consistency across the inventory and payment microservices. Consider researching the Saga pattern or two-phase commits." 
        },
      },
      {
        id: 2,
        totalQuestions: 7,
        type: "Technical question",
        question: "Explain the reconciliation process in React. How would you optimize a highly dynamic data table component rendering thousands of rows?",
        feedback: { 
          strengths: "You provided a solid high-level overview of the Virtual DOM and React's diffing algorithm. You also correctly suggested using `React.memo` to prevent unnecessary re-renders.", 
          areasOfImprovement: "For a table with thousands of rows, `React.memo` is insufficient. You should have discussed DOM virtualization (e.g., using `react-window` or `react-virtualized`) to only render the visible DOM nodes. You also missed mentioning `useCallback` for optimizing prop references." 
        },
      },
      {
        id: 3,
        totalQuestions: 7,
        type: "Technical question",
        question: "When would you choose to denormalize a relational database, and what are the specific trade-offs involved in maintaining data consistency?",
        feedback: { 
          strengths: "You understood the basic premise of denormalization: trading write performance and storage space for faster read queries by avoiding complex JOIN operations.", 
          areasOfImprovement: "Your answer lacked depth on the operational challenges. You need to explain how you would actually maintain consistency (e.g., using materialized views, trigger functions, or application-level cron jobs) when the duplicated data changes." 
        },
      },
      {
        id: 4,
        totalQuestions: 7,
        type: "Technical question",
        question: "Describe how you would implement robust authentication and authorization mechanisms across a fleet of stateless microservices.",
        feedback: { 
          strengths: "You correctly proposed using JWT (JSON Web Tokens) for stateless authentication and passing the token via the Authorization header.", 
          areasOfImprovement: "You did not address token revocation or security vulnerabilities like XSS and CSRF. A senior Full Stack Developer should discuss short-lived access tokens paired with HttpOnly refresh tokens, and an API Gateway to handle token validation before routing to microservices." 
        },
      },
      {
        id: 5,
        totalQuestions: 7,
        type: "Technical Allied question",
        question: "Walk me through your ideal CI/CD pipeline for a containerized full-stack application with zero-downtime deployments.",
        feedback: { 
          strengths: "You laid out a logical progression: linting, unit testing, Docker image building, and pushing to a registry like ECR or DockerHub.", 
          areasOfImprovement: "You missed the 'zero-downtime' requirement of the prompt. You should have explicitly detailed deployment strategies like Blue-Green deployments, Canary releases, or Kubernetes rolling updates to ensure availability during the rollout." 
        },
      },
      {
        id: 6,
        totalQuestions: 7,
        type: "Technical Allied question",
        question: "How do you approach cloud infrastructure cost optimization when scaling a full-stack application across multiple regions?",
        feedback: { 
          strengths: "You mentioned utilizing auto-scaling groups to spin down resources during off-peak hours, which is a fundamental cost-saving practice.", 
          areasOfImprovement: "A senior developer should discuss advanced strategies like reserved instances, spot instances for background processing, and implementing CDN caching to reduce egress bandwidth costs from the primary database." 
        },
      },
      {
        id: 7,
        totalQuestions: 7,
        type: "Behavioral question",
        question: "Based on your earlier answer about microservices, can you elaborate on a time your architecture failed in production under heavy load, and exactly how you diagnosed and resolved the bottleneck?",
        feedback: { 
          strengths: "You effectively described a scenario where a database connection pool was exhausted, showing real-world experience.", 
          areasOfImprovement: "Your resolution relied on simply increasing the pool size. You should have discussed analyzing slow queries using APM tools (like Datadog or New Relic) and implementing read replicas or a Redis caching layer to permanently solve the root cause." 
        },
      }
    ],
    recommendedPractice: {
      title: "Advanced System Design & Distributed Systems",
      description: "Focus heavily on distributed data management (Saga pattern, eventual consistency) and frontend virtualization techniques. Your core web development knowledge is solid, but you need to demonstrate how to handle extreme scale.",
    },
    speechFluencyFeedback: {
      strengths: "You maintain a professional tone and utilize correct technical terminology when discussing web development concepts.",
      areasOfImprovement: "Under pressure on complex architectural questions, your pacing becomes erratic and you rely heavily on filler words ('um', 'like', 'basically'). Take a deep breath and pause silently to structure your thoughts.",
      ratingEmoji: "🤔",
      ratingTitle: "Average Fluency",
      ratingDescription: "Your communication is generally clear but lacks the polished, structured delivery expected of a senior technical leader. Practice structuring your answers using the STAR method.",
    },
    nextSteps: [
      { title: "Study the Saga pattern for distributed transactions." },
      { title: "Implement a virtualized scrolling list in a sample React project." },
      { title: "Practice mock system design interviews with a focus on edge cases." }
    ],
    finalTip: {
      title: "Structure Before You Speak",
      description: "When asked a complex architecture question, take 10 seconds to outline your answer before speaking. A structured response demonstrates seniority.",
    },
  },
  9992: {
    reportId: "9992",
    candidateInfo: {
      name: "User",
      interviewDate: new Date().toISOString(),
      roleTopic: "HR Communication",
      duration: "40 mins",
      durationFeedback: "Excellent pacing. You allocated appropriate time to address the nuances of each behavioral and strategic scenario.",
    },
    scoreSummary: {
      knowledgeCompetence: {
        score: 71,
        maxScore: 100,
        average: 7.1,
        maxAverage: 10,
        percentage: 71,
        criteria: { accuracy: 7, depth: 7, relevance: 7, examples: 7, terminology: 7 },
      },
      speechAndStructure: {
        score: 70,
        maxScore: 100,
        average: 7.0,
        maxAverage: 10,
        percentage: 70,
        criteria: { fluency: 7, structure: 7, pacing: 7, grammar: 7 },
      },
    },
    questionAnalysis: [
      {
        id: 1,
        totalQuestions: 5,
        type: "Self question",
        question: "What is one misconception people have about you that you would like to correct? (Focus on non-technical behavioral and situational interview prompts.)",
        feedback: { 
          strengths: "You approached this vulnerable question with great self-awareness. Acknowledging a common misconception and explaining how you actively work to clarify your intent shows high emotional intelligence.", 
          areasOfImprovement: "You could strengthen your answer by providing a specific, recent example where this misconception almost caused an issue, and how you proactively addressed it before it escalated." 
        },
      },
      {
        id: 2,
        totalQuestions: 5,
        type: "Behavioral question",
        question: "Describe a disagreement in a team and how you helped move things forward.",
        feedback: { 
          strengths: "Excellent use of the STAR method. You clearly outlined the disagreement, your specific role in facilitating the discussion, and the positive resolution that kept the project on track.", 
          areasOfImprovement: "While your mediation skills are evident, ensure you also highlight what you learned from the experience to prevent similar disagreements from occurring in the future." 
        },
      },
      {
        id: 3,
        totalQuestions: 5,
        type: "Productivity question",
        question: "How do you evaluate whether your process is improving over time?",
        feedback: { 
          strengths: "You provided a strong, metrics-driven approach. Mentioning specific KPIs and regular retrospectives demonstrates that you value continuous improvement and tangible results.", 
          areasOfImprovement: "Consider discussing how you balance quantitative metrics with qualitative feedback from your team to ensure process changes aren't negatively impacting morale or creativity." 
        },
      },
      {
        id: 4,
        totalQuestions: 5,
        type: "Company and Candidate question",
        question: "What would make this role meaningful for you over the next year?",
        feedback: { 
          strengths: "You effectively tied your personal career goals to the company's stated mission. This alignment shows you've done your research and are looking for a mutually beneficial long-term fit.", 
          areasOfImprovement: "You focused heavily on what you will gain from the role. Ensure you balance this by emphasizing what specific, unique value you plan to bring to the company during that same year." 
        },
      },
      {
        id: 5,
        totalQuestions: 5,
        type: "General question",
        question: "If you could improve one public service in your city, what would it be?",
        feedback: { 
          strengths: "This was a great curveball response. You thought critically about a systemic issue and proposed a logical, step-by-step framework for improvement, demonstrating strong problem-solving skills.", 
          areasOfImprovement: "While your theoretical framework was sound, you could elevate your answer by connecting your proposed solution back to the core competencies required for this specific role." 
        },
      }
    ],
    recommendedPractice: {
      title: "Executive Coaching & Metrics-Driven HR",
      description: "You have fantastic empathy and conflict resolution skills. To reach the next level, focus on how you coach business leaders and tie your HR initiatives directly to measurable business metrics (retention rate, eNPS).",
    },
    speechFluencyFeedback: {
      strengths: "Your pacing is excellent. You speak with a calm, reassuring tone that is essential for a senior Human Resources leader managing sensitive topics.",
      areasOfImprovement: "Occasionally, your sentences run a bit long. Practice pausing for effect to let critical points (like legal compliance constraints) resonate.",
      ratingEmoji: "🙂",
      ratingTitle: "Good Fluency",
      ratingDescription: "You communicated your ideas clearly, demonstrating high emotional intelligence and professional polish. Your tone perfectly matches the requirements of the role.",
    },
    nextSteps: [
      { title: "Review case studies on organizational change management." },
      { title: "Practice framing HR strategies in terms of ROI and business impact." },
      { title: "Familiarize yourself with employment law compliance requirements for executive investigations." }
    ],
    finalTip: {
      title: "Lead with the Business Impact",
      description: "When answering HR strategy questions, always tie your human-centric solutions back to the bottom line (e.g., reducing turnover costs, improving time-to-market).",
    },
  },
  9993: {
    reportId: "9993",
    candidateInfo: {
      name: "User",
      interviewDate: new Date().toISOString(),
      roleTopic: "Node JS",
      duration: "55 mins",
      durationFeedback: "Good time management. You answered all 7 technical questions, though you spent slightly too long on basic concepts.",
    },
    scoreSummary: {
      knowledgeCompetence: {
        score: 56,
        maxScore: 100,
        average: 5.6,
        maxAverage: 10,
        percentage: 56,
        criteria: { accuracy: 6, depth: 5, relevance: 6, examples: 5, terminology: 6 },
      },
      speechAndStructure: {
        score: 54,
        maxScore: 100,
        average: 5.4,
        maxAverage: 10,
        percentage: 54,
        criteria: { fluency: 5, structure: 6, pacing: 5, grammar: 6 },
      },
    },
    questionAnalysis: [
      {
        id: 1,
        totalQuestions: 7,
        type: "Technical question",
        question: "Deep dive into the Node.js Event Loop. How do the microtask and macrotask queues interact, and how can heavy CPU-bound tasks block the event loop? How would you solve this?",
        feedback: { 
          strengths: "You understood that Node.js is single-threaded and uses libuv to handle asynchronous non-blocking I/O operations.", 
          areasOfImprovement: "You failed to explain the order of execution between `process.nextTick`, Promises (microtasks), and `setTimeout` (macrotasks). To solve the CPU-blocking issue, you should have detailed the use of `worker_threads` for CPU-intensive tasks." 
        },
      },
      {
        id: 2,
        totalQuestions: 7,
        type: "Technical question",
        question: "Explain memory management and Garbage Collection in V8. How do you identify, trace, and resolve a memory leak in a production Node.js application?",
        feedback: { 
          strengths: "You correctly identified that V8 handles memory allocation and mentioned closures as a common source of memory leaks.", 
          areasOfImprovement: "Your troubleshooting approach was superficial. A senior developer must mention taking heap snapshots using tools like `node --inspect` or Chrome DevTools, comparing snapshots to find retained memory, and analyzing the dominator tree." 
        },
      },
      {
        id: 3,
        totalQuestions: 7,
        type: "Technical question",
        question: "How would you implement a distributed caching strategy using Redis for a Node.js API that serves highly volatile real-time data to thousands of websockets?",
        feedback: { 
          strengths: "You correctly proposed using Redis Pub/Sub to broadcast updates across multiple Node.js instances, which is essential for horizontal scaling with WebSockets.", 
          areasOfImprovement: "You didn't address the cache invalidation strategy for 'highly volatile' data. You should have discussed Cache-Aside vs Write-Through patterns, and how to handle the 'Thundering Herd' problem when the cache expires." 
        },
      },
      {
        id: 4,
        totalQuestions: 7,
        type: "Technical question",
        question: "Discuss the architectural differences and performance implications of using Worker Threads vs Child Processes in Node.js for parallel execution.",
        feedback: { 
          strengths: "You knew that Child Processes spin up entirely new Node instances, while Worker Threads run within the same process.", 
          areasOfImprovement: "You missed the critical distinction: memory sharing. Worker Threads can share memory via `SharedArrayBuffer`, making them significantly faster and lighter for CPU-bound tasks than IPC (Inter-Process Communication) messaging used by Child Processes." 
        },
      },
      {
        id: 5,
        totalQuestions: 7,
        type: "Technical Allied question",
        question: "How do you securely handle and process streaming uploads of massive files (e.g., 50GB video files) in a Node.js server without exhausting RAM?",
        feedback: { 
          strengths: "You correctly identified that loading the file into memory buffer is a fatal error, and that Node.js Streams are required.", 
          areasOfImprovement: "You need to explain exactly how to pipe a `ReadableStream` (from the HTTP request) directly into a `WritableStream` (like AWS S3 or a local file) using `.pipe()` or `pipeline()`. You also forgot to mention handling backpressure." 
        },
      },
      {
        id: 6,
        totalQuestions: 7,
        type: "Technical Allied question",
        question: "Explain the process and use-cases for writing native C++ addons for Node.js using Node-API (N-API).",
        feedback: { 
          strengths: "You understood that native addons are used for extreme performance optimization and interacting with low-level C++ libraries.", 
          areasOfImprovement: "You were unfamiliar with the transition from V8-specific native code to the ABI-stable Node-API (N-API). You should research how N-API prevents addons from breaking across different Node.js version updates." 
        },
      },
      {
        id: 7,
        totalQuestions: 7,
        type: "Behavioral question",
        question: "In your previous explanation of the Event Loop, you mentioned non-blocking I/O. How exactly would you handle a situation where a legacy third-party library relies entirely on synchronous blocking I/O methods?",
        feedback: { 
          strengths: "You accurately identified that running synchronous code on the main thread would crash the throughput of the server.", 
          areasOfImprovement: "Your solution of 'rewriting the library' isn't always feasible. The expected senior-level answer is to offload the synchronous library calls to a dedicated `worker_thread` pool so the main Event Loop remains free to handle incoming HTTP requests." 
        },
      }
    ],
    recommendedPractice: {
      title: "Advanced V8 Engine and Performance Tuning",
      description: "Your knowledge of building APIs is good, but you need to dive deeper into the internals of Node.js. Focus on memory profiling, stream manipulation, and the exact phases of the libuv Event Loop.",
    },
    speechFluencyFeedback: {
      strengths: "You are enthusiastic and provide straightforward answers when you know the topic well.",
      areasOfImprovement: "When unsure, your speech becomes fragmented and you tend to backtrack frequently. It's better to admit a gap in knowledge clearly than to talk in circles.",
      ratingEmoji: "🤔",
      ratingTitle: "Average Fluency",
      ratingDescription: "Your technical explanations are somewhat hard to follow due to poor structuring. Work on explaining complex topics linearly, starting with the high-level concept before diving into the code-level details.",
    },
    nextSteps: [
      { title: "Read the official Node.js documentation on the Event Loop phases." },
      { title: "Practice capturing and analyzing a Heap Snapshot to find a memory leak." },
      { title: "Build a small project that processes a 10GB CSV file using Streams and `pipeline()`." }
    ],
    finalTip: {
      title: "Master the Node.js Internals",
      description: "Senior Node.js roles require a deep understanding of V8 and libuv. Don't just know how to write Express routes; understand exactly how Node executes your JavaScript.",
    },
  },
};
