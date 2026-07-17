import { FundType } from './fund.types';

export type GoalStatus = 'active' | 'completed' | 'paused';
export type GoalPriority = 'low' | 'medium' | 'high';

export interface Goal {
  id: string;
  userId: string;
  title: string;
  description: string;
  targetAmount: number;
  fundType: FundType;
  deadline: string; // ISO string
  priority: GoalPriority;
  status: GoalStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateGoalInput {
  title: string;
  description: string;
  targetAmount: number;
  fundType: FundType;
  deadline: string;
  priority: GoalPriority;
}

export interface GoalProgress {
  percentage: number;
  remaining: number;
  estimatedCompletionDate: string | null;
}
