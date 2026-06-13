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
    isOnboarded: boolean;
    totalAttempts: number;
  };
}
