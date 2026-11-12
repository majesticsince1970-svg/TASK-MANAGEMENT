import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import type { UserRole } from '@/types/database';
import { AppLayout } from '@/app/layout/AppLayout';

/* ─── Lazy pages ─── */
const LoginPage = lazy(() => import('@/features/auth/LoginPage'));
const PinLoginPage = lazy(() => import('@/features/auth/PinLoginPage'));
const OnboardingPage = lazy(() => import('@/features/auth/OnboardingPage'));
const HomePage = lazy(() => import('@/features/dashboard/HomePage'));
const TasksPage = lazy(() => import('@/features/tasks/TasksPage'));
const CreateTaskPage = lazy(() => import('@/features/tasks/CreateTaskPage'));
const ApprovalsPage = lazy(() => import('@/features/approvals/ApprovalsPage'));
const RoutinesPage = lazy(() => import('@/features/routines/RoutinesPage'));
const TemplatesPage = lazy(() => import('@/features/tasks/TemplatesPage'));
const ProjectsPage = lazy(() => import('@/features/projects/ProjectsPage'));
const AIManagerPage = lazy(() => import('@/features/ai/AIManagerPage'));
const LiveBoardPage = lazy(() => import('@/features/live-board/LiveBoardPage'));
const PeoplePage = lazy(() => import('@/features/people/PeoplePage'));
const PersonPage = lazy(() => import('@/features/people/PersonPage'));
const MessagesPage = lazy(() => import('@/features/messages/MessagesPage'));
const ReportsPage = lazy(() => import('@/features/reports/ReportsPage'));
const EODPage = lazy(() => import('@/features/dashboard/EODPage'));
const NotificationsPage = lazy(() => import('@/features/notifications/NotificationsPage'));
const SettingsPage = lazy(() => import('@/features/settings/SettingsPage'));
const MyProfilePage = lazy(() => import('@/features/auth/MyProfilePage'));
const TVModePage = lazy(() => import('@/features/dashboard/TVModePage'));
const VoiceTaskPage = lazy(() => import('@/features/voice/VoiceTaskPage'));
const TaskListenPage = lazy(() => import('@/features/tasks/TaskListenPage'));

/* ─── Loading fallback ─── */
function PageSkeleton() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-3 border-[var(--color-maroon)] border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-[var(--color-ink)]/60">Loading...</p>
      </div>
    </div>
  );
}

/* ─── Guards ─── */
function ProtectedRoute() {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return <PageSkeleton />;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;

  return (
    <Suspense fallback={<PageSkeleton />}>
      <Outlet />
    </Suspense>
  );
}

function PublicRoute() {
  const { user, isLoading } = useAuth();

  if (isLoading) return <PageSkeleton />;
  if (user) return <Navigate to="/" replace />;

  return (
    <Suspense fallback={<PageSkeleton />}>
      <Outlet />
    </Suspense>
  );
}

function RoleGuard({ allowed }: { allowed: UserRole[] }) {
  const { profile, isLoading } = useAuth();

  if (isLoading) return <PageSkeleton />;
  if (!profile || !allowed.includes(profile.role)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-16 h-16 rounded-full bg-[var(--color-urgent)]/10 flex items-center justify-center">
          <span className="text-2xl">🔒</span>
        </div>
        <h2 className="text-xl font-semibold">Access Denied</h2>
        <p className="text-[var(--color-ink)]/60">You don't have permission to view this page.</p>
      </div>
    );
  }

  return <Outlet />;
}

/* ─── Router ─── */
export const router = createBrowserRouter([
  // Public routes
  {
    element: <PublicRoute />,
    children: [
      { path: '/login', element: <LoginPage /> },
      { path: '/pin', element: <PinLoginPage /> },
    ],
  },

  // Protected routes with layout
  {
    element: <ProtectedRoute />,
    children: [
      { path: '/onboarding', element: <OnboardingPage /> },
      { path: '/tv', element: <TVModePage /> },
      {
        element: <AppLayout />,
        children: [
          { path: '/', element: <HomePage /> },
          { path: '/tasks', element: <TasksPage /> },
          { path: '/tasks/new', element: <CreateTaskPage /> },
          { path: '/tasks/:id/listen', element: <TaskListenPage /> },
          { path: '/approvals', element: <ApprovalsPage /> },
          { path: '/routines', element: <RoutinesPage /> },
          { path: '/templates', element: <TemplatesPage /> },
          { path: '/projects', element: <ProjectsPage /> },
          { path: '/voice/new', element: <VoiceTaskPage /> },
          { path: '/messages', element: <MessagesPage /> },
          { path: '/eod', element: <EODPage /> },
          { path: '/notifications', element: <NotificationsPage /> },
          { path: '/me', element: <MyProfilePage /> },

          // Manager+ routes
          {
            element: <RoleGuard allowed={['owner', 'director', 'dept_head']} />,
            children: [
              { path: '/ai', element: <AIManagerPage /> },
              { path: '/live', element: <LiveBoardPage /> },
              { path: '/people', element: <PeoplePage /> },
              { path: '/people/:id', element: <PersonPage /> },
              { path: '/reports', element: <ReportsPage /> },
            ],
          },

          // Owner-only routes
          {
            element: <RoleGuard allowed={['owner']} />,
            children: [
              { path: '/settings', element: <SettingsPage /> },
              { path: '/settings/:tab', element: <SettingsPage /> },
            ],
          },
        ],
      },
    ],
  },

  // Fallback
  { path: '*', element: <Navigate to="/" replace /> },
]);

