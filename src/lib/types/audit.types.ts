export type AuditAction =
  | 'income_added'
  | 'expense_added'
  | 'goal_created'
  | 'goal_allocated'
  | 'goal_status_changed'
  | 'goal_deleted'
  | 'transfer_created'
  | 'transfer_reversed'
  | 'donation_recorded'
  | 'donation_reversed'
  | 'income_reversed'
  | 'expense_reversed'
  | 'funds_initialized'
  | 'settings_updated'
  | 'category_renamed';

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
