export interface UserProfile {
  userId: string;
  authorizedUser: {
    token: string;
    refreshToken: string | null;
    email: string;
    name: string;
    createdAt: string;
    degree: string | null;
    university: string | null;
    targetPosition: string | null;
    yearsExperience: number | null;
    hasResume: boolean;
    // Set by backend after adding onboarding_resume_filename to /me
    onboardingResumeFilename?: string | null;
    // ATS final resume info (also added by backend to /me)
    atsResumeFilename?: string | null;
    atsResumeId?: number | null;
    isOnboarded: boolean;
    totalAttempts: number;
  };
}
