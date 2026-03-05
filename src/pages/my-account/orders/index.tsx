import OrderCard from "@/components/Cards/OrderCard";
import MyBreadcrumbs from "@/components/custom/MyBreadcrumbs";
import PageHeader from "@/components/custom/PageHeader";
import UserLayout from "@/layouts/UserLayout";
import { GetServerSideProps } from "next";
import { Order, PaginatedResponse } from "@/types/ApiResponse";
import { isSSR } from "@/helpers/getters";
import { getOrders, getSettings } from "@/routes/api";
import { NextPageWithLayout } from "@/types";
import { Button, Pagination } from "@heroui/react";
import { getAccessTokenFromContext } from "@/helpers/auth";
import { useRouter } from "next/router";
import useSWR from "swr";
import { useState, useEffect, ReactNode } from "react";
import OrdersEmpty from "@/components/Empty/OrdersEmpty";
import { loadTranslations } from "../../../../i18n";
import { useTranslation } from "react-i18next";
import PageHead from "@/SEO/PageHead";
import OrderCardSkeleton from "@/components/Skeletons/OrderCardSkeleton";
import { updateCartData } from "@/helpers/updators";

const PER_PAGE = 9;

interface OrdersData {
  data: Order[];
  current_page: number;
  per_page: number;
  total: number;
}

interface OrdersPageProps {
  orders?: OrdersData;
  error?: string | null;
  isSSR: boolean;
}

// SWR fetcher function
const ordersFetcher = async (url: string) => {
  const [, page] = url.split("?page=");
  const response: PaginatedResponse<Order[]> = await getOrders({
    per_page: PER_PAGE,
    page: page || "1",
  });

  if (response.success && response.data) {
    return {
      data: response.data.data ?? [],
      current_page: response.data.current_page ?? 1,
      per_page: response.data.per_page ?? PER_PAGE,
      total: response.data.total ?? 0,
    };
  } else {
    throw new Error(response.message || "Failed to fetch orders");
  }
};

const OrdersLayout = ({ children }: { children: ReactNode }) => {
  const { t } = useTranslation();
  return (
    <>
      <MyBreadcrumbs
        breadcrumbs={[
          { href: "/my-account/orders", label: t("pageTitle.orders") },
        ]}
      />

      <UserLayout activeTab="orders">
        <div className="w-full">
          <PageHeader
            title={t("pageTitle.orders")}
            subtitle={t("pages.ordersPage.subtitle")}
          />
          {children}
        </div>
      </UserLayout>
    </>
  );
};

// Loading component
const OrdersLoading = () => {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 items-start">
      {Array(PER_PAGE)
        .fill(0)
        .map((_, index) => (
          <OrderCardSkeleton key={index} />
        ))}
    </div>
  );
};

// Error component
const OrdersError = ({ error }: { error: string }) => {
  const { t } = useTranslation();
  return (
    <div className="w-full flex items-center justify-center min-h-[400px]">
      <div className="text-center">
        <div className="text-red-500 text-lg font-medium mb-2">
          {t("pages.ordersPage.errorTitle")}
        </div>
        <p className="text-gray-600 mb-4">{error}</p>
        <Button
          onPress={() => window.location.reload()}
          size="md"
          variant="flat"
          color="warning"
          className="px-4 py-2 text-xs"
        >
          {t("pages.ordersPage.tryAgain")}
        </Button>
      </div>
    </div>
  );
};

