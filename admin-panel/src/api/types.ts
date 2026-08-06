export type UserRole = 'OWNER' | 'ADMIN' | 'DEPARTMENT_HEAD' | 'EMPLOYEE';
export type WorkStatus = 'AT_WORK' | 'ON_VACATION' | 'BUSY' | 'DO_NOT_DISTURB';

export interface CurrentUser {
  id: string;
  phone: string;
  firstName: string;
  lastName: string;
  position: string | null;
  avatarUrl: string | null;
  role: UserRole;
  workStatus: WorkStatus;
  isOnline: boolean;
  isBlocked: boolean;
  companyId: string;
  departmentId: string | null;
  department?: { id: string; name: string } | null;
}

export interface DashboardStats {
  employeesCount: number;
  activeUsersCount: number;
  messagesCount: number;
  filesCount: number;
}

export interface Company {
  id: string;
  name: string;
  logoUrl: string | null;
}

export interface Department {
  id: string;
  name: string;
  companyId: string;
  _count: { users: number };
}

export interface GroupSummary {
  id: string;
  name: string | null;
  type: 'GROUP' | 'CHANNEL';
  description: string | null;
  updatedAt: string;
  _count: { members: number };
}
