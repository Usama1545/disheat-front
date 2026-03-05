import type { AppProps } from "next/app";
import { HeroUIProvider } from "@heroui/system";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { useRouter } from "next/router";
import dynamic from "next/dynamic";
import { useEffect } from "react";
import ReduxProvider from "@/lib/redux/ReduxProvider";
import DefaultLayout from "@/layouts/default";
import { NextPageWithLayout } from "@/types";
import { fontSans, fontMono } from "@/config/fonts";
import { trackPageView } from "@/lib/analytics";
import "@/styles/index.css";
import { CircleX } from "lucide-react";
import i18n from "../../i18n";
import Script from "next/script";

const ToastProvider = dynamic(
  () => import("@heroui/react").then((mod) => mod.ToastProvider),
  { ssr: false },
);

const ProgressBar = dynamic(() => import("@/components/ProgressBar"), {
  ssr: false,
});

type AppPropsWithLayout = AppProps & {
  Component: NextPageWithLayout;
};

function App({ Component, pageProps }: AppPropsWithLayout) {
  const router = useRouter();

  useEffect(() => {
    const currentLang = i18n.language;

    if (currentLang === "ar") {
      document.documentElement.setAttribute("dir", "rtl");
      document.documentElement.setAttribute("lang", "ar");
    } else {
      document.documentElement.setAttribute("dir", "ltr");
      document.documentElement.setAttribute("lang", currentLang);
    }
  }, []);

  useEffect(() => {
    const handleRouteChange = (url: string) => {
      const pageTitle = document.title || url;
      trackPageView(url, pageTitle);
    };

    handleRouteChange(router.pathname);

    router.events.on("routeChangeComplete", handleRouteChange);

    return () => {
      router.events.off("routeChangeComplete", handleRouteChange);
    };
  }, [router.events, router.pathname]);

  const getLayout =
    Component.getLayout ??
    ((page) => (
      <DefaultLayout initialSettings={pageProps?.initialSettings}>
        {page}
      </DefaultLayout>
    ));

  return (
    <HeroUIProvider navigate={router.push}>
      <Script
        src={`https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&v=weekly&libraries=marker`}
        strategy="afterInteractive"
      />

      <NextThemesProvider
        defaultTheme="system"
        attribute="class"
        disableTransitionOnChange
      >
        <ProgressBar />

        <ToastProvider
          placement="top-right"
          toastOffset={10}
          toastProps={{
            classNames: {
              base: "pr-6",
            },
            timeout: 4000,
            closeIcon: (
              <CircleX
                size={34}
                strokeWidth={2.5}
                className="text-foreground/25"
              />
            ),
          }}
        />

        <ReduxProvider>{getLayout(<Component {...pageProps} />)}</ReduxProvider>
      </NextThemesProvider>
    </HeroUIProvider>
  );
}

export default App;

export const fonts = {
  sans: fontSans.style.fontFamily,
  mono: fontMono.style.fontFamily,
};
