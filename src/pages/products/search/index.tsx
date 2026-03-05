import { GetServerSideProps } from "next";
import { getProducts, getSettings } from "@/routes/api";
import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/router";
import { isSSR } from "@/helpers/getters";
import MyBreadcrumbs from "@/components/custom/MyBreadcrumbs";
import PageHeader from "@/components/custom/PageHeader";
import ProductCard from "@/components/Cards/ProductCard";
import ProductCardSkeleton from "@/components/Skeletons/ProductCardSkeleton";
import ProductFilter from "@/components/Products/ProductFilter";
import InfiniteScroll from "@/components/Functional/InfiniteScroll";
import { useInfiniteData } from "@/hooks/useInfiniteData";
import { Product, PaginatedResponse } from "@/types/ApiResponse";
import { NextPageWithLayout } from "@/types";
import { getUserLocationFromContext } from "@/helpers/functionalHelpers";
import { getAccessTokenFromContext } from "@/helpers/auth";
import InfiniteScrollStatus from "@/components/Functional/InfiniteScrollStatus";
import NoProductsFound from "@/components/NoProductsFound";
import { ArrowRight, ShoppingCart } from "lucide-react";
import PageHead from "@/SEO/PageHead";
import { useTranslation } from "react-i18next";
import { Button } from "@heroui/react";
import { loadTranslations } from "../../../../i18n";

interface ProductsPageProps {
  initialProducts: PaginatedResponse<Product[]> | null;
  initialFilters: ProductFilter;
  query: string;
}

interface GetProductsParams {
  page: number;
  per_page: number;
  latitude: string;
  longitude: string;
  access_token: string;
  categories?: string;
  brands?: string;
  colors?: string;
  sort?: string;
  search?: string;
  include_child_categories?: number;
}

export type SortOption = "relevance" | "price_asc" | "price_desc";

export type ProductFilter = {
  categories: string[];
  brands: string[];
  colors: string[];
  sort: SortOption;
};

const PER_PAGE = 18;

const parseFiltersFromQuery = (query: {
  [key: string]: string | string[] | undefined;
}): ProductFilter => {
  const parseQueryParam = (param: string | string[] | undefined): string[] => {
    if (!param) return [];
    if (Array.isArray(param)) return param;
    return param.split(",");
  };

  return {
    categories: parseQueryParam(query.categories),
    brands: parseQueryParam(query.brands),
    colors: parseQueryParam(query.colors),
    sort: query.sort ? (query.sort as SortOption) : "relevance",
  };
};

const filtersToQueryParams = (
  filters: ProductFilter
): Record<string, string> => {
  const params: Record<string, string> = {};

  if (filters.categories.length > 0) {
    params.categories = filters.categories.join(",");
  }
  if (filters.brands.length > 0) {
    params.brands = filters.brands.join(",");
  }
  if (filters.colors.length > 0) {
    params.colors = filters.colors.join(",");
  }
  if (filters.sort) {
    params.sort = filters.sort;
  }

  return params;
};

