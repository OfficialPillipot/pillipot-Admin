import type { CreateOrderPayload, Order } from "../types";
import {
  edenApi,
  type OrderListFilters,
  type OrderListPayload,
} from "./api/edenApi";
import type { RootState } from "./rootReducer";

export type { OrderListFilters, OrderListPayload };

const selectOrdersResult = edenApi.endpoints.getOrders.select(undefined);

export const selectOrders = (state: RootState) =>
  selectOrdersResult(state).data?.items ?? [];

export const selectOrdersListTotal = (state: RootState) =>
  selectOrdersResult(state).data?.total ?? 0;

export const fetchOrders = (filters?: OrderListFilters) =>
  edenApi.endpoints.getOrders.initiate(filters, { forceRefetch: true });

export const createOrder = (payload: CreateOrderPayload) =>
  edenApi.endpoints.createOrder.initiate(payload);

export const updateOrder = (arg: { id: string; patch: Partial<Order> }) =>
  edenApi.endpoints.updateOrder.initiate(arg);

export const bulkUpdateOrderStatus = (arg: {
  ids: string[];
  status: Order["status"];
}) => edenApi.endpoints.bulkUpdateOrderStatus.initiate(arg);

export const bulkUpdateTracking = (arg: {
  items: { id: string; trackingId: string }[];
}) => edenApi.endpoints.bulkUpdateTracking.initiate(arg);

export const deleteOrder = (id: string) =>
  edenApi.endpoints.deleteOrder.initiate(id);
