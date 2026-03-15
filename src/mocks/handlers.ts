import { http, HttpResponse } from "msw";
import type { Order, Product, Staff } from "../types";
import { mockProducts, mockOrders, mockStaff, generateOrderId } from "./data";

const V1 = "/v1/api";

// Products
export const productHandlers = [
  http.get(`${V1}/products`, () => HttpResponse.json(mockProducts)),
  http.post(`${V1}/products`, async ({ request }) => {
    const body = (await request.json()) as Omit<Product, "id">;
    const newProduct: Product = { ...body, id: `p-${Date.now()}` };
    mockProducts.push(newProduct);
    return HttpResponse.json(newProduct, { status: 201 });
  }),
  http.put(`${V1}/products/:id`, async ({ request, params }) => {
    const id = params.id as string;
    const body = (await request.json()) as Partial<Product>;
    const i = mockProducts.findIndex((p) => p.id === id);
    if (i === -1) return new HttpResponse(null, { status: 404 });
    mockProducts[i] = { ...mockProducts[i], ...body };
    return HttpResponse.json(mockProducts[i]);
  }),
  http.delete(`${V1}/products/:id`, ({ params }) => {
    const id = params.id as string;
    const i = mockProducts.findIndex((p) => p.id === id);
    if (i === -1) return new HttpResponse(null, { status: 404 });
    mockProducts.splice(i, 1);
    return new HttpResponse(null, { status: 204 });
  }),
];

// Orders
export const orderHandlers = [
  http.get(`${V1}/orders`, () => HttpResponse.json(mockOrders)),
  http.post(`${V1}/orders`, async ({ request }) => {
    const body = (await request.json()) as Omit<Order, "id" | "orderId" | "createdAt">;
    const orderId = generateOrderId(mockOrders);
    const newOrder: Order = {
      ...body,
      id: `o-${Date.now()}`,
      orderId,
      createdAt: new Date().toISOString(),
    };
    mockOrders.push(newOrder);
    return HttpResponse.json(newOrder, { status: 201 });
  }),
  http.put(`${V1}/orders/:id`, async ({ request, params }) => {
    const id = params.id as string;
    const body = (await request.json()) as Partial<Order>;
    const i = mockOrders.findIndex((o) => o.id === id);
    if (i === -1) return new HttpResponse(null, { status: 404 });
    mockOrders[i] = { ...mockOrders[i], ...body, updatedAt: new Date().toISOString() };
    return HttpResponse.json(mockOrders[i]);
  }),
  http.delete(`${V1}/orders/:id`, ({ params }) => {
    const id = params.id as string;
    const i = mockOrders.findIndex((o) => o.id === id);
    if (i === -1) return new HttpResponse(null, { status: 404 });
    mockOrders.splice(i, 1);
    return new HttpResponse(null, { status: 204 });
  }),
];

const defaultBonusMilestones = [
  { orders: 10, bonus: 50 },
  { orders: 15, bonus: 100 },
  { orders: 20, bonus: 150 },
];

// Staff
export const staffHandlers = [
  http.get(`${V1}/staff`, () => HttpResponse.json(mockStaff)),
  http.post(`${V1}/staff`, async ({ request }) => {
    const body = (await request.json()) as Omit<Staff, "id">;
    const newStaff: Staff = {
      ...body,
      id: `s-${Date.now()}`,
      payoutPerOrder: body.payoutPerOrder ?? 30,
      bonusMilestones: body.bonusMilestones ?? defaultBonusMilestones,
    };
    mockStaff.push(newStaff);
    return HttpResponse.json(newStaff, { status: 201 });
  }),
  http.put(`${V1}/staff/:id`, async ({ request, params }) => {
    const id = params.id as string;
    const body = (await request.json()) as Partial<Staff>;
    const i = mockStaff.findIndex((s) => s.id === id);
    if (i === -1) return new HttpResponse(null, { status: 404 });
    mockStaff[i] = { ...mockStaff[i], ...body };
    return HttpResponse.json(mockStaff[i]);
  }),
];

export const handlers = [...productHandlers, ...orderHandlers, ...staffHandlers];
