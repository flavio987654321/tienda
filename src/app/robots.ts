import { MetadataRoute } from "next";

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
    sitemap: "https://tiendaapps.com/sitemap.xml",
  };
}
