/** TanStack Query key factory — prevents key duplication across the app */

export const queryKeys = {
  // Auth & profiles
  profile: (id: string) => ['profile', id] as const,
  profiles: (filters?: Record<string, unknown>) => ['profiles', filters] as const,

  // Departments
  departments: () => ['departments'] as const,
  department: (id: string) => ['departments', id] as const,

  // Tasks
  tasks: (filters?: Record<string, unknown>) => ['tasks', filters] as const,
  task: (id: string) => ['task', id] as const,
  taskEvents: (taskId: string) => ['task-events', taskId] as const,
  taskComments: (taskId: string) => ['task-comments', taskId] as const,
  taskChecklist: (taskId: string) => ['task-checklist', taskId] as const,
  taskProofs: (taskId: string) => ['task-proofs', taskId] as const,
  myTasks: (userId: string) => ['my-tasks', userId] as const,
  assignedByMe: (userId: string) => ['assigned-by-me', userId] as const,
  teamTasks: (deptId: string) => ['team-tasks', deptId] as const,
  overdueCount: (scope?: string) => ['overdue-count', scope] as const,

  // Approvals
  pendingApprovals: (userId: string) => ['pending-approvals', userId] as const,
  dateChangeRequests: (userId: string) => ['date-change-requests', userId] as const,

  // Routines & templates
  routines: () => ['routines'] as const,
  routine: (id: string) => ['routines', id] as const,
  templates: () => ['templates'] as const,
  chains: () => ['chains'] as const,

  // Notifications
  notifications: (userId: string) => ['notifications', userId] as const,
  unreadCount: (userId: string) => ['unread-count', userId] as const,

  // People
  people: (filters?: Record<string, unknown>) => ['people', filters] as const,
  person: (id: string) => ['person', id] as const,
  personTimeline: (id: string, date: string) => ['person-timeline', id, date] as const,

  // Reports & analytics
  departmentStats: () => ['department-stats'] as const,
  completionRates: (period?: string) => ['completion-rates', period] as const,
  routineCompliance: () => ['routine-compliance'] as const,
  workload: () => ['workload'] as const,
  leaderboard: (period?: string) => ['leaderboard', period] as const,

  // AI
  aiAlerts: (scope?: string) => ['ai-alerts', scope] as const,
  aiDigests: () => ['ai-digests'] as const,
  aiUsage: () => ['ai-usage'] as const,

  // App
  appSettings: () => ['app-settings'] as const,
  holidays: () => ['holidays'] as const,
  leaves: (userId?: string) => ['leaves', userId] as const,
  announcements: () => ['announcements'] as const,
  eodReport: (userId: string, date: string) => ['eod', userId, date] as const,
} as const;

