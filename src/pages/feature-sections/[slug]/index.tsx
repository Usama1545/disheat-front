import { GetServerSideProps } from "next";
import { getSectionBySlug, getSettings } from "@/routes/api";
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
import { getUserLocationFromContext } from "@/helpers/functionalHelpers";
import { useRouter } from "next/router";
import InfiniteScrollStatus from "@/components/Functional/InfiniteScrollStatus";
import { loadTranslations } from "../../../../i18n";
import { formatString } from "@/helpers/validator";
import { useTranslation } from "react-i18next";
import PageHead from "@/SEO/PageHead";
import NoProductsFound from "@/components/NoProductsFound";
import { ArrowRight, ShoppingCart } from "lucide-react";
import { Button } from "@heroui/react";

interface FeatureSectionPageProps {
  initialProducts: PaginatedResponse<Product[]> | null;
  error?: string;
  sectionSlug: string;
  sectionTitle?: string;
}

const PER_PAGE = 24;

const FeatureSectionPage: NextPageWithLayout<FeatureSectionPageProps> = ({
  initialProducts,
  sectionSlug,
}) => {
  const router = useRouter();
  const { t } = useTranslation();

  const slug = sectionSlug || (router.query.slug as string);

  const {
    data: products,
    isLoading,
    isLoadingMore,
    hasMore,
    total,
    loadMore,
    refetch,
  } = useInfiniteData<Product>({
    fetcher: (params) => getSectionBySlug({ ...params, slug: slug }),
    perPage: PER_PAGE,
    initialData: initialProducts?.data?.data || [],
    initialTotal: initialProducts?.data?.total || 0,
    passLocation: true,
    dataKey: slug,
  });

  const title = formatString(slug);

  return (
    <>
      <PageHead
        pageTitle={`${title} - ${t("pages.featureSection.titleSuffix")}`}
      />

      <div className="min-h-screen">
        <MyBreadcrumbs
          breadcrumbs={[
            {
              href: "/feature-sections",
              label: t("pageTitle.feature-sections"),
            },
            { href: `/feature-sections/${sectionSlug}`, label: title },
          ]}
        />

        <button
          id="refetch-section-products"
          className="hidden"
          onClick={() => {
            refetch();
          }}
        />

        <PageHeader
          title={title || t("pages.featureSection.defaultTitle")}
          subtitle={t("pages.featureSection.subtitle")}
          highlightText={
            total ? ` ${total} ${t("pages.featureSection.products")}` : title
          }
        />

        <div className="w-full">
          <InfiniteScroll
            hasMore={hasMore}
            isLoading={isLoadingMore}
            onLoadMore={loadMore}
          >
            <div className="grid grid-cols-2 xs:grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 xl::grid-cols-8 gap-2">
              {isLoading
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
                title={t("no_products_found")}
                description={t("no_products_available")}
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
        await loadTranslations(context);
        const access_token = (await getAccessTokenFromContext(context)) || "";
        const { lat = "", lng = "" } =
          (await getUserLocationFromContext(context)) || {};

        if (!slug || Array.isArray(slug)) {
          return { notFound: true };
        }

        const products = await getSectionBySlug({
          page: 1,
          per_page: PER_PAGE,
          slug,
          access_token,
          latitude: lat,
          longitude: lng,
        });
        const settings = await getSettings();

        return {
          props: {
            initialProducts: products,
            initialSettings: settings.data ?? null,
            sectionSlug: slug,
          },
        };
      } catch (err) {
        console.error("Error in getServerSideProps:", err);
        return {
          props: {
            initialProducts: null,
            initialSettings: null,
            sectionSlug: "",
            error:
              err instanceof Error
                ? err.message
                : "An error occurred during SSR",
          },
        };
      }
    }
  : undefined;

export default FeatureSectionPage;
