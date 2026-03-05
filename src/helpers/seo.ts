import { Product, Store } from "@/types/ApiResponse";

/**
 * Generates canonical URL for a page
 */
export const getCanonicalUrl = (path: string, baseUrl?: string): string => {
  const base = baseUrl || process.env.NEXT_PUBLIC_SITE_URL || "";
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${base}${cleanPath}`.replace(/\/$/, ""); // Remove trailing slash
};

/**
 * Generates Product structured data (JSON-LD)
 */
export const generateProductSchema = (
  product: Product,
  baseUrl?: string
): object => {
  const url = getCanonicalUrl(`/products/${product.slug}`, baseUrl);

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    description: product.short_description || product.description,
    image: product.main_image,
    sku: product.uuid,
    brand: product.brand_name
      ? {
          "@type": "Brand",
          name: product.brand_name,
        }
      : undefined,
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "USD", // TODO: Get from settings
      lowPrice:
        product.variants?.[0]?.special_price ||
        product.variants?.[0]?.price ||
        0,
      highPrice: product.variants?.[product.variants.length - 1]?.price || 0,
      availability: product.variants?.some((v) => v.stock > 0)
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      url: url,
    },
    aggregateRating:
      product.rating_count > 0
        ? {
            "@type": "AggregateRating",
            ratingValue: product.ratings,
            reviewCount: product.rating_count,
            bestRating: 5,
            worstRating: 1,
          }
        : undefined,
    url: url,
    category: product.category_name,
  };
};

/**
 * Generates BreadcrumbList structured data
 */
export const generateBreadcrumbSchema = (
  items: Array<{ name: string; url: string }>,
  baseUrl?: string
): object => {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: getCanonicalUrl(item.url, baseUrl),
    })),
  };
};

/**
 * Generates LocalBusiness structured data for stores
 */
export const generateStoreSchema = (store: Store, baseUrl?: string): object => {
  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: store.name,
    description: store.description,
    image: store.logo,
    url: getCanonicalUrl(`/stores/${store.slug}`, baseUrl),
    telephone: store.contact_number,
    email: store.contact_email,
    address: store.address
      ? {
          "@type": "PostalAddress",
          streetAddress: store.address,
        }
      : undefined,
  };
};

/**
 * Generates Organization structured data
 */
export const generateOrganizationSchema = (
  siteName: string,
  siteDescription: string,
  logo: string,
  baseUrl?: string
): object => {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: siteName,
    description: siteDescription,
    url: getCanonicalUrl("/", baseUrl),
    logo: logo,
    sameAs: [
      // Add social media links if available
    ],
  };
};

/**
 * Generates WebSite structured data with search action
 */
export const generateWebsiteSchema = (
  siteName: string,
  baseUrl?: string
): object => {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteName,
    url: getCanonicalUrl("/", baseUrl),
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${getCanonicalUrl("/products/search", baseUrl)}?search={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
};

/**
 * Generates CollectionPage structured data for category/brand pages
 */
export const generateCollectionSchema = (
  name: string,
  description: string,
  url: string,
  baseUrl?: string
): object => {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: name,
    description: description,
    url: getCanonicalUrl(url, baseUrl),
  };
};

/**
 * Generates FAQ structured data
 */
export const generateFAQSchema = (
  faqs: Array<{ question: string; answer: string }>
): object => {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };
};

/**
 * Truncates text to specified length with ellipsis
 */
export const truncateText = (text: string, maxLength: number): string => {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + "...";
};

/**
 * Strips HTML tags from text
 */
export const stripHtmlTags = (html: string): string => {
  if (!html) return "";
  return html.replace(/<[^>]*>/g, "");
};

/**
 * Generates meta description from content
 */
export const generateMetaDescription = (
  content: string,
  maxLength: number = 160
): string => {
  const cleanContent = stripHtmlTags(content);
  return truncateText(cleanContent, maxLength);
};

/**
 * Generate keywords from text
 */
export const generateKeywords = (text: string, limit: number = 10): string => {
  if (!text) return "";

  const words = text
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .split(/\s+/)
    .filter((word) => word.length > 3);

  // Get unique words
  const uniqueWords = [...new Set(words)];

  return uniqueWords.slice(0, limit).join(", ");
};

/**
 * Generate product meta tags
 */
export const generateProductMeta = (product: Product) => {
  const description = generateMetaDescription(
    product.short_description || product.description,
    160
  );

  const keywords = [
    product.title,
    product.category_name,
    product.brand_name,
    ...product.tags,
  ]
    .filter(Boolean)
    .join(", ");

  return {
    title: product.title,
    description,
    keywords,
    image: product.main_image,
  };
};

/**
 * Generate category/brand meta tags
 */
export const generateCollectionMeta = (
  name: string,
  description: string,
  image?: string
) => {
  const metaDescription = generateMetaDescription(description, 160);
  const keywords = generateKeywords(`${name} ${description}`);

  return {
    title: name,
    description: metaDescription,
    keywords,
    image,
  };
};
