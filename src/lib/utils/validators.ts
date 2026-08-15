import { z } from 'zod';

export const addIncomeSchema = z.object({
  amount: z
    .number({ error: 'Amount must be a number' })
    .positive('Amount must be positive')
    .max(1_000_000_000, 'Amount is too large'),
  source: z
    .string()
    .min(1, 'Source is required')
    .max(100, 'Source is too long'),
  date: z.string().min(1, 'Date is required'),
  note: z.string().max(500, 'Note is too long').optional(),
});

/**
 * The income rules, plus the note-base rule when the user's currency has one and they've left the
 * setting on: the amount itself must be a whole number of notes.
 *
 * Rejecting the entry is what keeps the split honest. If an amount that isn't a multiple of the
 * note base were accepted, the leftover sliver (under 250 IQD) could not go into any fund without
 * recreating exactly the unspendable figure the rounding exists to prevent. So the amount is
 * refused at the door and the user is told to turn the setting off if they really need it.
 *
 * `step` comes from the stored profile on the server, never from the request.
 */
export function addIncomeSchemaFor(step: number) {
  if (step <= 1) return addIncomeSchema;
  return addIncomeSchema.refine((data) => data.amount % step === 0, {
    path: ['amount'],
    message: `Amount must be a multiple of ${step} while whole-note splitting is on`,
  });
}

export const addExpenseSchema = z.object({
  fundType: z.enum(['stability', 'growth', 'life', 'charity']),
  category: z.string().min(1, 'Category is required'),
  amount: z
    .number({ error: 'Amount must be a number' })
    .positive('Amount must be positive')
    .max(1_000_000_000, 'Amount is too large'),
  // Optional: no `.min(1)`, so an empty string passes. Deliberately NOT `.optional()` — that
  // would make the field `string | undefined`, which react-hook-form binds to as the form's input
  // type (churning every consumer) and which Firestore rejects outright as a field value.
  // Empty-string-means-absent keeps one type end to end.
  description: z.string().max(300, 'Description is too long'),
  date: z.string().min(1, 'Date is required'),
});

export const createGoalSchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required')
    .max(100, 'Title is too long'),
  // Optional — see the note on addExpenseSchema.description.
  description: z.string().max(500, 'Description is too long'),
  targetAmount: z
    .number({ error: 'Target amount must be a number' })
    .positive('Target amount must be positive')
    .max(1_000_000_000, 'Amount is too large'),
  fundType: z.enum(['stability', 'growth', 'life', 'charity']),
  deadline: z.string().min(1, 'Deadline is required'),
  priority: z.enum(['low', 'medium', 'high']),
});

export const createTransferSchema = z.object({
  fromFund: z.enum(['stability', 'growth', 'life', 'charity']),
  toFund: z.enum(['stability', 'growth', 'life', 'charity']),
  amount: z
    .number({ error: 'Amount must be a number' })
    .positive('Amount must be positive'),
  reason: z
    .string()
    .min(1, 'Reason is required')
    .max(300, 'Reason is too long'),
}).refine((data) => data.fromFund !== data.toFund, {
  message: 'Source and destination funds must be different',
  path: ['toFund'],
});

export const addDonationSchema = z.object({
  amount: z
    .number({ error: 'Amount must be a number' })
    .positive('Amount must be positive'),
  // Optional — a donation is identified by its category; a named recipient is a nicety, not
  // required. Empty-string-means-absent, same as description (see addExpenseSchema.description).
  recipient: z.string().max(100, 'Recipient is too long'),
  // Same shape as an expense's category, drawn from the charity fund's list in Settings — which
  // existed and was editable long before anything read it.
  category: z.string().min(1, 'Category is required'),
  // Optional — see the note on addExpenseSchema.description.
  description: z.string().max(300, 'Description is too long'),
  date: z.string().min(1, 'Date is required'),
});

/**
 * A rotating savings group (ROSCA). `joinedAtRound` may exceed `memberCount` by one, which records
 * a group that finished entirely before the user started tracking.
 */
const roscaGroupBase = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name is too long'),
  contributionAmount: z
    .number({ error: 'Contribution must be a number' })
    .positive('Contribution must be positive')
    .max(1_000_000_000, 'Amount is too large'),
  memberCount: z
    .number({ error: 'Member count must be a number' })
    .int('Member count must be a whole number')
    .min(2, 'A group needs at least 2 members')
    .max(60, 'That is too many members'),
  fundType: z.enum(['stability', 'growth', 'life', 'charity']),
  startDate: z.string().min(1, 'Start date is required'),
  payoutRound: z
    .number()
    .int('Round must be a whole number')
    .min(1, 'Round must be at least 1')
    .nullable(),
  joinedAtRound: z
    .number({ error: 'Round must be a number' })
    .int('Round must be a whole number')
    .min(1, 'Round must be at least 1'),
  priorContributed: z.number().min(0, 'Cannot be negative').max(1_000_000_000, 'Amount is too large'),
  priorReceived: z.number().min(0, 'Cannot be negative').max(1_000_000_000, 'Amount is too large'),
  // Optional — see the note on addExpenseSchema.description.
  note: z.string().max(500, 'Note is too long'),
});

