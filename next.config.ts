import { withPostHogConfig } from "@posthog/nextjs-config";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
    ]
  }
};

const personalApiKey = process.env.POSTHOG_API_KEY;
const projectId = process.env.POSTHOG_PROJECT_ID;

export default personalApiKey && projectId
  ? withPostHogConfig(nextConfig, {
      personalApiKey,
      projectId,
      host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
      sourcemaps: {
        enabled: true,
        deleteAfterUpload: true,
      },
    })
  : nextConfig;
