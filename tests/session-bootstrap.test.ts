import { describe, it, expect, vi } from 'vitest';
import { SessionBootstrap, studentProfile } from '@/lib/session-bootstrap';
import { ServerSessionClient, type SessionProfile } from '@/lib/server-session-client';
const profile: SessionProfile = { userId: 7, authorizedUser: {
  email: 'test@example.test', name: 'Learner', createdAt: '2026-01-01', degree: null,
  university: null, targetPosition: null, yearsExperience: null, hasResume: false,
  isOnboarded: false, isAdmin: false, isSuperAdmin: false, canEdit: false,
  canCreateRoles: false, totalAttempts: 0, membershipRoles: [],
} };
describe('student session bootstrap', () => {
  it('projects the real full profile without tokens or manufactured fields', () => {
    expect(studentProfile(profile)).toMatchObject({ userId: '7', authorizedUser: { degree: null, hasResume: false } });
    expect(studentProfile(profile).authorizedUser).not.toHaveProperty('token');
  });
  it.each(['createdAt', 'degree', 'university', 'targetPosition', 'yearsExperience', 'hasResume'] as const)('rejects incomplete %s contract', key => {
    expect(() => studentProfile({ ...profile, authorizedUser: { ...profile.authorizedUser, [key]: undefined } })).toThrow();
  });
  it('coalesces restoration across concurrent mounts and skips profiles for anonymous visitors', async () => {
    const client = new ServerSessionClient('https://api.test');
    const restore = vi.spyOn(client, 'restore').mockResolvedValue({ authenticated: false, principal: null, revision: 0 });
    const read = vi.spyOn(client, 'profile');
    const boot = new SessionBootstrap(client);
    expect(await Promise.all([boot.load(), boot.load(), boot.load()])).toEqual([null, null, null]);
    expect(restore).toHaveBeenCalledTimes(1); expect(read).not.toHaveBeenCalled();
  });
  it('never exchanges the same single-use callback twice, including after failure', async () => {
    const client = new ServerSessionClient('https://api.test');
    const complete = vi.spyOn(client, 'complete').mockRejectedValue(new Error('lost response'));
    const boot = new SessionBootstrap(client);
    const a = boot.complete('ticket'); const b = boot.complete('ticket');
    expect(a).toBe(b);
    await expect(a).rejects.toThrow('lost response');
    await expect(boot.complete('ticket')).rejects.toThrow('lost response');
    await expect(boot.complete('different')).rejects.toThrow('Restart sign-in');
    expect(complete).toHaveBeenCalledTimes(1);
  });
  it('propagates failed restoration without retaining a rejected read flight', async () => {
    const client = new ServerSessionClient('https://api.test');
    vi.spyOn(client, 'restore').mockRejectedValueOnce(new Error('offline')).mockResolvedValue({ authenticated: true, principal: '7', revision: 1 });
    vi.spyOn(client, 'profile').mockResolvedValue(profile);
    const boot = new SessionBootstrap(client);
    await expect(boot.load()).rejects.toThrow('offline');
    expect((await boot.load())?.userId).toBe('7');
  });
});
