export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  sku?: string;
  offerPrice?: number;
  categoryId: string;
  sellerId: string;
  imageUrl: string;
  dispatchLocation?: string;
  deliveryType?: 'retiro' | 'envio' | 'mixto' | string;
  rating: number;
  isActive?: boolean;
  category?: Category;
  seller?: Seller;
  createdAt?: string;
  updatedAt?: string;
}

export interface Seller {
  id: string;
  userId?: string;
  businessName: string;
  description: string;
  logoUrl: string;
  rating: number;
  isVerified: boolean;
}

export interface Category {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
}

export interface Order {
  id: string;
  userId: string;
  items: OrderItem[];
  totalAmount: number;
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
  shippingAddress: string;
  createdAt: string;
}

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  product?: Product;
}

export interface CreateOrderItem {
  productId: string;
  quantity: number;
  unitPrice: number;
}

export interface CreateOrderPayload {
  shippingAddress: string;
  items: CreateOrderItem[];
}

export interface CartItem {
  productId: string;
  quantity: number;
  product?: Product;
  availabilityIssue?: string;
}

export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  address?: string;
  userType: 'client' | 'seller' | 'admin';
  createdAt?: string;
  updatedAt?: string;
  sellerProfile?: Seller | null;
}

export interface AuthResponse {
  message: string;
  token: string;
  user: User;
}
