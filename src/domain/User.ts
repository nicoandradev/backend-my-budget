export interface User {
  id: string;
  email: string;
  password: string;
  name: string;
  role: 'root' | 'admin' | 'user';
  pendingActive: boolean;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

