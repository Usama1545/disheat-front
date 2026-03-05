import React from "react";
import NextHead from "next/head";
import { Settings } from "@/types/ApiResponse";
import { getWebSettings } from "@/helpers/getters";
import { siteConfig } from "@/config/site";

interface HeadProps {
  settings: Settings;
}

export const SEOHead = ({ settings }: HeadProps) => {
  const webSettings = getWebSettings(settings as Settings);
  const siteName =
    webSettings?.siteName || siteConfig.name || "Default Site Name";
  const fullTitle = siteName;

  if (!webSettings) {
    return (
      <NextHead>
        <title>{fullTitle}</title>
        <meta name="description" content={siteConfig.description} />
        <meta name="keywords" content={siteConfig.description} />
      </NextHead>
    );
  }
  return (
    <NextHead>
      <title>{fullTitle}</title>
      <link
        rel="icon"
        href={webSettings?.siteFavicon || "/default-favicon.ico"}
        type="image/x-icon"
      />
      <meta
        name="description"
        content={webSettings.metaDescription || "Default meta description"}
      />

      <meta
        name="keywords"
        content={webSettings.metaKeywords || "default, keywords"}
      />
      <meta name="copyright" content={webSettings.siteCopyright} />
      <meta name="author" content={webSettings.supportEmail} />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <meta name="robots" content="index, follow" />
      <meta property="og:title" content={webSettings.siteName} />
      <meta
        property="og:description"
        content={webSettings.metaDescription || "Default meta description"}
      />
      <meta property="og:image" content={webSettings.siteHeaderLogo} />
      <meta
        property="og:url"
        content={typeof window !== "undefined" ? window.location.href : ""}
      />
      <meta name="twitter:card" content="summary_large_image" />
      <meta
        name="twitter:title"
        content={webSettings.siteName || "Default Site Name"}
      />
      <meta
        name="twitter:description"
        content={webSettings.metaDescription || "Default meta description"}
      />
      <meta
        name="twitter:image"
        content={webSettings.siteHeaderLogo || "/fallback-image.png"}
      />

      {webSettings?.headerScript && (
        <div dangerouslySetInnerHTML={{ __html: webSettings.headerScript }} />
      )}
      {webSettings?.footerScript && (
        <div dangerouslySetInnerHTML={{ __html: webSettings.footerScript }} />
      )}
    </NextHead>
  );
};
