import { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/dashboard",
          "/admin",
          "/api/",
          "/panel",
          "/mi-cuenta",
          "/afiliados",
          "/login",
          "/register",
        ],
      },
    ],
    sitemap: siteUrl("/sitemap.xml"),
  };
}
