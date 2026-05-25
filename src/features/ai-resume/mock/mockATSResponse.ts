export const mockATSResponse = {
    score: 72,
    breakdown: {
        skills: 68,
        experience: 74,
        formatting: 88,
        keywords: 54
    },
    recommendations: [
        "Add TypeScript-related projects",
        "Improve ATS keywords (testing, performance)",
        "Add measurable achievements with metrics",
        "Include portfolio link in header"
    ],
    skillsAnalysis: {
        strong: ["React", "JavaScript", "Responsive Design", "APIs"],
        missing: ["TypeScript", "Unit Testing", "Performance Opt.", "GraphQL"],
        deprioritize: ["Basic C", "MS Office", "Typing Speed"]
    },
    projects: [
        {
            title: "E-commerce React App",
            status: "Average",
            description: "Demonstrates frontend basics but lacks scalability and production-level architecture.",
        },
        {
            title: "Weather Dashboard",
            status: "Good",
            description: "Clean component structure. Add API error states and loading skeletons.",
        }
    ],
    suggestedProject: {
        title: "Real-time collaborative dashboard with React + WebSockets",
        description: "Aligns with modern frontend engineering expectations and shows scalable state handling.",
        tags: ["React", "WebSockets", "Intermediate", "High demand"]
    }
};