// Main orders content component
const OrdersContent = ({ orders }: { orders: OrdersData }) => {
  const router = useRouter();
  return (
    <div className="w-full">
      {/* Orders List */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 items-start">
        {orders.data.map((order: Order) => (
          <OrderCard key={order.id} order={order} />
        ))}
      </div>

      {/* Pagination */}
      {orders.total > orders.per_page && (
        <div className="mt-8 flex justify-center">
          <Pagination
            total={Math.ceil(orders.total / orders.per_page)}
            initialPage={orders.current_page}
            showControls
            size="sm"
            isCompact
            classNames={{
              item: "text-sm",
              cursor: "text-sm",
              next: "text-sm",
              prev: "text-sm",
            }}
            onChange={(page) => {
              router.push({
                pathname: "/my-account/orders",
                query: { ...router.query, page },
              });
            }}
          />
        </div>
      )}
    </div>
  );
};

const OrdersPage: NextPageWithLayout<OrdersPageProps> = ({
  orders: initialOrders,
  error: initialError,
}) => {
  const isServerSide = isSSR();
  const router = useRouter();
  const { t } = useTranslation();

  const [currentPage, setCurrentPage] = useState(
    parseInt(router.query.page as string) || 1
  );

  // Update current page when router query changes
  useEffect(() => {
    const page = parseInt(router.query.page as string) || 1;
    // defer the state update to the next tick
    const timer = setTimeout(() => setCurrentPage(page), 0);
    return () => clearTimeout(timer);
  }, [router.query.page]);

  useEffect(() => {
    updateCartData(true, false);
  }, []);

  // Use SWR for client-side data fetching when not SSR
  const {
    data: swrOrders,
    error: swrError,
    isLoading,
  } = useSWR(
    !isServerSide ? `/api/orders?page=${currentPage}` : null,
    ordersFetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 30000, // 30 seconds
      errorRetryCount: 3,
      errorRetryInterval: 2000,
    }
  );

  // Determine which data to use
  const orders = isServerSide ? initialOrders : swrOrders;
  const error = isServerSide ? initialError : swrError?.message;

  // Handle loading state for client-side
  if (!isServerSide && isLoading && !swrOrders) {
    return (
      <OrdersLayout>
        <PageHead pageTitle={t("pageTitle.orders")} />
        <OrdersLoading />
      </OrdersLayout>
    );
  }

  // Handle error state
  if (error) {
    return (
      <OrdersLayout>
        <PageHead pageTitle={t("pageTitle.orders")} />
        <OrdersError error={error} />
      </OrdersLayout>
    );
  }

  // Handle empty state
  if (!orders?.data || orders.data.length === 0) {
    return (
      <OrdersLayout>
        <PageHead pageTitle={t("pageTitle.orders")} />
        <OrdersEmpty />
      </OrdersLayout>
    );
  }

  // Render main content
  return (
    <OrdersLayout>
      <PageHead pageTitle={t("pageTitle.orders")} />
      <OrdersContent orders={orders} />
    </OrdersLayout>
  );
};

export const getServerSideProps: GetServerSideProps | undefined = isSSR()
  ? async (context) => {
      try {
        const access_token = (await getAccessTokenFromContext(context)) || "";
        const { page = "1" } = context.query;
        await loadTranslations(context);

        if (!access_token) {
          return {
            redirect: {
              destination: "/",
              permanent: false,
            },
          };
        }

        const response: PaginatedResponse<Order[]> = await getOrders({
          access_token: access_token,
          per_page: PER_PAGE,
          page: String(page),
        });

        const settings = await getSettings();

        if (response.success && response.data) {
          return {
            props: {
              orders: {
                data: response.data.data ?? [],
                current_page: response.data.current_page ?? 1,
                per_page: response.data.per_page ?? 15,
                total: response.data.total ?? 0,
              },
              initialSettings: settings.data ?? null,
            },
          };
        } else {
          return {
            props: {
              orders: {
                data: [],
                current_page: 1,
                per_page: PER_PAGE,
                total: 0,
              },
              initialSettings: settings?.data ?? null,
              error: response.message || "Failed to fetch orders",
            },
          };
        }
      } catch (error) {
        console.error("Error fetching orders:", error);

        return {
          props: {
            orders: {
              data: [],
              current_page: 1,
              per_page: PER_PAGE,
              total: 0,
            },
            initialSettings: null,
            error: "Unable to load orders. Please try again later.",
          },
        };
      }
    }
  : undefined;

export default OrdersPage;
