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
  recipient: z
    .string()
    .min(1, 'Recipient is required')
    .max(100, 'Recipient is too long'),
  // Optional — see the note on addExpenseSchema.description.
  description: z.string().max(300, 'Description is too long'),
  date: z.string().min(1, 'Date is required'),
});

export const updateUserSettingsSchema = z.object({
  displayName: z.string().min(1, 'Name is required').max(100).optional(),
  selectedCurrency: z.string().min(1).max(10).optional(),
  selectedLanguage: z.enum(['en', 'ar']).optional(),
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
export type UpdateUserSettingsInput = z.infer<typeof updateUserSettingsSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
