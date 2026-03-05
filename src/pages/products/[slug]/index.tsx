import { GetServerSideProps } from "next";
import { getSlugFromContext, isSSR } from "@/helpers/getters";
import MyBreadcrumbs from "@/components/custom/MyBreadcrumbs";
import ProductDetailPageView from "@/views/Products/ProductDetailPageView";
import { ArrowRight, Package, ShoppingCart } from "lucide-react";
import { Product, Settings } from "@/types/ApiResponse";
import { NextPageWithLayout } from "@/types";
import { getAccessTokenFromContext } from "@/helpers/auth";
import { getProductBySlug, getProducts } from "@/routes/api";
import { getUserLocationFromContext } from "@/helpers/functionalHelpers";
import useSWR from "swr";
import { fetchProductDetailPageData } from "@/services/ProductDetailPageService";
import { useRouter } from "next/router";
import { getCookie } from "@/lib/cookies";
import { UserLocation } from "@/components/Location/types/LocationAutoComplete.types";
import { loadTranslations } from "../../../../i18n";
import { useTranslation } from "react-i18next";
import NoProductsFound from "@/components/NoProductsFound";
import { Button } from "@heroui/react";
import DynamicSEO from "@/SEO/DynamicSEO";
import {
  generateProductSchema,
  generateBreadcrumbSchema,
  generateProductMeta,
} from "@/helpers/seo";
import { useEffect } from "react";
import { addRecentlyViewed } from "@/lib/redux/slices/recentlyViewedSlice";
import { useDispatch } from "react-redux";

interface ProductPageProps {
  initialProduct?: Product;
  initialSettings?: Settings | null;
  initialSimilarProducts?: Product[];
  slug?: string;
  error?: string;
}

const PER_PAGE = 20;

// SWR fetcher for client
const fetcher = async (slug: string) => {
  const { lat = "", lng = "" } = getCookie("userLocation") as UserLocation;
  const res = await getProductBySlug({
    slug,
    latitude: lat,
    longitude: lng,
  });
  if (!res.success || !res.data) {
    console.error(res.message || "Failed to fetch product");
  }
  return res.data;
};

// SWR fetcher for similar products
const similarProductsFetcher = async (slug: string) => {
  const { lat = "", lng = "" } = getCookie("userLocation") as UserLocation;

  const res = await getProducts({
    exclude_product: slug,
    per_page: PER_PAGE,
    latitude: lat,
    longitude: lng,
    include_child_categories: 0,
  });

  if (!res.success || !res.data) {
    console.error(res.message || "Failed to fetch similar products");
  }

  return res.data?.data || [];
};

