import { ServerSessionClient, SessionClientError, type SessionProfile } from '@/lib/server-session-client';
import type { UserProfile } from '@/lib/types/user';

/** Do not substitute missing profile fields with invented onboarding/resume state. */
export function studentProfile(profile: SessionProfile): UserProfile {
  const user = profile.authorizedUser;
  if (user.createdAt === undefined || user.degree === undefined || user.university === undefined || user.targetPosition === undefined || user.yearsExperience === undefined || user.hasResume === undefined) {
    throw new SessionClientError(502, 'Your profile could not be loaded. Please try again.');
  }
  return { userId: String(profile.userId), authorizedUser: {
    email: user.email, name: user.name, createdAt: user.createdAt,
    degree: user.degree, university: user.university, targetPosition: user.targetPosition,
    yearsExperience: user.yearsExperience, hasResume: user.hasResume,
    isOnboarded: user.isOnboarded, totalAttempts: user.totalAttempts,
    isAdmin: user.isAdmin, isSuperAdmin: user.isSuperAdmin, canUseBulkAts: user.canUseBulkAts,
    onboardingResumeFilename: user.onboardingResumeFilename,
    atsResumeFilename: user.atsResumeFilename, atsResumeId: user.atsResumeId,
    role: user.role === 'admin' || user.role === 'recruiter' || user.role === 'placement_staff' ? user.role : null,
  } };
}

/** Survives React StrictMode and account-boundary remounts; never replays a handoff. */
export class SessionBootstrap {
  private flight: Promise<UserProfile | null> | null = null;
  private callback: { ticket: string; result: Promise<string> } | null = null;
  constructor(private readonly session: ServerSessionClient) {}
  complete(ticket: string): Promise<string> {
    if (this.callback?.ticket === ticket) return this.callback.result;
    if (this.callback) return Promise.reject(new SessionClientError(409, 'Restart sign-in to continue.'));
    const result = this.session.complete(ticket);
    this.callback = { ticket, result };
    return result;
  }
  load(): Promise<UserProfile | null> {
    if (this.flight) return this.flight;
    const flight = (async () => {
      const state = await this.session.restore();
      return state.authenticated ? studentProfile(await this.session.profile()) : null;
    })();
    this.flight = flight;
    void flight.finally(() => { if (this.flight === flight) this.flight = null; }).catch(() => {});
    return flight;
  }
}
