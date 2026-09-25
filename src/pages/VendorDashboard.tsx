import { useState, useMemo } from "react";
import { Link } from "react-router";
import {
  Button,
  Card,
  CardHeader,
  Modal,
  ToggleSwitch,
  Tooltip,
} from "../components/ui";
import {
  Squares2X2Icon,
  ClipboardDocumentListIcon,
  UserCircleIcon,
  TagIcon,
  ClockIcon,
  TruckIcon,
  ArrowRightIcon,
  ExclamationTriangleIcon
} from "@heroicons/react/24/outline";
import { useAuth } from "../context/AuthContext";
import {
  useGetVendorPortalOrdersQuery,
  useGetVendorPortalProductsQuery,
  useGetVendorPortalProfileQuery,
  useUpdateVendorPortalProfileMutation
} from "../store/api/edenApi";
import { isCompletedOrCodOrder } from "../lib/orderUtils";
import { toast } from "../lib/toast";

function VendorDashboardPage() {
  const { user } = useAuth();
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);

  // Queries
  const { data: allOrders = [], isLoading: isLoadingOrders } = useGetVendorPortalOrdersQuery();
  const { data: products = [], isLoading: isLoadingProducts } = useGetVendorPortalProductsQuery();
  const { data: vendorProfile, isLoading: isLoadingProfile } = useGetVendorPortalProfileQuery();
  const [updateProfile, { isLoading: isUpdatingProfile }] = useUpdateVendorPortalProfileMutation();

  // Store active status (defaults to true if undefined)
  const isStoreActive = vendorProfile?.isActive !== false;

  const handleToggleStoreActive = async (newVal: boolean) => {
    try {
      await updateProfile({ isActive: newVal }).unwrap();
      if (newVal) {
        toast.success("Store is now Active! Your products are in stock and available for purchase.");
      } else {
        toast.warning("Store is now Inactive (Paused). Your products are marked as Out of Stock.");
      }
    } catch (err) {
      toast.fromError(err, "Failed to update store status");
    }
  };

  const handleToggleClick = (newVal: boolean) => {
    if (!newVal) {
      // Switching from Active to Inactive -> prompt warning modal
      setShowDeactivateModal(true);
    } else {
      // Switching from Inactive to Active -> activate immediately without modal
      handleToggleStoreActive(true);
    }
  };

  const handleConfirmDeactivate = async () => {
    setShowDeactivateModal(false);
    await handleToggleStoreActive(false);
  };

  const handleCancelDeactivate = () => {
    setShowDeactivateModal(false);
  };

  // Valid orders (completed online payment or COD)
  const validOrders = useMemo(() => {
    return allOrders.filter(isCompletedOrCodOrder);
  }, [allOrders]);

  // 1. Pending orders to accept: status === "pending"
  const pendingAcceptOrders = useMemo(() => {
    return validOrders.filter((o) => o.status === "pending");
  }, [validOrders]);

  // 2. Pending orders for pickup: strictly status === "accepted" (as requested)
  const pendingPickupOrders = useMemo(() => {
    return validOrders.filter((o) => o.status === "accepted");
  }, [validOrders]);

  return (
    <div className="space-y-6">
      {/* Top Welcome Banner with Active/Inactive Store Toggle */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-3">
          <div className="flex flex-col justify-between h-full sm:flex-row sm:items-center gap-4">
            <div>
              <p className="text-sm font-medium text-text-muted">Welcome Back,</p>
              <div className="flex items-center gap-2.5 mt-1">
                <h2 className="text-2xl font-bold text-text-heading capitalize">{user?.name}</h2>
                <span
                  className={`inline-block h-3 w-3 rounded-full shrink-0 ${isStoreActive
                    ? "bg-emerald-500 animate-pulse ring-2 ring-emerald-500/20"
                    : "bg-rose-500 ring-2 ring-rose-500/20"
                    }`}
                  title={isStoreActive ? "Store is Active" : "Store is Inactive"}
                />
              </div>
            </div>

            {/* Store Active / Inactive Toggle Switch */}
            <div className="flex items-center gap-3">
              <Tooltip
                content={
                  isStoreActive
                    ? "Store is Active (Online) — Click to deactivate store"
                    : "Store is Inactive (Paused) — Click to activate store"
                }
                side="bottom"
              >
                <div className="flex items-center bg-surface border border-border p-1.5 rounded-2xl shadow-xs">
                  <ToggleSwitch
                    checked={isStoreActive}
                    onChange={handleToggleClick}
                    disabled={isUpdatingProfile || isLoadingProfile}
                    aria-label="Toggle store active status"
                  />
                </div>
              </Tooltip>
            </div>
          </div>

          {/* Inactive store warning alert banner */}
          {/* {!isStoreActive && (
            <div className="mx-6 mb-5 p-3.5 rounded-xl border border-amber-300 bg-amber-50 flex items-center justify-between text-xs text-amber-900">
              <div className="flex items-center gap-2 font-medium">
                <ExclamationTriangleIcon className="h-4 w-4 text-amber-600 shrink-0" />
                <span>
                  <strong>Store is currently Inactive:</strong> Your products are currently displayed as <strong>Out of Stock</strong> on the web app with the Buy button disabled. Turn the switch above back to <strong>Store Active</strong> whenever you are ready to resume sales.
                </span>
              </div>
            </div>
          )} */}
        </Card>
      </div>

      {/* Interactive Metric Boxes (Click to navigate with filter applied) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Box 1: Pending Orders to Accept -> Navigates to /vendor/orders?status=pending */}
        <Link
          to="/vendor/orders?status=pending"
          className="group relative p-5 rounded-2xl border border-amber-300 bg-gradient-to-br from-amber-50/50 via-white to-orange-50/20 hover:border-amber-500 hover:shadow-md hover:-translate-y-0.5 transition-all block"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-800">
              Orders to Accept
            </span>
            <span className="p-2.5 rounded-xl bg-amber-100 text-amber-700 group-hover:bg-amber-200 group-hover:text-amber-900 transition-colors">
              <ClockIcon className="h-5 w-5" />
            </span>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-black text-text-heading group-hover:text-amber-700 transition-colors">
              {isLoadingOrders ? "..." : pendingAcceptOrders.length}
            </span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
              Pending
            </span>
          </div>
          <p className="mt-2 text-xs text-text-muted">
            {pendingAcceptOrders.length > 0
              ? "Action required within 24h window"
              : "All received orders accepted"}
          </p>
          <div className="mt-4 pt-3 border-t border-amber-100 flex items-center justify-between text-xs font-bold text-amber-700 group-hover:text-amber-900">
            <span>View & accept orders</span>
            <ArrowRightIcon className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        {/* Box 2: Pending Orders for Pickup -> Navigates to /vendor/orders?status=accepted */}
        <Link
          to="/vendor/orders?status=accepted"
          className="group relative p-5 rounded-2xl border border-sky-300 bg-gradient-to-br from-sky-50/50 via-white to-blue-50/20 hover:border-sky-500 hover:shadow-md hover:-translate-y-0.5 transition-all block"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-sky-800">
              Orders for Pickup
            </span>
            <span className="p-2.5 rounded-xl bg-sky-100 text-sky-700 group-hover:bg-sky-200 group-hover:text-sky-900 transition-colors">
              <TruckIcon className="h-5 w-5" />
            </span>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-black text-text-heading group-hover:text-sky-700 transition-colors">
              {isLoadingOrders ? "..." : pendingPickupOrders.length}
            </span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-sky-100 text-sky-800">
              Accepted
            </span>
          </div>
          <p className="mt-2 text-xs text-text-muted">
            {pendingPickupOrders.length > 0
              ? "Accepted orders awaiting courier pickup"
              : "No orders waiting for pickup"}
          </p>
          <div className="mt-4 pt-3 border-t border-sky-100 flex items-center justify-between text-xs font-bold text-sky-700 group-hover:text-sky-900">
            <span>View pickup orders</span>
            <ArrowRightIcon className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        {/* Box 3: My Products -> Navigates to /vendor/products */}
        <Link
          to="/vendor/products"
          className="group relative p-5 rounded-2xl border border-emerald-300 bg-gradient-to-br from-emerald-50/50 via-white to-teal-50/20 hover:border-emerald-500 hover:shadow-md hover:-translate-y-0.5 transition-all block"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
              Active Products
            </span>
            <span className="p-2.5 rounded-xl bg-emerald-100 text-emerald-700 group-hover:bg-emerald-200 group-hover:text-emerald-900 transition-colors">
              <Squares2X2Icon className="h-5 w-5" />
            </span>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-black text-text-heading group-hover:text-emerald-700 transition-colors">
              {isLoadingProducts ? "..." : products.length}
            </span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
              In Catalog
            </span>
          </div>
          <p className="mt-2 text-xs text-text-muted">
            Manage catalog, inventory & pricing
          </p>
          <div className="mt-4 pt-3 border-t border-emerald-100 flex items-center justify-between text-xs font-bold text-emerald-700 group-hover:text-emerald-900">
            <span>Manage products</span>
            <ArrowRightIcon className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        {/* Box 4: Total Orders -> Navigates to /vendor/orders */}
        <Link
          to="/vendor/orders"
          className="group relative p-5 rounded-2xl border border-purple-300 bg-gradient-to-br from-purple-50/50 via-white to-indigo-50/20 hover:border-purple-500 hover:shadow-md hover:-translate-y-0.5 transition-all block"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-purple-800">
              Order History
            </span>
            <span className="p-2.5 rounded-xl bg-purple-100 text-purple-700 group-hover:bg-purple-200 group-hover:text-purple-900 transition-colors">
              <ClipboardDocumentListIcon className="h-5 w-5" />
            </span>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-black text-text-heading group-hover:text-purple-700 transition-colors">
              {isLoadingOrders ? "..." : validOrders.length}
            </span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800">
              Total
            </span>
          </div>
          <p className="mt-2 text-xs text-text-muted">
            All order history, status & slips
          </p>
          <div className="mt-4 pt-3 border-t border-purple-100 flex items-center justify-between text-xs font-bold text-purple-700 group-hover:text-purple-900">
            <span>View full orders list</span>
            <ArrowRightIcon className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>
      </div>

      {/* Quick Access Tiles */}
      <Card>
        <CardHeader
          title="Marketplace Overview"
          subtitle="Quick access to vendor tools and catalog management"
        />
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
            to="/vendor/products"
            className="p-4 rounded-xl border border-border bg-surface hover:border-primary transition-colors group block"
          >
            <div className="flex items-center justify-between text-text-muted group-hover:text-primary">
              <p className="text-xs font-semibold uppercase">My Catalog</p>
              <Squares2X2Icon className="h-5 w-5" />
            </div>
            <p className="text-lg font-bold mt-2 text-text-heading group-hover:text-primary">
              Manage Products
            </p>
          </Link>

          <Link
            to="/vendor/orders"
            className="p-4 rounded-xl border border-border bg-surface hover:border-primary transition-colors group block"
          >
            <div className="flex items-center justify-between text-text-muted group-hover:text-primary">
              <p className="text-xs font-semibold uppercase">Recent Orders</p>
              <ClipboardDocumentListIcon className="h-5 w-5" />
            </div>
            <p className="text-lg font-bold mt-2 text-text-heading group-hover:text-primary">
              View Product Orders
            </p>
          </Link>

          <Link
            to="/vendor/offers"
            className="p-4 rounded-xl border border-border bg-surface hover:border-primary transition-colors group block"
          >
            <div className="flex items-center justify-between text-text-muted group-hover:text-primary">
              <p className="text-xs font-semibold uppercase">Promotions</p>
              <TagIcon className="h-5 w-5" />
            </div>
            <p className="text-lg font-bold mt-2 text-text-heading group-hover:text-primary">
              Special Offers
            </p>
          </Link>

          <Link
            to="/vendor/profile"
            className="p-4 rounded-xl border border-border bg-surface hover:border-primary transition-colors group block"
          >
            <div className="flex items-center justify-between text-text-muted group-hover:text-primary">
              <p className="text-xs font-semibold uppercase">Account</p>
              <UserCircleIcon className="h-5 w-5" />
            </div>
            <p className="text-lg font-bold mt-2 text-text-heading group-hover:text-primary">
              View & Edit Profile
            </p>
          </Link>
        </div>
      </Card>

      {/* Warning Confirmation Modal for Store Deactivation */}
      <Modal
        isOpen={showDeactivateModal}
        onClose={handleCancelDeactivate}
        title="Warning: Deactivate Store"
        size="md"
        footer={
          <div className="flex items-center justify-end gap-3">
            <Button
              variant="secondary"
              onClick={handleCancelDeactivate}
              disabled={isUpdatingProfile}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleConfirmDeactivate}
              loading={isUpdatingProfile}
            >
              OK
            </Button>
          </div>
        }
      >
        <div className="flex items-start gap-3.5">
          <div className="p-2.5 bg-amber-100 rounded-full text-amber-600 shrink-0">
            <ExclamationTriangleIcon className="h-6 w-6" />
          </div>
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-text-heading">
              Are you sure you want to deactivate your store?
            </h4>
            <p className="text-xs text-text-muted leading-relaxed">
              When your store is inactive, all of your products will be displayed as{" "}
              <strong className="text-rose-600 font-semibold">Out of Stock</strong> on the store with ordering disabled. Customers will not be able to purchase your items until you switch the store back to active.
            </p>
            <p className="text-xs text-text-muted">
              Click <strong>OK</strong> to confirm deactivating, or <strong>Cancel</strong> to remain active.
            </p>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default VendorDashboardPage;