const roscaGroupRefined = roscaGroupBase
  .refine((d) => d.payoutRound === null || d.payoutRound <= d.memberCount, {
    path: ['payoutRound'],
    message: 'Your turn must be one of the rounds in this group',
  })
  // +1 allows recording a group that had already finished before tracking began.
  .refine((d) => d.joinedAtRound <= d.memberCount + 1, {
    path: ['joinedAtRound'],
    message: 'That round is past the end of this group',
  })
  // Tracking from round 1 means nothing predates tracking, so an opening position is a
  // contradiction — and a costly one: those amounts count towards the group's position while no
  // round is marked historical, so the totals would never reconcile against anything. The UI keeps
  // these in step, but the rule belongs here where it can't be bypassed by a form bug.
  .refine((d) => d.joinedAtRound > 1 || (d.priorContributed === 0 && d.priorReceived === 0), {
    path: ['priorContributed'],
    message: 'A group tracked from round 1 cannot have money paid before tracking began',
  });

export const createRoscaGroupSchema = roscaGroupRefined;

/**
 * The group rules plus the note-base rule, for currencies where the smallest banknote is larger than
 * one unit. A contribution that isn't a whole number of notes can't be handed over, and the payout
 * is a whole multiple exactly when the contribution is — so validating the one covers both.
 *
 * Mirrors `addIncomeSchemaFor`. `step` comes from the stored profile on the server, never the
 * request. Applied at creation only; turning the setting off later leaves existing groups alone.
 */
export function createRoscaGroupSchemaFor(step: number) {
  if (step <= 1) return createRoscaGroupSchema;
  return createRoscaGroupSchema.refine((d) => d.contributionAmount % step === 0, {
    path: ['contributionAmount'],
    message: `Contribution must be a multiple of ${step} while whole-note splitting is on`,
  });
}

export const updateUserSettingsSchema = z.object({
  displayName: z.string().min(1, 'Name is required').max(100).optional(),
  selectedCurrency: z.string().min(1).max(10).optional(),
  selectedLanguage: z.enum(['en', 'ar']).optional(),
  roundToNoteBase: z.boolean().optional(),
  roscaEnabled: z.boolean().optional(),
});

export const updateFundCategoriesSchema = z.object({
  fundType: z.enum(['stability', 'growth', 'life', 'charity']),
  categories: z
    .array(z.string().trim().min(1).max(40))
    .max(30, 'Too many categories')
    // de-duplicate case-insensitively, keeping first spelling
    .transform((arr) => {
      const seen = new Set<string>();
      const out: string[] = [];
      for (const c of arr) {
        const key = c.toLowerCase();
        if (!seen.has(key)) { seen.add(key); out.push(c); }
      }
      return out;
    }),
});

/**
 * Renaming is deliberately its own operation rather than a list edit: a category IS its label, and
 * that label is copied onto every expense that used it. Sending a changed list through
 * updateFundCategories cannot express "these are the same category" — it reads as a delete plus an
 * add, silently orphaning the recorded expenses into a bucket no longer offered anywhere.
 */
export const renameFundCategorySchema = z.object({
  fundType: z.enum(['stability', 'growth', 'life', 'charity']),
  from: z.string().trim().min(1, 'Category is required').max(40),
  to: z
    .string()
    .trim()
    .min(1, 'New name is required')
    .max(40, 'Name is too long'),
});

export const registerSchema = z.object({
  displayName: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name is too long'),
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password is too long'),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export type AddIncomeInput = z.infer<typeof addIncomeSchema>;
export type AddExpenseInput = z.infer<typeof addExpenseSchema>;
export type CreateGoalInput = z.infer<typeof createGoalSchema>;
export type CreateTransferInput = z.infer<typeof createTransferSchema>;
export type AddDonationInput = z.infer<typeof addDonationSchema>;
export type CreateRoscaGroupInput = z.infer<typeof createRoscaGroupSchema>;
export type UpdateUserSettingsInput = z.infer<typeof updateUserSettingsSchema>;
export type RenameFundCategoryInput = z.infer<typeof renameFundCategorySchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
