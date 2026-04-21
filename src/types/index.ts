export type UserRole = "super_admin" | "staff" | "guest";

export type OrderType = "cod" | "prepaid";
export type PdfSize = "thermal" | "a4";

export type OrderStatus =
  | "scheduled"
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
  imageUrl?: string | null;
}

export interface Subcategory {
  id: string;
  name: string;
  description?: string;
  categoryId: string;
  category?: Category;
}

export interface Banner {
  id: string;
  title: string;
  description?: string;
  imageUrl: string;
  linkUrl?: string;
  order: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface DeliveryMethod {
  id: string;
  name: string;
  description?: string;
  sortOrder: number;
}

export interface ProductDeliveryFee {
  id: string;
  productId: string;
  productName?: string;
  deliveryMethodId: string;
  deliveryMethodName?: string;
  feePrepaid: number;
  feeCod: number;
}

/** From GET product-delivery-fees/for-cart */
export interface DeliveryOptionForCart {
  deliveryMethodId: string;
  name: string;
  totalFee: number;
}

export interface Product {
  id: string;
  /** Business id e.g. PRD-1001 */
  productCode?: string;
  name: string;
  description?: string;
  imageUrl?: string | null;
  imageUrl2?: string | null;
  imageUrl3?: string | null;
  videoUrl?: string | null;
  createdAt?: string;
  categoryId?: string;
  categoryName?: string;
  subcategoryId?: string;
  subcategoryName?: string;
  sku?: string;
  /** Selling / catalog price */
  price: number;
  /** Cost; only returned for super_admin */
  buyingPrice?: number;
  stockQuantity: number;
  size?: string;
  color?: string;
  /** false = hidden from staff catalog; admin still sees all. */
  isActive?: boolean;
}

export type ProfitGranularity = "day" | "week" | "month" | "year";

export interface ProfitStatusSlice {
  lineCount: number;
  quantity: number;
  sellingTotal: number;
}

export interface ProfitSeriesPoint {
  label: string;
  revenue: number;
  costOfGoods: number;
  grossMargin: number;
  staffVariable: number;
  deliveryFees: number;
  netBeforeBonus: number;
}

export interface ProfitAnalyticsResponse {
  dateFrom: string;
  dateTo: string;
  granularity: ProfitGranularity;
  delivered: {
    lineCount: number;
    quantity: number;
    revenue: number;
    costOfGoods: number;
    grossMargin: number;
    staffVariable: number;
    staffMilestoneBonuses: number;
    deliveryFees: number;
    netProfit: number;
  };
  cancelled: ProfitStatusSlice;
  returned: ProfitStatusSlice;
  inPipeline: ProfitStatusSlice;
  series: ProfitSeriesPoint[];
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
  /** UPI VPA for payouts (e.g. name@paytm). */
  upiId?: string | null;
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
  /** Merged with staff role permissions at login (JWT). */
  extraPermissionSlugs?: string[];
  /** Order counts grouped by status. */
  statusCounts?: Record<string, number>;
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
  /** When earnings were loaded with both dateFrom and dateTo, and a payout exists for that period. */
  periodPayment?: {
    id: string;
    paidAt: string;
    totalAmount: number;
    paidByName: string | null;
  } | null;
}

/** Recorded payout from GET /staff/salary-payments */
/** One row per staff per UTC calendar day (from GET …/bonus-daily-log). */
export interface StaffBonusDailyLogTier {
  milestoneOrders: number;
  bonus: number;
}

export interface StaffBonusDailyLogEntry {
  staffId: string;
  staffName: string;
  date: string;
  quantityTotal: number;
  baseEarnings: number;
  bonusTotal: number;
  dayTotal: number;
  tiers: StaffBonusDailyLogTier[];
}

export interface StaffSalaryPaymentRow {
  id: string;
  staffId: string;
  staffName: string;
  periodStart: string;
  periodEnd: string;
  quantityCount: number;
  baseAmount: number;
  bonusAmount: number;
  totalAmount: number;
  paidAt: string;
  paidByName: string | null;
  note: string | null;
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
  contractIdPrepaid?: string | null;
  contractIdCod?: string | null;
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
  /** Products with stock ≤ this value are flagged on dashboards (0 = only zero stock). */
  lowStockThreshold: number;
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
  secondaryPhone?: string | null;
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
  secondaryPhone?: string | null;
  orderType: OrderType;
  productId: string;
  /** From API when listing orders; use for display before catalog lookup. */
  productName?: string;
  quantity: number;
  sellingAmount: number;
  /** Line discount in ₹; omitted or null when none */
  discountAmount?: number | null;
  notes?: string;
  addOnAmount?: number | null;
  addOnNote?: string | null;
  deliveryMethodId?: string | null;
  deliveryFee?: number | null;
  deliveryMethodName?: string | null;
  status: OrderStatus;
  /** Fulfilment calendar date while status is `scheduled` (YYYY-MM-DD). */
  scheduledFor?: string | null;
  /** Courier / shipment tracking reference when set */
  trackingId?: string | null;
  createdAt: string; // ISO date
  updatedAt?: string;
  /** Set on POST /orders when the API queues a confirmation email (debounced on server). */
  emailConfirmationScheduled?: boolean;
  /** Set on POST /orders: API has full SMTP credentials; if false, no email is actually sent. */
  outboundEmailReady?: boolean;
  platform?: string;
}

/** Payload for POST /orders; total is computed from product price on the server. */
export type CreateOrderPayload = Omit<
  Order,
  | "id"
  | "orderId"
  | "createdAt"
  | "sellingAmount"
  | "discountAmount"
  | "addOnAmount"
  | "addOnNote"
  | "deliveryMethodId"
  | "deliveryFee"
  | "deliveryMethodName"
  | "status"
  | "secondaryPhone"
> & {
  /** Defaults to pending on the API when omitted; use with scheduledFor for scheduled lines. */
  status?: OrderStatus;
  discountAmount?: number;
  addOnAmount?: number;
  addOnNote?: string;
  orderId?: string;
  deliveryMethodId?: string;
  /** All product ids in this multi-line order (first line only). */
  orderProductIds?: string[];
  /**
   * When false, API skips the customer confirmation email for this line.
   * Use false on all but the last line of a multi-product order so one email is sent.
   */
  notifyCustomerEmail?: boolean;
  /** When set (future YYYY-MM-DD), order line is created as scheduled; confirmation email is deferred. */
  scheduledFor?: string;
  secondaryPhone?: string;
};

export interface User {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  /** Effective permission slugs from the user’s role (empty for legacy stored users until refresh). */
  permissions?: string[];
  staffId?: string; // when role is staff
  avatar?: string;
  /** When true, UI should prompt to change password (set after admin-created staff login). */
  mustChangePassword?: boolean;
}

/** RBAC role row from GET /rbac/roles */
export interface RbacRoleRow {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  permissionSlugs: string[];
}

export interface PermissionRow {
  id: string;
  slug: string;
  name: string;
  resource: string;
  action: string;
}

export interface RbacMatrixResponse {
  catalog: {
    slug: string;
    name: string;
    resource: string;
    action: string;
  }[];
}

export interface GuestUserRow {
  id: string;
  username: string;
  name: string;
  isActive: boolean;
}

/** GET /rbac/users (super_admin) */
export interface AdminUserRow {
  id: string;
  username: string;
  name: string;
  roleSlug: string;
  roleName: string;
  isActive: boolean;
  mustChangePassword: boolean;
  staffProfileId: string | null;
  extraPermissionSlugs: string[];
}

export interface StaffWithStats extends Staff {
  todayOrders: number;
  totalEarnings: number;
  undeliveredCount: number;
  weeklyEarnings: number;
}

export type BlogAudience =
  | { kind: "all" }
  | { kind: "staff"; staffIds: string[] }
  | { kind: "positions"; positionIds: string[] };

export interface BlogAdminListRow {
  id: string;
  title: string;
  published: boolean;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  audience: BlogAudience;
  authorName: string | null;
  likeCount: number;
  commentCount: number;
}

export interface BlogAdminDetail {
  id: string;
  title: string;
  bodyHtml: string;
  published: boolean;
  publishedAt: string | null;
  audience: BlogAudience;
  authorName: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BlogFeedItem {
  id: string;
  title: string;
  excerpt: string;
  publishedAt: string;
  authorName: string;
  likeCount: number;
  commentCount: number;
  likedByMe: boolean;
}

export interface BlogPostDetail {
  id: string;
  title: string;
  bodyHtml: string;
  publishedAt: string;
  authorName: string;
  likeCount: number;
  likedByMe: boolean;
  commentCount: number;
}

export interface BlogComment {
  id: string;
  body: string;
  createdAt: string;
  parentId: string | null;
  authorKind: "staff" | "admin";
  authorName: string;
  staffProfileId: string | null;
}

export type StaffEnquiryStatus = "open" | "resolved";

export interface StaffEnquiryListRow {
  id: string;
  subject: string;
  status: StaffEnquiryStatus;
  createdAt: string;
  updatedAt: string;
  preview: string;
  replyCount: number;
  staffName?: string;
  staffProfileId?: string;
}

export interface StaffEnquiryReply {
  id: string;
  body: string;
  createdAt: string;
  authorName: string;
  isStaff: boolean;
}

export interface StaffEnquiryDetail {
  id: string;
  subject: string;
  body: string;
  status: StaffEnquiryStatus;
  createdAt: string;
  updatedAt: string;
  staffProfileId?: string;
  staffName?: string;
  initialAuthorName: string;
  replies: StaffEnquiryReply[];
}
