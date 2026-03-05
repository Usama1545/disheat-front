import { store } from "@/lib/redux/store";
import { updateCartData } from "./updators";
import { getCookie } from "@/lib/cookies";
import { UserLocation } from "@/components/Location/types/LocationAutoComplete.types";
import { addToast } from "@heroui/react";
import { clearRecentlyViewed } from "@/lib/redux/slices/recentlyViewedSlice";

export const onLocationChange = () => {
  if (typeof window === "undefined") return;

  // Clear recently viewed products when location changes
  store.dispatch(clearRecentlyViewed());

  const pathButtonMap: Record<string, string[]> = {
    "/": [
      "home-products-refetch",
      "home-sections-refetch",
      "home-stores-refetch",
      "home-banners-refetch",
      "home-brands-refetch",
      "home-categories-refetch",
      "home-category-tabs",
    ],
    "/stores": ["refetch-store-page"],
    "/products": ["refetch-products-page"],
    "/feature-sections": ["refetch-sections-page"],
    "/cart": ["refetch-cart-page", "refetch-similar-products"],
    "/categories": ["refetch-categories-page"],
    "/shopping-list": ["shopping-list-refetch"],
    "/brands": ["refetch-brands-page"],
  };

  const normalizePath = (path: string) =>
    path !== "/" ? path.replace(/\/+$/, "") : "/";

  const currentPath = normalizePath(window.location.pathname);

  let buttonIds: string[] = [];

  if (currentPath.startsWith("/feature-sections/")) {
    // Handle dynamic slug
    buttonIds = ["refetch-section-products"];
  } else if (currentPath.startsWith("/products/")) {
    buttonIds = ["similar-products-refetch", "specific-product-refetch"];
  } else if (currentPath.startsWith("/brands/")) {
    buttonIds = ["refetch-brand-products"];
  } else if (currentPath.startsWith("/categories/")) {
    buttonIds = ["category-products-refetch"];
  } else if (currentPath.startsWith("/stores/")) {
    buttonIds = ["refetch-store-products"];
  } else {
    // Handle exact matches
    buttonIds = pathButtonMap[currentPath] || [];
  }

  buttonIds.forEach((id) => document.getElementById(id)?.click?.());

  updateCartData(false, false, 0, false);
};

export const onAppLoad = () => {
  if (store.getState().auth.isLoggedIn) {
    const path = typeof window !== "undefined" ? window.location.pathname : "";

    if (path !== "/cart" && path !== "/cart/") {
      updateCartData(true, false);
    }
  }

  const userLocation = getCookie("userLocation") as UserLocation;
  if (!userLocation) {
    document.getElementById("location-modal-btn")?.click();
    addToast({ color: "default", title: "Please Select Location First !" });
  }
};

export const onHomeCategoryChange = () => {
  if (typeof window === "undefined") return;

  const pathButtonMap: Record<string, string[]> = {
    "/": [
      "home-banners-refetch",
      "home-brands-refetch",
      "home-categories-refetch",
      "home-products-refetch",
      "home-sections-refetch",
    ],
  };

  const normalizePath = (path: string) =>
    path !== "/" ? path.replace(/\/+$/, "") : "/";

  const currentPath = normalizePath(window.location.pathname);

  let buttonIds: string[] = [];

  buttonIds = pathButtonMap[currentPath] || [];

  buttonIds.forEach((id) => document.getElementById(id)?.click?.());
};
