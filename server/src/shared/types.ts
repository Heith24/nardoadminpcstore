export type Category = { id: number; name: string };
export type Product = { id: string; name: string; categoryId: number; category: string; price: number; stock: number; status: 'active' | 'inactive'; imageUrl?: string | null; imageData?: string | null };
export type UserRole = 'user' | 'admin' | 'superadmin';
export type User = { id: string; email: string; firstName: string; lastName: string; role: UserRole; imageUrl?: string | null };
