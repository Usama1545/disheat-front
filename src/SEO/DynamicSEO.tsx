import NextHead from "next/head";
import React from "react";
import { useSettings } from "@/contexts/SettingsContext";
import { siteConfig } from "@/config/site";
import { getCanonicalUrl } from "@/helpers/seo";

export interface SEOProps {
  // Basic Meta Tags
  title?: string;
  description?: string;
  keywords?: string;
  author?: string;

  // Canonical & Alternate
  canonical?: string;

  // Open Graph
  ogType?: "website" | "article" | "product" | "profile";
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  ogImageAlt?: string;
  ogUrl?: string;
  ogSiteName?: string;

  // Twitter Card
  twitterCard?: "summary" | "summary_large_image" | "app" | "player";
  twitterTitle?: string;
  twitterDescription?: string;
  twitterImage?: string;
  twitterImageAlt?: string;
  twitterSite?: string;
  twitterCreator?: string;

  // Additional Meta
  robots?: string;
  googlebot?: string;

  // Product Specific (for ecommerce)
  productPrice?: string;
  productCurrency?: string;
  productAvailability?: "in stock" | "out of stock" | "preorder";
  productCondition?: "new" | "used" | "refurbished";

  // Structured Data (JSON-LD)
  jsonLd?: object | object[];

  // Additional Head Elements
  children?: React.ReactNode;
}

const DynamicSEO: React.FC<SEOProps> = ({
  title,
  description,
  keywords,
  author,
  canonical,
  ogType = "website",
  ogTitle,
  ogDescription,
  ogImage,
  ogImageAlt,
  ogUrl,
  ogSiteName,
  twitterCard = "summary_large_image",
  twitterTitle,
  twitterDescription,
  twitterImage,
  twitterImageAlt,
  twitterSite,
  twitterCreator,
  robots = "index, follow",
  googlebot,
  productPrice,
  productCurrency,
  productAvailability,
  productCondition,
  jsonLd,
  children,
}) => {
  const { webSettings } = useSettings();

  // Get defaults from settings or config
  const siteName = webSettings?.siteName || siteConfig.name;
  const siteDescription =
    webSettings?.metaDescription || siteConfig.metaDescription;
  const siteKeywords = webSettings?.metaKeywords || siteConfig.metaKeywords;
  const siteLogo = webSettings?.siteHeaderLogo || "/logo.png";
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "";

  // Compute final values
  const finalTitle = title ? `${title} | ${siteName}` : siteName;
  const finalDescription = description || siteDescription;
  const finalKeywords = keywords || siteKeywords;
  const finalAuthor = author || webSettings?.supportEmail || "";
  const finalCanonical = canonical ? getCanonicalUrl(canonical, baseUrl) : "";

  // Open Graph defaults
  const finalOgTitle = ogTitle || title || siteName;
  const finalOgDescription = ogDescription || finalDescription;
  const finalOgImage = ogImage || siteLogo;
  const finalOgUrl = ogUrl || finalCanonical;
  const finalOgSiteName = ogSiteName || siteName;

  // Twitter defaults
  const finalTwitterTitle = twitterTitle || finalOgTitle;
  const finalTwitterDescription = twitterDescription || finalOgDescription;
  const finalTwitterImage = twitterImage || finalOgImage;

  return (
    <NextHead>
      {/* Basic Meta Tags */}
      <title>{finalTitle}</title>
      <meta name="description" content={finalDescription} />
      {finalKeywords && <meta name="keywords" content={finalKeywords} />}
      {finalAuthor && <meta name="author" content={finalAuthor} />}

      {/* Viewport & Mobile */}
      <meta
        name="viewport"
        content="width=device-width, initial-scale=1.0, maximum-scale=5.0"
      />
      <meta name="mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-status-bar-style" content="default" />

      {/* Robots */}
      <meta name="robots" content={robots} />
      {googlebot && <meta name="googlebot" content={googlebot} />}

      {/* Canonical URL */}
      {finalCanonical && <link rel="canonical" href={finalCanonical} />}

      {/* Favicon */}
      {webSettings?.siteFavicon && (
        <link rel="icon" href={webSettings.siteFavicon} type="image/x-icon" />
      )}

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={ogType} />
      <meta property="og:title" content={finalOgTitle} />
      <meta property="og:description" content={finalOgDescription} />
      {finalOgImage && <meta property="og:image" content={finalOgImage} />}
      {ogImageAlt && <meta property="og:image:alt" content={ogImageAlt} />}
      {finalOgUrl && <meta property="og:url" content={finalOgUrl} />}
      <meta property="og:site_name" content={finalOgSiteName} />
      <meta property="og:locale" content="en_US" />

      {/* Twitter Card */}
      <meta name="twitter:card" content={twitterCard} />
      <meta name="twitter:title" content={finalTwitterTitle} />
      <meta name="twitter:description" content={finalTwitterDescription} />
      {finalTwitterImage && (
        <meta name="twitter:image" content={finalTwitterImage} />
      )}
      {twitterImageAlt && (
        <meta name="twitter:image:alt" content={twitterImageAlt} />
      )}
      {twitterSite && <meta name="twitter:site" content={twitterSite} />}
      {twitterCreator && (
        <meta name="twitter:creator" content={twitterCreator} />
      )}

      {/* Product Meta Tags (for ecommerce) */}
      {productPrice && productCurrency && (
        <>
          <meta property="product:price:amount" content={productPrice} />
          <meta property="product:price:currency" content={productCurrency} />
        </>
      )}
      {productAvailability && (
        <meta property="product:availability" content={productAvailability} />
      )}
      {productCondition && (
        <meta property="product:condition" content={productCondition} />
      )}

      {/* Copyright */}
      {webSettings?.siteCopyright && (
        <meta name="copyright" content={webSettings.siteCopyright} />
      )}

      {/* Structured Data (JSON-LD) */}
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(Array.isArray(jsonLd) ? jsonLd : [jsonLd]),
          }}
        />
      )}

      {/* Custom Scripts */}
      {webSettings?.headerScript && (
        <div dangerouslySetInnerHTML={{ __html: webSettings.headerScript }} />
      )}

      {/* Additional custom elements */}
      {children}
    </NextHead>
  );
};

export default DynamicSEO;
