import type { Banner } from "../types";
import { edenApi } from "./api/edenApi";
import type { RootState } from "./rootReducer";

const selectBannersResult = edenApi.endpoints.getBanners.select(undefined);

export const selectBanners = (state: RootState) =>
  selectBannersResult(state).data ?? [];

export const fetchBanners = () =>
  edenApi.endpoints.getBanners.initiate(undefined, { forceRefetch: true });

export const createBanner = (
  payload: Pick<Banner, "title" | "description" | "linkUrl" | "order" | "isActive"> & {
    image: File;
  },
) => edenApi.endpoints.createBanner.initiate(payload);

export const updateBanner = (arg: {
  id: string;
  patch: Partial<Banner> & { image?: File | null };
}) => edenApi.endpoints.updateBanner.initiate(arg);

export const deleteBanner = (id: string) =>
  edenApi.endpoints.deleteBanner.initiate(id);
