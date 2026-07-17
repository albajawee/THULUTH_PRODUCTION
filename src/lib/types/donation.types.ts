export interface Donation {
  id: string;
  userId: string;
  amount: number;
  recipient: string;
  description: string;
  date: string;
  createdAt: string;
}

export interface AddDonationInput {
  amount: number;
  recipient: string;
  description: string;
  date: string;
}
