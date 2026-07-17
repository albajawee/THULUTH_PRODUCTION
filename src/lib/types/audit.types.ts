export type AuditAction =
  | 'income_added'
  | 'expense_added'
  | 'goal_created'
  | 'goal_allocated'
  | 'transfer_created'
  | 'donation_recorded'
  | 'funds_initialized'
  | 'settings_updated';

export interface AuditLog {
  id: string;
  userId: string;
  action: AuditAction;
  entityType: string;
  entityId: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  createdAt: string;
}
