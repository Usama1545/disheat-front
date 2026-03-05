import { GetServerSideProps } from "next";
import { getProducts, getSettings } from "@/routes/api";
import React from "react";
import Head from "next/head";
import { isSSR } from "@/helpers/getters";
import MyBreadcrumbs from "@/components/custom/MyBreadcrumbs";
import PageHeader from "@/components/custom/PageHeader";
import ProductCard from "@/components/Cards/ProductCard";
import ProductCardSkeleton from "@/components/Skeletons/ProductCardSkeleton";
import InfiniteScroll from "@/components/Functional/InfiniteScroll";
import SubcategorySidebar from "@/components/Functional/SubcategorySidebar";
import SubcategoryTabsMobile from "@/components/Functional/SubcategoryTabsMobile";
import { useInfiniteData } from "@/hooks/useInfiniteData";
import { Product, PaginatedResponse } from "@/types/ApiResponse";
import { NextPageWithLayout } from "@/types";
import { getAccessTokenFromContext } from "@/helpers/auth";
import InfiniteScrollStatus from "@/components/Functional/InfiniteScrollStatus";
import { useRouter } from "next/router";
import { getUserLocationFromContext } from "@/helpers/functionalHelpers";
import NoProductsFound from "@/components/NoProductsFound";
import { ArrowRight, Package } from "lucide-react";
import { loadTranslations } from "../../../../i18n";
import { formatString } from "@/helpers/validator";
import { useTranslation } from "react-i18next";
import { Button } from "@heroui/react";
import PageHead from "@/SEO/PageHead";

interface CategoryProductsPageProps {
  initialProducts: PaginatedResponse<Product[]> | null;
  error?: string;
  categorySlug: string;
}

const PER_PAGE = 24;

const CategoryProductsPage: NextPageWithLayout<CategoryProductsPageProps> = ({
  initialProducts,
  categorySlug,
}) => {
  const { t } = useTranslation();
  const router = useRouter();
  const slug = categorySlug || (router.query.slug as string);
  const selectedSubcategory = (router.query.subcategory as string) || "";

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
      getProducts({
        ...params,
        categories: selectedSubcategory || slug,
        include_child_categories: 1,
      }),
    perPage: PER_PAGE,
    initialData: initialProducts?.data?.data || [],
    initialTotal: initialProducts?.data?.total || 0,
    passLocation: true,
    dataKey: `/categories/${slug}${selectedSubcategory ? `/${selectedSubcategory}` : ""}`,
  });

  const handleSubcategorySelect = async (subSlug: string) => {
    await router.push(`/categories/${slug}?subcategory=${subSlug}`, undefined, {
      shallow: true,
      scroll: false,
    });
  };

  const handleClearSubcategory = async () => {
    // Clear subcategory and go back to main category
    await router.push(`/categories/${slug}`, undefined, {
      shallow: true,
      scroll: false,
    });
  };

  return (
    <>
      <Head>
        <title>
          {t("pages.categoryProducts.metaTitle", {
            category: formatString(selectedSubcategory || slug),
          })}
        </title>
        <meta
          name="description"
          content={t("pages.categoryProducts.metaDescription", {
            category: formatString(selectedSubcategory || slug),
            count: products?.length || 0,
          })}
        />
      </Head>

      <PageHead
        pageTitle={`${formatString(slug || "")} ${t("products")}` || ""}
      />

      <div className="min-h-screen">
        <MyBreadcrumbs
          breadcrumbs={[
            { href: "/categories", label: t("pageTitle.categories") },
            {
              href: `/categories/${slug}`,
              label: formatString(slug),
            },
          ]}
        />

        <PageHeader
          title={t("pages.categoryProducts.title", {
            category: formatString(
              selectedSubcategory || slug || t("home.categories.title")
            ),
          })}
          subtitle={t("pages.categoryProducts.subtitle", {
            category: formatString(selectedSubcategory || slug),
          })}
          highlightText={
            total ? `${total} ${t("pages.categoryProducts.highlight")}` : ""
          }
        />
        <button
          id="category-products-refetch"
          onClick={refetch}
          className="hidden"
        />

        <div className="w-full">
          <div className="flex gap-4 flex-col md:flex-row">
            {/* Mobile subcategory tabs */}
            <div className="w-full md:hidden">
              <SubcategoryTabsMobile
                parentSlug={slug}
                selectedSubcategory={selectedSubcategory}
                onSelect={handleSubcategorySelect}
                onClear={handleClearSubcategory}
              />
            </div>
            <div className="w-fit md:block hidden">
              <SubcategorySidebar
                parentSlug={slug}
                selectedSubcategory={selectedSubcategory}
                onSelect={handleSubcategorySelect}
                onClear={handleClearSubcategory}
              />
            </div>

            <div className="flex-1">
              <InfiniteScroll
                hasMore={hasMore}
                isLoading={isLoadingMore}
                onLoadMore={loadMore}
              >
                <div className="grid grid-cols-2 xs:grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
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
                    entityType={t("pages.categoryProducts.infiniteScroll")}
                    total={total}
                    hasMore={hasMore}
                  />
                ) : (
                  <NoProductsFound
                    icon={Package}
                    title={t("pages.categoryProducts.noProducts.title")}
                    description={t(
                      "pages.categoryProducts.noProducts.description"
                    )}
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
          return {
            notFound: true,
          };
        }

        const rawSub = (context.query && context.query.subcategory) || "";
        const subcategory = Array.isArray(rawSub) ? rawSub[0] : rawSub;

        const products = await getProducts({
          page: 1,
          per_page: PER_PAGE,
          categories: subcategory || slug,
          access_token,
          latitude: lat,
          longitude: lng,
          include_child_categories: 1,
        });
        const settings = await getSettings();

        return {
          props: {
            initialProducts: products,
            initialSettings: settings.data,
            categorySlug: slug,
          },
        };
      } catch (err) {
        console.error("Error in getServerSideProps:", err);
        return {
          props: {
            initialProducts: null,
            initialSettings: null,
            categorySlug: "",
            error:
              err instanceof Error
                ? err.message
                : "An error occurred during SSR",
          },
        };
      }
    }
  : undefined;

export default CategoryProductsPage;
