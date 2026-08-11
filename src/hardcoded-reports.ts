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
      duration: "45 mins",
      durationFeedback: "You effectively managed your time across all 5 complex technical questions, leaving room for deep-dive follow-ups.",
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
        totalQuestions: 5,
        type: "System Design",
        question: "How would you design a scalable microservices architecture for an e-commerce application handling millions of concurrent users during a flash sale?",
        feedback: { 
          strengths: "You correctly identified the need for load balancing and message queues (like Kafka or RabbitMQ) to handle burst traffic asynchronously. Your choice of a NoSQL database for the shopping cart was appropriate for high-write scenarios.", 
          areasOfImprovement: "You struggled to explain how you would handle distributed transactions and maintain data consistency across the inventory and payment microservices. Consider researching the Saga pattern or two-phase commits." 
        },
      },
      {
        id: 2,
        totalQuestions: 5,
        type: "Frontend Architecture",
        question: "Explain the reconciliation process in React. How would you optimize a highly dynamic data table component rendering thousands of rows?",
        feedback: { 
          strengths: "You provided a solid high-level overview of the Virtual DOM and React's diffing algorithm. You also correctly suggested using `React.memo` to prevent unnecessary re-renders.", 
          areasOfImprovement: "For a table with thousands of rows, `React.memo` is insufficient. You should have discussed DOM virtualization (e.g., using `react-window` or `react-virtualized`) to only render the visible DOM nodes. You also missed mentioning `useCallback` for optimizing prop references." 
        },
      },
      {
        id: 3,
        totalQuestions: 5,
        type: "Database Engineering",
        question: "When would you choose to denormalize a relational database, and what are the specific trade-offs involved in maintaining data consistency?",
        feedback: { 
          strengths: "You understood the basic premise of denormalization: trading write performance and storage space for faster read queries by avoiding complex JOIN operations.", 
          areasOfImprovement: "Your answer lacked depth on the operational challenges. You need to explain how you would actually maintain consistency (e.g., using materialized views, trigger functions, or application-level cron jobs) when the duplicated data changes." 
        },
      },
      {
        id: 4,
        totalQuestions: 5,
        type: "Security",
        question: "Describe how you would implement robust authentication and authorization mechanisms across a fleet of stateless microservices.",
        feedback: { 
          strengths: "You correctly proposed using JWT (JSON Web Tokens) for stateless authentication and passing the token via the Authorization header.", 
          areasOfImprovement: "You did not address token revocation or security vulnerabilities like XSS and CSRF. A senior Full Stack Developer should discuss short-lived access tokens paired with HttpOnly refresh tokens, and an API Gateway to handle token validation before routing to microservices." 
        },
      },
      {
        id: 5,
        totalQuestions: 5,
        type: "DevOps",
        question: "Walk me through your ideal CI/CD pipeline for a containerized full-stack application with zero-downtime deployments.",
        feedback: { 
          strengths: "You laid out a logical progression: linting, unit testing, Docker image building, and pushing to a registry like ECR or DockerHub.", 
          areasOfImprovement: "You missed the 'zero-downtime' requirement of the prompt. You should have explicitly detailed deployment strategies like Blue-Green deployments, Canary releases, or Kubernetes rolling updates to ensure availability during the rollout." 
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
        type: "Conflict Resolution",
        question: "How do you mediate a severe conflict between a high-performing engineering manager and a senior developer that is impacting the productivity of the entire team?",
        feedback: { 
          strengths: "Excellent approach. You emphasized active listening, separating the individuals in initial meetings, and focusing on the root cause (often a breakdown in expectations or resources) rather than assigning blame.", 
          areasOfImprovement: "While your empathy is strong, you should also outline the tangible business outcomes you would aim for. Mention establishing a formal remediation plan with clear milestones to monitor the working relationship post-mediation." 
        },
      },
      {
        id: 2,
        totalQuestions: 5,
        type: "Strategic Communication",
        question: "Describe a strategy you would implement to communicate a highly unpopular company-wide policy change, such as a strict return-to-office mandate.",
        feedback: { 
          strengths: "You correctly highlighted the importance of transparency, avoiding corporate jargon, and equipping middle managers with FAQs to handle the immediate fallout.", 
          areasOfImprovement: "You missed an opportunity to discuss setting up structured feedback loops (like anonymous surveys or town halls). Communication is two-way; you must explicitly state how you will measure employee sentiment after the announcement." 
        },
      },
      {
        id: 3,
        totalQuestions: 5,
        type: "Employee Relations & Compliance",
        question: "Walk me through how you would handle an employee who has formally reported experiencing microaggressions from a C-level executive.",
        feedback: { 
          strengths: "You prioritized the psychological safety of the reporting employee and immediately mentioned bringing in external, unbiased legal counsel due to the executive's seniority.", 
          areasOfImprovement: "Make sure to explicitly mention documenting the entire process rigorously for compliance and protecting the company from potential retaliation claims. Documentation is your strongest defense in executive-level investigations." 
        },
      },
      {
        id: 4,
        totalQuestions: 5,
        type: "Performance Management",
        question: "How do you structure performance improvement plans (PIPs) to ensure they are genuinely supportive rather than purely punitive, while protecting the company legally?",
        feedback: { 
          strengths: "You demonstrated a modern HR mindset by focusing on the PIP as a coaching tool. You emphasized setting SMART (Specific, Measurable, Achievable, Relevant, Time-bound) goals.", 
          areasOfImprovement: "You could improve your answer by discussing how you coach managers to deliver the PIP. Managers often fail at executing PIPs because they lack the communication skills to be both supportive and firm." 
        },
      },
      {
        id: 5,
        totalQuestions: 5,
        type: "Change Management",
        question: "Explain how you would design and communicate a completely new compensation and equity structure to an existing workforce without causing a spike in attrition.",
        feedback: { 
          strengths: "Very thorough answer. You proposed a multi-channel communication strategy (email, town halls, 1-on-1s) and emphasized focusing the narrative on total rewards and long-term value.", 
          areasOfImprovement: "Consider mentioning the creation of a 'Total Compensation Statement' or interactive calculator. Visualizing the new equity structure helps employees understand the tangible value better than verbal explanations." 
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
      duration: "45 mins",
      durationFeedback: "Good time management. You answered all technical questions, though you spent slightly too long on basic concepts.",
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
        totalQuestions: 5,
        type: "Core Node.js Architecture",
        question: "Deep dive into the Node.js Event Loop. How do the microtask and macrotask queues interact, and how can heavy CPU-bound tasks block the event loop? How would you solve this?",
        feedback: { 
          strengths: "You understood that Node.js is single-threaded and uses libuv to handle asynchronous non-blocking I/O operations.", 
          areasOfImprovement: "You failed to explain the order of execution between `process.nextTick`, Promises (microtasks), and `setTimeout` (macrotasks). To solve the CPU-blocking issue, you should have detailed the use of `worker_threads` for CPU-intensive tasks." 
        },
      },
      {
        id: 2,
        totalQuestions: 5,
        type: "Memory Management",
        question: "Explain memory management and Garbage Collection in V8. How do you identify, trace, and resolve a memory leak in a production Node.js application?",
        feedback: { 
          strengths: "You correctly identified that V8 handles memory allocation and mentioned closures as a common source of memory leaks.", 
          areasOfImprovement: "Your troubleshooting approach was superficial. A senior developer must mention taking heap snapshots using tools like `node --inspect` or Chrome DevTools, comparing snapshots to find retained memory, and analyzing the dominator tree." 
        },
      },
      {
        id: 3,
        totalQuestions: 5,
        type: "Distributed Systems & Caching",
        question: "How would you implement a distributed caching strategy using Redis for a Node.js API that serves highly volatile real-time data to thousands of websockets?",
        feedback: { 
          strengths: "You correctly proposed using Redis Pub/Sub to broadcast updates across multiple Node.js instances, which is essential for horizontal scaling with WebSockets.", 
          areasOfImprovement: "You didn't address the cache invalidation strategy for 'highly volatile' data. You should have discussed Cache-Aside vs Write-Through patterns, and how to handle the 'Thundering Herd' problem when the cache expires." 
        },
      },
      {
        id: 4,
        totalQuestions: 5,
        type: "Multithreading in Node.js",
        question: "Discuss the architectural differences and performance implications of using Worker Threads vs Child Processes in Node.js for parallel execution.",
        feedback: { 
          strengths: "You knew that Child Processes spin up entirely new Node instances, while Worker Threads run within the same process.", 
          areasOfImprovement: "You missed the critical distinction: memory sharing. Worker Threads can share memory via `SharedArrayBuffer`, making them significantly faster and lighter for CPU-bound tasks than IPC (Inter-Process Communication) messaging used by Child Processes." 
        },
      },
      {
        id: 5,
        totalQuestions: 5,
        type: "Streams and File I/O",
        question: "How do you securely handle and process streaming uploads of massive files (e.g., 50GB video files) in a Node.js server without exhausting RAM?",
        feedback: { 
          strengths: "You correctly identified that loading the file into memory buffer is a fatal error, and that Node.js Streams are required.", 
          areasOfImprovement: "You need to explain exactly how to pipe a `ReadableStream` (from the HTTP request) directly into a `WritableStream` (like AWS S3 or a local file) using `.pipe()` or `pipeline()`. You also forgot to mention handling backpressure." 
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