const SearchResultsPage: NextPageWithLayout<ProductsPageProps> = ({
  initialProducts,
  initialFilters,
  query,
}) => {
  const router = useRouter();
  const { t } = useTranslation();

  // Initialize filters from URL query params when SSR is false
  const computedInitialFilters = useMemo(() => {
    if (initialFilters) {
      return initialFilters;
    }
    // When SSR is false, parse filters from router query
    if (router.isReady) {
      return parseFiltersFromQuery(router.query);
    }
    return {
      categories: [],
      brands: [],
      colors: [],
      sort: "relevance" as SortOption,
    };
  }, [initialFilters, router.isReady, router.query]);

  const [selectedFilters, setSelectedFilters] = useState<ProductFilter>(
    computedInitialFilters
  );

  const { q } = router.query;

  const safeQuery = query || q || "";

  const {
    data: products,
    isLoading,
    isLoadingMore,
    hasMore,
    total,
    loadMore,
    isValidating,
    refetch,
  } = useInfiniteData<Product>({
    fetcher: getProducts,
    dataKey: `/productsSearch:${safeQuery}`,
    perPage: PER_PAGE,
    initialData: initialProducts?.data?.data || [],
    initialTotal: initialProducts?.data?.total || 0,
    passLocation: true,
    extraParams: {
      categories:
        selectedFilters?.categories?.length > 0
          ? selectedFilters.categories.join(",")
          : undefined,
      brands:
        selectedFilters?.brands?.length > 0
          ? selectedFilters.brands.join(",")
          : undefined,
      colors:
        selectedFilters?.colors?.length > 0
          ? selectedFilters.colors.join(",")
          : undefined,
      sort: selectedFilters?.sort ? selectedFilters.sort : undefined,
      search: safeQuery,
      include_child_categories: 0,
    },
  });

  const updateURL = async (filters: ProductFilter) => {
    const queryParams = filtersToQueryParams(filters);

    const filteredParams = Object.fromEntries(
      Object.entries(queryParams).filter(([, value]) => value)
    );

    const isFilterCleared =
      filters.categories.length === 0 &&
      filters.brands.length === 0 &&
      filters.colors.length === 0 &&
      filters.sort === "relevance";

    await router.push(
      {
        pathname: router.pathname,
        query: isFilterCleared
          ? { q: safeQuery }
          : {
              q: safeQuery,
              ...filteredParams,
            },
      },
      undefined,
      { shallow: true }
    );
  };

  const onApplyFilters = async (filters: ProductFilter) => {
    setSelectedFilters(filters);
    await updateURL(filters);
    refetch();
  };

  // Sync filters when they change in URL (for browser back/forward)
  useEffect(() => {
    const handleRouteChange = () => {
      const newFilters = parseFiltersFromQuery(router.query);
      setSelectedFilters(newFilters);
    };

    router.events.on("routeChangeComplete", handleRouteChange);
    return () => {
      router.events.off("routeChangeComplete", handleRouteChange);
    };
  }, [router.events, router.query]);

  return (
    <>
      <PageHead pageTitle={t("pageTitle.search")} />

      <div className="min-h-screen">
        <MyBreadcrumbs
          breadcrumbs={[
            { href: "/products", label: t("pageTitle.products") },
            {
              href: `/products/search?q=${encodeURIComponent(query)}`,
              label: `${t("search_results")} (${safeQuery})`,
            },
          ]}
        />

        <PageHeader
          title={`${t("search_results")} : "${safeQuery}"`}
          subtitle={t("search_placeholder")}
          highlightText={total ? ` ${total} Products` : ""}
        />

        <div className="flex w-full gap-2 flex-col md:flex-row">
          <div className="flex-none h-full">
            <ProductFilter
              selectedFilters={selectedFilters}
              setSelectedFilters={setSelectedFilters}
              onApplyFilters={onApplyFilters}
              totalProducts={total}
            />
          </div>

          <div className="flex-1">
            <InfiniteScroll
              hasMore={hasMore}
              isLoading={isLoadingMore}
              onLoadMore={loadMore}
            >
              <div className="grid grid-cols-2 xs:grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2">
                {isLoading || isValidating
                  ? Array.from({ length: PER_PAGE }).map((_, i) => (
                      <ProductCardSkeleton key={i} />
                    ))
                  : products.map((product, index) => (
                      <ProductCard
                        key={`${product.id}-${index}`}
                        product={product}
                      />
                    ))}
              </div>

              {isLoadingMore && (
                <div className="grid grid-cols-2 xs:grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2 mt-6">
                  {Array.from({ length: PER_PAGE }).map((_, i) => (
                    <ProductCardSkeleton key={`loading-${i}`} />
                  ))}
                </div>
              )}

              {products.length > 0 ? (
                <InfiniteScrollStatus
                  entityType="product"
                  total={total}
                  hasMore={hasMore}
                />
              ) : (
                <NoProductsFound
                  icon={ShoppingCart}
                  title={t("no_products_found")}
                  description={t("no_products_found_message", { safeQuery })}
                  customActions={
                    <div className="flex w-full justify-center items-center">
                      <Button
                        color="primary"
                        className="h-8"
                        variant="solid"
                        onPress={() => {
                          router.push("/");
                        }}
                        endContent={<ArrowRight size={16} />}
                      >
                        {t("home_title")}
                      </Button>
                    </div>
                  }
                />
              )}
            </InfiniteScroll>
          </div>
        </div>
      </div>
    </>
  );
};

export const getServerSideProps: GetServerSideProps | undefined = isSSR()
  ? async (context) => {
      try {
        const { lat = "", lng = "" } =
          (await getUserLocationFromContext(context)) || {};
        const access_token = (await getAccessTokenFromContext(context)) || "";
        await loadTranslations(context);

        const q = Array.isArray(context.query.q)
          ? context.query.q[0]
          : (context.query.q as string) || "";

        const initialFilters = parseFiltersFromQuery(context.query);

        const apiParams: GetProductsParams = {
          page: 1,
          per_page: PER_PAGE,
          latitude: lat,
          longitude: lng,
          access_token,
          search: q,
          include_child_categories: 0,
        };

        if (initialFilters.categories.length > 0) {
          apiParams.categories = initialFilters.categories.join(",");
        }
        if (initialFilters.brands.length > 0) {
          apiParams.brands = initialFilters.brands.join(",");
        }
        if (initialFilters.colors.length > 0) {
          apiParams.colors = initialFilters.colors.join(",");
        }
        if (initialFilters.sort) {
          apiParams.sort = initialFilters.sort;
        }

        const products = await getProducts(apiParams);
        const settings = await getSettings();

        return {
          props: {
            initialProducts: products,
            initialFilters,
            initialSettings: settings.data,
            query: q,
          },
        };
      } catch (err) {
        console.error("Error in getServerSideProps (search):", err);
        return {
          props: {
            initialProducts: null,
            initialFilters: {
              categories: [],
              brands: [],
              colors: [],
              sort: "relevance",
            },
            initialSettings: null,
            error:
              err instanceof Error
                ? err.message
                : "An error occurred during SSR",
            query: Array.isArray(context.query.q)
              ? context.query.q[0]
              : (context.query.q as string) || "",
          },
        };
      }
    }
  : undefined;

export default SearchResultsPage;
