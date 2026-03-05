import { UserLocation } from "@/components/Location/types/LocationAutoComplete.types";
import { isSSR } from "@/helpers/getters";
import { getCookie } from "@/lib/cookies";
import { useCallback, useEffect, useRef, useState } from "react";
import useSWR from "swr";

interface UseInfiniteDataProps<T> {
  fetcher: (params: {
    page: number;
    per_page: number;
    [key: string]: any;
  }) => Promise<any>;

  perPage?: number;
  initialData?: T[];
  initialTotal?: number;
  extraParams?: {
    [key: string]: any;
  };
  passLocation?: boolean;
  forceFetchOnMount?: boolean;
  dataKey?: string | null;
}

export const useInfiniteData = <T>({
  fetcher,
  perPage = 24,
  initialData = [],
  initialTotal = 0,
  extraParams = {},
  passLocation = false,
  forceFetchOnMount = false,
  dataKey = null,
}: UseInfiniteDataProps<T>) => {
  const [data, setData] = useState<T[]>(initialData);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(initialTotal);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(initialData.length < initialTotal);

  // Add this state to track if we're in the initial sync phase
  const [isSyncing, setIsSyncing] = useState(!isSSR());

  const isLoadingRef = useRef(false);
  const currentPageRef = useRef(1);

  const {
    data: swrResponse,
    isLoading: isInitialLoading,
    isValidating,
    error,
    mutate,
  } = useSWR(
    dataKey ? `/infinite-data-${dataKey}` : "/infinite-data",
    async () => {
      const { lat = "", lng = "" } =
        (getCookie("userLocation") as UserLocation) || {};
      const location = passLocation ? { latitude: lat, longitude: lng } : {};
      const res = await fetcher({
        page: 1,
        per_page: perPage,
        ...extraParams,
        ...location,
      });
      if (res.success) {
        return res.data;
      }
      console.error("Failed to fetch initial data");
      return [];
    },
    {
      revalidateOnFocus: !isSSR(),
      revalidateOnMount: forceFetchOnMount ? forceFetchOnMount : !isSSR(),
    }
  );

  useEffect(() => {
    if (swrResponse) {
      const items = swrResponse?.data || [];
      const totalItems = swrResponse?.total || 0;
      setData(items);
      setTotal(totalItems);
      setHasMore(items.length < totalItems);
      setPage(1);
      currentPageRef.current = 1;
      isLoadingRef.current = false;
      setIsSyncing(false);
    }
  }, [swrResponse]);

  const loadMore = useCallback(async () => {
    if (isLoadingRef.current || !hasMore) {
      return;
    }

    const nextPage = page + 1;

    if (currentPageRef.current >= nextPage) {
      return;
    }

    setIsLoadingMore(true);
    isLoadingRef.current = true;
    currentPageRef.current = nextPage;

    const { lat = "", lng = "" } = getCookie("userLocation") as UserLocation;
    const location = passLocation ? { latitude: lat, longitude: lng } : {};

    try {
      const res = await fetcher({
        page: nextPage,
        per_page: perPage,
        ...extraParams,
        ...location,
      });

      if (res.success) {
        const newItems = res.data?.data || [];
        const newTotal = res.data?.total || 0;

        setData((prev) => [...prev, ...newItems]);
        setPage(nextPage);
        setTotal(newTotal);
        setHasMore(data.length + newItems.length < newTotal);
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error("Load more failed", error);
      setHasMore(false);
      currentPageRef.current = page;
    } finally {
      setIsLoadingMore(false);
      isLoadingRef.current = false;
    }
  }, [page, perPage, extraParams, hasMore, fetcher, data.length, passLocation]);

  const refetch = useCallback(async () => {
    setPage(1);
    currentPageRef.current = 1;
    isLoadingRef.current = false;
    setIsLoadingMore(false);
    setIsSyncing(true);

    await mutate();
  }, [mutate]);

  return {
    data,
    isLoading: isInitialLoading || isSyncing, // Combine both states
    isLoadingMore,
    hasMore,
    total,
    loadMore,
    error,
    refetch,
    isValidating,
  };
};
