export interface Expense {
  id: string;
  userId: string;
  merchant: string;
  amount: number;
  category: string;
  date: Date;
  createdAt: Date;
  updatedAt: Date;
}