const ProductPage: NextPageWithLayout<ProductPageProps> = ({
  initialProduct,
  initialSimilarProducts,
  slug,
}) => {
  const router = useRouter();
  const { t } = useTranslation();

  // Get slug from router when SSR is false
  const productSlug = slug || (router.query.slug as string);

  const {
    data: product,
    isLoading,
    mutate: refetchProduct,
  } = useSWR(
    productSlug ? `/products/${productSlug}` : null,
    () => fetcher(productSlug!),
    {
      fallbackData: isSSR() ? initialProduct : undefined,
      revalidateOnFocus: false,
      revalidateOnMount: !isSSR(),
    }
  );

  const {
    data: similarProducts,
    isLoading: isSimilarProductsLoading,
    mutate: refetchSimilarProducts,
  } = useSWR(
    productSlug ? `/similar-products/${productSlug}` : null,
    () => similarProductsFetcher(productSlug!),
    {
      fallbackData: isSSR() ? initialSimilarProducts : undefined,
      revalidateOnFocus: false,
      revalidateOnMount: !isSSR(),
    }
  );

  const isProductMissing =
    !product || (Array.isArray(product) && product.length === 0);

  // Generate SEO data
  const productMeta = product ? generateProductMeta(product) : null;
  const productSchema = product ? generateProductSchema(product) : null;
  const breadcrumbSchema = product
    ? generateBreadcrumbSchema([
        { name: "Home", url: "/" },
        { name: "Products", url: "/products" },
        {
          name: product.category_name,
          url: `/products?category=${product.category_id}`,
        },
        { name: product.title, url: `/products/${product.slug}` },
      ])
    : null;

  // Combine schemas
  const jsonLdSchemas = [productSchema, breadcrumbSchema].filter(Boolean);
  const dispatch = useDispatch();

  useEffect(() => {
    if (product) {
      dispatch(addRecentlyViewed(product));
    }
  }, [product, dispatch]);

  return (
    <>
      {product && productMeta && (
        <DynamicSEO
          title={productMeta.title}
          description={productMeta.description}
          keywords={productMeta.keywords}
          canonical={`/products/${product.slug}`}
          ogType="product"
          ogTitle={productMeta.title}
          ogDescription={productMeta.description}
          ogImage={productMeta.image}
          ogImageAlt={productMeta.title}
          twitterCard="summary_large_image"
          twitterTitle={productMeta.title}
          twitterDescription={productMeta.description}
          twitterImage={productMeta.image}
          productPrice={
            product.variants?.[0]?.special_price?.toString() ||
            product.variants?.[0]?.price?.toString()
          }
          productCurrency="USD"
          productAvailability={
            product.variants?.some((v) => v.stock > 0)
              ? "in stock"
              : "out of stock"
          }
          productCondition="new"
          jsonLd={jsonLdSchemas}
        />
      )}

      {!product && (
        <DynamicSEO
          title={t("not_found")}
          description={t("no_product_available")}
          robots="noindex, follow"
        />
      )}

      <div className="min-h-screen">
        <MyBreadcrumbs
          breadcrumbs={[
            {
              href: "/products",
              label: t("products"),
              startContent: <Package size={12} />,
            },
            { href: "#", label: product?.title || "" },
          ]}
        />

        <button
          onClick={() => {
            refetchSimilarProducts();
          }}
          className="hidden"
          id="similar-products-refetch"
        />

        <button
          onClick={() => {
            refetchProduct();
          }}
          className="hidden"
          id="specific-product-refetch"
        />
        {/* Show when Main Product Is  Found */}

        {!isLoading && isProductMissing ? (
          <NoProductsFound
            icon={ShoppingCart}
            title={t("no_product_found")}
            description={t("no_product_available")}
            customActions={
              <div className="flex w-full justify-center items-center">
                <Button
                  color="primary"
                  className="h-8"
                  variant="solid"
                  onPress={() => router.push("/")}
                  endContent={<ArrowRight size={16} />}
                >
                  {t("home_title")}
                </Button>
              </div>
            }
          />
        ) : (
          <ProductDetailPageView
            initialProduct={product!}
            initialSimilarProducts={similarProducts || []}
            isLoading={isLoading}
            isSimilarProductsLoading={isSimilarProductsLoading}
          />
        )}
      </div>
    </>
  );
};

export const getServerSideProps: GetServerSideProps | undefined = isSSR()
  ? async (context) => {
      try {
        // Get access token and user location
        const access_token = (await getAccessTokenFromContext(context)) || "";
        const { lat = "", lng = "" } =
          (await getUserLocationFromContext(context)) || {};
        await loadTranslations(context);

        // Get product slug from URL
        const slug = getSlugFromContext(context);

        // Fetch all product page data from the service
        const data = await fetchProductDetailPageData({
          slug,
          access_token,
          lat,
          lng,
          PER_PAGE,
        });

        return {
          props: {
            ...data,
            slug,
          },
        };
      } catch (err) {
        console.error("Unexpected error in getServerSideProps:", err);
        return {
          props: {
            error:
              err instanceof Error
                ? err.message
                : "An unexpected SSR error occurred",
          },
        };
      }
    }
  : undefined;

export default ProductPage;
