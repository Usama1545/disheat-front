import { GetServerSideProps } from "next";
import { getProducts, getSettings } from "@/routes/api";
import React from "react";
import { isSSR } from "@/helpers/getters";
import MyBreadcrumbs from "@/components/custom/MyBreadcrumbs";
import PageHeader from "@/components/custom/PageHeader";
import ProductCard from "@/components/Cards/ProductCard";
import ProductCardSkeleton from "@/components/Skeletons/ProductCardSkeleton";
import InfiniteScroll from "@/components/Functional/InfiniteScroll";
import { useInfiniteData } from "@/hooks/useInfiniteData";
import { Product, PaginatedResponse } from "@/types/ApiResponse";
import { NextPageWithLayout } from "@/types";
import { getAccessTokenFromContext } from "@/helpers/auth";
import InfiniteScrollStatus from "@/components/Functional/InfiniteScrollStatus";
import { useRouter } from "next/router";
import { getUserLocationFromContext } from "@/helpers/functionalHelpers";
import NoProductsFound from "@/components/NoProductsFound";
import { ArrowRight, ShoppingCart } from "lucide-react";
import { loadTranslations } from "../../../../i18n";
import { formatString } from "@/helpers/validator";
import { useTranslation } from "react-i18next";
import PageHead from "@/SEO/PageHead";
import { Button } from "@heroui/react";

interface BrandProductsPageProps {
  initialProducts: PaginatedResponse<Product[]> | null;
  error?: string;
  brandSlug: string;
}

const PER_PAGE = 24;

const BrandProductsPage: NextPageWithLayout<BrandProductsPageProps> = ({
  initialProducts,
  brandSlug,
}) => {
  const router = useRouter();
  const { t } = useTranslation();
  const slug = brandSlug || (router.query.slug as string);

  const {
    data: products,
    isLoading,
    isLoadingMore,
    hasMore,
    total,
    loadMore,
    refetch,
  } = useInfiniteData<Product>({
    fetcher: (params) =>
      getProducts({ ...params, brands: slug, include_child_categories: 0 }),
    perPage: PER_PAGE,
    initialData: initialProducts?.data?.data || [],
    initialTotal: initialProducts?.data?.total || 0,
    passLocation: true,
    dataKey: `/brands/${slug}`,
  });

  return (
    <>
      <PageHead
        pageTitle={`${formatString(slug || "")} ${t("products")}` || ""}
      />

      <div className="min-h-screen">
        <MyBreadcrumbs
          breadcrumbs={[
            {
              href: "/brands",
              label: t("pages.brandProducts.breadcrumb.brands"),
            },
            { href: `/brands/${slug}`, label: formatString(slug) },
          ]}
        />

        <button
          id="refetch-brand-products"
          className="hidden"
          onClick={() => {
            refetch();
          }}
        />

        <PageHeader
          title={t("pages.brandProducts.title", {
            brand: formatString(slug || ""),
          })}
          subtitle={t("pages.brandProducts.subtitle", {
            brand: formatString(slug || ""),
          })}
          highlightText={
            total ? t("pages.brandProducts.highlight", { count: total }) : ""
          }
        />

        <div className="w-full">
          <InfiniteScroll
            hasMore={hasMore}
            isLoading={isLoadingMore}
            onLoadMore={loadMore}
          >
            <div className="grid grid-cols-2 xs:grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 xl::grid-cols-8 gap-2">
              {isLoading && products.length === 0
                ? Array.from({ length: PER_PAGE }).map((_, i) => (
                    <ProductCardSkeleton key={i} />
                  ))
                : products.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
            </div>

            {isLoadingMore && (
              <div className="grid grid-cols-2 xs:grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 gap-2 mt-6">
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
                title={t("pages.brandProducts.noProducts.title")}
                description={t("pages.brandProducts.noProducts.description")}
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
    </>
  );
};

export const getServerSideProps: GetServerSideProps | undefined = isSSR()
  ? async (context) => {
      try {
        const { slug } = context.params || {};
        const access_token = (await getAccessTokenFromContext(context)) || "";
        const { lat = "", lng = "" } =
          (await getUserLocationFromContext(context)) || {};
        await loadTranslations(context);

        if (!slug || Array.isArray(slug)) {
          return {
            notFound: true,
          };
        }

        const products = await getProducts({
          page: 1,
          per_page: PER_PAGE,
          brands: slug,
          access_token,
          latitude: lat,
          longitude: lng,
        });
        const settings = await getSettings();

        return {
          props: {
            initialProducts: products,
            initialSettings: settings.data,
            brandSlug: slug,
          },
        };
      } catch (err) {
        console.error("Error in getServerSideProps:", err);
        return {
          props: {
            initialProducts: null,
            initialSettings: null,
            brandSlug: "",
            error:
              err instanceof Error
                ? err.message
                : "An error occurred during SSR",
          },
        };
      }
    }
  : undefined;

export default BrandProductsPage;
