import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { ServerSessionClient } from '@/lib/server-session-client';
const state = vi.hoisted(() => ({ session: undefined as unknown, replace: vi.fn(), path: '/home' }));
vi.mock('@/lib/session-runtime', () => ({ cookieSessionEnabled: true, productSession: () => state.session, broadcastSessionChange: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: state.replace }), usePathname: () => state.path }));
vi.mock('@/lib/posthog/tracking.utils', () => ({ resetUser: vi.fn(), identifyUser: vi.fn(), trackLogoutButtonClick: vi.fn() }));
import AppProvider from '@/components/providers/app-provider';
import { AuthProvider, useAuth } from '@/components/providers/auth-provider';
function Product() {
  const { user, signOut } = useAuth();
  return <><p>{user?.authorizedUser.name || 'Anonymous'}</p><button onClick={signOut}>Sign out</button></>;
}

it('restores a cookie identity through the real account boundary, hides content on logout failure and confirms logout before routing', async () => {
  let authenticated = true;
  let failLogout = true;
  const transport = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    expect(init?.credentials).toBe('include');
    expect(new Headers(init?.headers).has('Authorization')).toBe(false);
    const path = new URL(String(input)).pathname;
    if (path.endsWith('/logout-all')) {
      expect(new Headers(init?.headers).get('X-CSRF-Token')).toBe('csrf');
      if (failLogout) return Response.json({}, { status: 503 });
      authenticated = false;
      return Response.json({ authenticated: false, globally_revoked: true });
    }
    if (path.endsWith('/me')) return Response.json({ userId: 42, authorizedUser: {
      name: 'Test learner', email: 'learner@example.test', createdAt: '2026-01-01T00:00:00Z',
      degree: null, university: null, targetPosition: null, yearsExperience: null, hasResume: false,
      isOnboarded: true, isAdmin: false, isSuperAdmin: false, canEdit: false, canCreateRoles: false,
      totalAttempts: 0, membershipRoles: [],
    } });
    return authenticated ? Response.json({ authenticated: true, principal: 'learner-42', csrf_token: 'csrf' }) : Response.json({ authenticated: false, globally_revoked: true }, { status: 401 });
  });
  state.session = new ServerSessionClient('https://api.example.test/api', transport);
  render(<AppProvider><AuthProvider><Product /></AuthProvider></AppProvider>);
  expect(await screen.findByText('Test learner')).toBeTruthy();
  expect(state.replace).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Sign out' }));
  expect(await screen.findByText('Sign-out could not be confirmed')).toBeTruthy();
  expect(screen.queryByText('Test learner')).toBeNull();
  expect(state.replace).not.toHaveBeenCalled();
  failLogout = false;
  fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
  await waitFor(() => expect(state.replace).toHaveBeenCalledWith('/auth/signup'));
  expect(screen.queryByText('Test learner')).toBeNull();
});
