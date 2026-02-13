/**
 * Organization Structure Types
 * Defines the complete type system for AI-powered organizational management
 */

// ============ ROLES & HIERARCHY ============

export type RoleLevel = 'ceo' | 'executive' | 'director' | 'manager' | 'lead' | 'senior' | 'junior' | 'intern'

export type Department = 
  | 'executive'
  | 'engineering'
  | 'product'
  | 'design'
  | 'marketing'
  | 'sales'
  | 'finance'
  | 'hr'
  | 'operations'
  | 'legal'
  | 'support'
  | 'research'
  | 'data'
  | 'security'
  | 'custom'

export interface Role {
  id: string
  title: string
  department: Department
  level: RoleLevel
  description: string
  responsibilities: string[]
  requiredSkills: string[]
  reportsTo?: string // Role ID
  canApprove: string[] // What types of decisions this role can approve
  canHire: boolean
  canFire: boolean
  budget?: number
  createdAt: number
}

// ============ AGENT/EMPLOYEE ============

export type AgentStatus = 'active' | 'busy' | 'idle' | 'offline' | 'terminated'

export interface AgentSkill {
  name: string
  level: number // 1-10
  experience: number // hours
}

export interface AgentPerformance {
  tasksCompleted: number
  tasksAssigned: number
  successRate: number
  avgCompletionTime: number // ms
  qualityScore: number // 1-10
  lastReview: number
  reviews: PerformanceReview[]
}

export interface PerformanceReview {
  id: string
  reviewerId: string
  date: number
  rating: number // 1-5
  strengths: string[]
  improvements: string[]
  goals: string[]
  comments: string
}

export interface OrganizationAgent {
  id: string
  name: string
  role: Role
  status: AgentStatus
  skills: AgentSkill[]
  personality: string
  systemPrompt: string
  avatar: string
  color: string
  hiredAt: number
  hiredBy: string
  manager?: string // Agent ID
  directReports: string[] // Agent IDs
  performance: AgentPerformance
  currentTasks: string[] // Task IDs
  completedTasks: string[]
  salary?: number
  metadata: Record<string, any>
}

// ============ TASKS & PROJECTS ============

export type TaskPriority = 'critical' | 'high' | 'medium' | 'low'
export type TaskStatus = 'pending' | 'in_progress' | 'review' | 'blocked' | 'completed' | 'cancelled'

export interface Task {
  id: string
  title: string
  description: string
  priority: TaskPriority
  status: TaskStatus
  assigneeId?: string
  assignedBy: string
  department: Department
  projectId?: string
  parentTaskId?: string
  subtasks: string[]
  dependencies: string[]
  requiredSkills: string[]
  estimatedHours: number
  actualHours: number
  deadline?: number
  createdAt: number
  startedAt?: number
  completedAt?: number
  result?: TaskResult
  approvalRequired: boolean
  approvedBy?: string
  comments: TaskComment[]
  attachments: string[]
}

export interface TaskResult {
  success: boolean
  output: any
  summary: string
  artifacts: string[]
  metrics?: Record<string, number>
}

export interface TaskComment {
  id: string
  authorId: string
  text: string
  timestamp: number
}

export interface Project {
  id: string
  name: string
  description: string
  department: Department
  lead: string // Agent ID
  team: string[] // Agent IDs
  status: 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled'
  priority: TaskPriority
  tasks: string[]
  milestones: Milestone[]
  budget?: number
  spent?: number
  startDate: number
  endDate?: number
  deadline?: number
  createdAt: number
  createdBy: string
}

export interface Milestone {
  id: string
  name: string
  description: string
  dueDate: number
  completed: boolean
  completedAt?: number
  tasks: string[]
}

// ============ DECISIONS & APPROVALS ============

export type DecisionType = 
  | 'hire'
  | 'fire'
  | 'promote'
  | 'budget'
  | 'project'
  | 'strategic'
  | 'policy'
  | 'emergency'
  | 'operational'
  | 'custom'

export type DecisionStatus = 'pending' | 'approved' | 'rejected' | 'escalated' | 'withdrawn'

