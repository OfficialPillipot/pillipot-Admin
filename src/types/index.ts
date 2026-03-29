export type UserRole = "super_admin" | "staff";

export type OrderType = "cod" | "prepaid";
export type PdfSize = "thermal" | "a4";

export type OrderStatus =
  | "pending"
  | "packed"
  | "dispatch"
  | "delivered"
  | "cancelled"
  | "returned";

export interface Category {
  id: string;
  name: string;
  description?: string;
}

export interface Product {
  id: string;
  /** Business id e.g. PRD-1001 */
  productCode?: string;
  name: string;
  categoryId?: string;
  categoryName?: string;
  sku?: string;
  price: number;
  stockQuantity: number;
  size?: string;
  color?: string;
}

export interface StaffPosition {
  id: string;
  name: string;
  slug: string;
}

export interface AssignedNumber {
  id: string;
  number: string;
  assignedToStaffProfileId: string | null;
}

export interface Staff {
  id: string;
  name: string;
  username: string;
  phone: string;
  joinedDate: string;
  isActive: boolean;
  /** Slug from managed role (legacy fallback). */
  jobRole: string;
  staffPositionId: string | null;
  staffPositionName?: string | null;
  assignedNumberId?: string | null;
  assignedNumber?: string | null;
  avatar?: string;
  /** Payout per order (e.g. 30) */
  payoutPerOrder: number;
  /** Bonuses: e.g. [{ orders: 10, bonus: 50 }, ...] */
  bonusMilestones: { orders: number; bonus: number }[];
  /**
   * Initial login password (plain) until the staff member changes password; then null.
   * Admin UI shows "Staff changed" when null.
   */
  temporaryPassword: string | null;
  /** From GET /staff when a forgot-password (or dashboard) reset is waiting for admin. */
  pendingPasswordResetRequest?: {
    id: string;
    createdAt: string;
  } | null;
}

export interface StaffEarnings {
  staffId: string;
  staffName: string;
  payoutPerOrder: number;
  bonusMilestones: { orders: number; bonus: number }[];
  orderCount: number;
  orderEarnings: number;
  bonus: number;
  total: number;
}

export interface Sender {
  id: string;
  name: string;
  buildingHouse?: string | null;
  streetLine1: string;
  streetLine2?: string | null;
  area?: string | null;
  cityState?: string | null;
  postOffice?: string | null;
  pincode?: string | null;
  district?: string | null;
  state?: string | null;
  phone?: string | null;
  email?: string | null;
  contractId?: string | null;
  customerId?: string | null;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AppSettings {
  id: string;
  defaultPdfSize: PdfSize;
  defaultSenderId: string | null;
  defaultSender:
    | {
        id: string;
        name: string;
        contractId?: string | null;
        customerId?: string | null;
      }
    | null;
  createdAt: string;
  updatedAt: string;
}

export interface Customer {
  id: string;
  customerName: string;
  deliveryAddress: string;
  phone: string;
  pincode: string;
  postOffice: string;
  email: string;
  state: string;
  district: string;
  createdAt: string;
  updatedAt: string;
}

export interface Order {
  id: string;
  orderId: string; // display ID e.g. ORD-001
  staffId: string;
  /** Staff assigned business number (from Assigned numbers). */
  staffAssignedNumber?: string | null;
  /** Set when order was created after customers feature (links to customers table). */
  customerId?: string | null;
  customerName: string;
  deliveryAddress: string;
  phone: string;
  pincode: string;
  postOffice: string;
  email: string;
  state: string;
  district: string;
  orderType: OrderType;
  productId: string;
  quantity: number;
  sellingAmount: number;
  /** Line discount in ₹; omitted or null when none */
  discountAmount?: number | null;
  notes?: string;
  status: OrderStatus;
  /** Courier / shipment tracking reference when set */
  trackingId?: string | null;
  createdAt: string; // ISO date
  updatedAt?: string;
}

/** Payload for POST /orders; total is computed from product price on the server. */
export type CreateOrderPayload = Omit<
  Order,
  "id" | "orderId" | "createdAt" | "sellingAmount" | "discountAmount"
> & {
  discountAmount?: number;
};

export interface User {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  staffId?: string; // when role is staff
  avatar?: string;
  /** When true, UI should prompt to change password (set after admin-created staff login). */
  mustChangePassword?: boolean;
}

export interface StaffWithStats extends Staff {
  todayOrders: number;
  totalEarnings: number;
  undeliveredCount: number;
  weeklyEarnings: number;
}
