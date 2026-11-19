import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    // Releases deploy commits without bumping package.json, so the profile footer
    // names the deployed commit (Amplify sets AWS_COMMIT_ID; CI sets GITHUB_SHA).
    NEXT_PUBLIC_BUILD_COMMIT: (process.env.AWS_COMMIT_ID ?? process.env.GITHUB_SHA ?? "").slice(
      0,
      7
    ),
  },
};

export default nextConfig;
