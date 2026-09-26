import axios from 'axios';

export const api = axios.create({ baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api' });
api.interceptors.request.use((config) => { const token = localStorage.getItem('token'); if (token) config.headers.Authorization = `Bearer ${token}`; return config; });
export type Product = { id: string; name: string; categoryId: number; category: string; price: number; stock: number; status: 'active' | 'inactive'; imageUrl?: string | null; imageData?: string | null };
export type Category = { id: number; name: string };
export type User = { id: string; email: string; firstName: string; lastName: string; role: 'user' | 'admin' | 'superadmin'; imageUrl?: string | null };
export type InventoryReport = { generatedAt: string; totalProducts: number; activeProducts: number; totalStock: number; inventoryValue: number; byCategory: { category: string; stock: number }[] };