export interface Decision {
  id: string
  type: DecisionType
  title: string
  description: string
  requesterId: string
  data: Record<string, any>
  status: DecisionStatus
  priority: TaskPriority
  requiredApprovers: string[] // Role IDs that can approve
  approvals: Approval[]
  rejections: Approval[]
  escalatedTo?: string
  deadline?: number
  createdAt: number
  resolvedAt?: number
  autoApproveAfter?: number // Auto-approve after X ms if no response
  ceoNotified: boolean
}

export interface Approval {
  approverId: string
  timestamp: number
  comment?: string
}

// ============ COMMUNICATION ============

export interface Message {
  id: string
  from: string
  to: string | string[]
  channel: 'direct' | 'team' | 'department' | 'organization' | 'ceo'
  subject?: string
  content: string
  priority: 'normal' | 'urgent'
  timestamp: number
  read: boolean
  replyTo?: string
  attachments?: string[]
}

export interface Meeting {
  id: string
  title: string
  description: string
  organizer: string
  attendees: string[]
  startTime: number
  endTime: number
  recurring?: 'daily' | 'weekly' | 'monthly'
  agenda: string[]
  notes?: string
  decisions?: string[]
  actionItems?: string[]
}

// ============ REPORTS & ANALYTICS ============

export interface DepartmentReport {
  department: Department
  period: { start: number; end: number }
  agents: number
  activeAgents: number
  tasksCompleted: number
  tasksInProgress: number
  avgCompletionTime: number
  successRate: number
  budget?: number
  spent?: number
  highlights: string[]
  issues: string[]
  recommendations: string[]
}

export interface OrganizationReport {
  period: { start: number; end: number }
  totalAgents: number
  activeAgents: number
  departments: DepartmentReport[]
  tasksCompleted: number
  projectsCompleted: number
  decisionsApproved: number
  decisionsPending: number
  overallHealth: number // 1-100
  topPerformers: string[]
  concerns: string[]
  ceoSummary: string
}

// ============ POLICIES & RULES ============

export interface Policy {
  id: string
  name: string
  description: string
  department?: Department
  rules: PolicyRule[]
  effectiveFrom: number
  effectiveTo?: number
  approvedBy: string
  createdAt: number
}

export interface PolicyRule {
  condition: string // Natural language condition
  action: 'require_approval' | 'notify' | 'block' | 'allow' | 'escalate'
  target?: string // Who to notify/escalate to
  parameters?: Record<string, any>
}

// ============ CEO INTERFACE ============

export interface CEODashboard {
  pendingDecisions: Decision[]
  criticalTasks: Task[]
  organizationHealth: number
  recentHires: OrganizationAgent[]
  recentTerminations: OrganizationAgent[]
  activeProjects: Project[]
  budgetStatus: {
    total: number
    spent: number
    remaining: number
  }
  alerts: Alert[]
  quickStats: {
    totalAgents: number
    tasksToday: number
    decisionsToday: number
    issuesCount: number
  }
}

export interface Alert {
  id: string
  type: 'critical' | 'warning' | 'info'
  title: string
  message: string
  source: string
  timestamp: number
  acknowledged: boolean
  actionRequired: boolean
  relatedEntity?: { type: string; id: string }
}

// ============ EVENTS ============

export type OrganizationEvent = 
  | { type: 'agent_hired'; data: { agent: OrganizationAgent; hiredBy: string } }
  | { type: 'agent_terminated'; data: { agent: OrganizationAgent; terminatedBy: string; reason: string } }
  | { type: 'agent_promoted'; data: { agent: OrganizationAgent; oldRole: Role; newRole: Role } }
  | { type: 'task_assigned'; data: { task: Task; assignee: OrganizationAgent } }
  | { type: 'task_completed'; data: { task: Task; result: TaskResult } }
  | { type: 'decision_required'; data: { decision: Decision } }
  | { type: 'decision_approved'; data: { decision: Decision; approver: string } }
  | { type: 'decision_rejected'; data: { decision: Decision; rejecter: string } }
  | { type: 'project_started'; data: { project: Project } }
  | { type: 'project_completed'; data: { project: Project } }
  | { type: 'alert_created'; data: { alert: Alert } }
  | { type: 'ceo_notification'; data: { message: string; priority: 'normal' | 'urgent' } }
