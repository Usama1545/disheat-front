import { FC } from "react";
import useSWR from "swr";
import { Swiper, SwiperSlide } from "swiper/react";

import { Autoplay } from "swiper/modules";
import { Card, Image, Skeleton } from "@heroui/react";
import { getBannerImages } from "@/routes/api";
import { getActiveCategory, isSSR } from "@/helpers/getters";
import { BannerData } from "@/types/ApiResponse";
import Link from "next/link";
import { getCookie } from "@/lib/cookies";
import { UserLocation } from "@/components/Location/types/LocationAutoComplete.types";
import { useScreenType } from "@/hooks/useScreenType";
import { useTranslation } from "react-i18next";
import { isRTL } from "@/helpers/functionalHelpers";

type HomeTopSliderProps = {
  initialBanners?: BannerData;
};

// Fetcher function for SWR
const fetcher = async () => {
  const scopeCategorySlug = getActiveCategory();

  const location = getCookie("userLocation") as UserLocation | undefined;
  const { lat = "", lng = "" } = location || {};

  if (!lat || !lng) {
    return { top: [], carousel: [] };
  }

  const response = await getBannerImages({
    scope_category_slug: scopeCategorySlug,
    per_page: 50,
    latitude: lat,
    longitude: lng,
  });

  if (!response.success || !response.data) {
    console.error(response.message || "Failed to fetch banner images");
  }

  return response.data?.data ?? { top: [], carousel: [] };
};

const HomeTopSlider: FC<HomeTopSliderProps> = ({
  initialBanners = { top: [], carousel: [] },
}) => {
  const screen = useScreenType();
  const { i18n } = useTranslation();
  const currentLang = i18n.resolvedLanguage || i18n.language;
  const rtl = isRTL(currentLang);

  const {
    data: bannerImages,
    isLoading,
    isValidating,
    mutate,
  } = useSWR("/banners", fetcher, {
    fallbackData: isSSR() ? initialBanners : undefined,
    revalidateOnFocus: false,
    revalidateOnMount: !isSSR(),
  });

  console.log("bannerImages", bannerImages);

  if (isLoading || !bannerImages || isValidating) {
    return (
      <div className="w-full my-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4">
          {/* Mobile – 1 skeleton */}
          <Skeleton className="w-full aspect-409/240 rounded-lg animate-pulse block sm:hidden" />
        </div>
      </div>
    );
  }

  const shouldHide = bannerImages?.top?.length === 0;
  console.log("shouldHide", shouldHide);

  return (
    <section id="home-slider" className="w-full">
      {!shouldHide && (
        <div className="w-full">
          <Swiper
            key={rtl ? "rtl-hs" : "ltr-hs"}
            dir={rtl ? "rtl" : "ltr"}
            modules={[Autoplay]}
            // autoplay={{ delay: 2000 }}
            loop={true}
            spaceBetween={12}
            slidesPerView={1}
            breakpoints={{
              315: {
                slidesPerView: 1,
              },
              640: {
                slidesPerView: 1,
              },
              1024: {
                slidesPerView: 1,
              },
            }}
            className="shadow-none border-none overflow-hidden rounded-none w-full max-w-full"
          >
            {bannerImages?.top &&
              bannerImages.top.map((banner) => (
                <SwiperSlide key={banner.id}>
                  <Card
                    className="border-none w-full max-w-full" // Add w-full and max-w-full
                    radius="none"
                    fullWidth={true}
                    isPressable={true}
                    as={Link}
                    shadow="none"
                    href={
                      banner.type === "brand"
                        ? `/brands/${banner.brand_slug}`
                        : banner.type === "category"
                          ? `/categories/${banner.category_slug}`
                          : banner.type === "product"
                            ? `/products/${banner.product_slug}`
                            : banner.type === "custom" && banner.custom_url
                              ? banner.custom_url
                              : "#"
                    }
                  >
                    <Image
                      src={banner.banner_image}
                      alt={banner.title}
                      radius="none"
                      loading="lazy"
                      removeWrapper={false}
                      className="!opacity-100 w-full h-full object-cover"
                      classNames={{
                        wrapper: "!w-full !max-w-full",
                      }}
                    />
                  </Card>
                </SwiperSlide>
              ))}
          </Swiper>
        </div>
      )}
    </section>
  );
};

export default HomeTopSlider;
