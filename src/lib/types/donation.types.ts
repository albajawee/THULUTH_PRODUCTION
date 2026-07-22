export interface Donation {
  id: string;
  userId: string;
  amount: number;
  recipient: string;
  /**
   * Optional only because donations recorded before categories existed don't have one. New
   * donations always carry a category — see addDonationSchema. Readers must handle its absence
   * rather than assume a backfill happened.
   */
  category?: string;
  description: string;
  date: string;
  createdAt: string;
}

export interface AddDonationInput {
  amount: number;
  recipient: string;
  category: string;
  description: string;
  date: string;
}
