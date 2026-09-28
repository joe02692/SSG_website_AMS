import type { MetadataRoute } from "next";

/** Lets phones "Add to Home Screen" with the group's name, colours and logo. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "El-Salam Scouting Group",
    short_name: "El-Salam Scouts",
    description: "El-Salam Scouting Group — scouts, leaders and families since 1977.",
    start_url: "/",
    display: "standalone",
    background_color: "#fff9ea",
    theme_color: "#1e4428",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
