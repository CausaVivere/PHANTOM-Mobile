/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
await import("./env.mjs");
//const withTM = require('next-transpile-modules')(['@geist-ui/icons', '@stencil/core', 'react', "@capacitor/push-notifications", "@capacitor/local-notifications","@prisma/client", "@geist-ui/core", "next-auth/react", "@capacitor/app", "next-s3-upload" ]);

/** @type {import("next").NextConfig} */
const config = {
  reactStrictMode: false,
  swcMinify: false,
  serverRuntimeConfig: {
    // Will only be available on the server side
  },
  publicRuntimeConfig: {
    // Will be available on both server and client
    APP_URL: process.env.APP_URL,
    WS_URL: process.env.WS_URL,
  },
  /** We run eslint as a separate task in CI */
  eslint: { ignoreDuringBuilds: !!process.env.CI },
  /**
   * If you have `experimental: { appDir: true }` set, then you must comment the below `i18n` config
   * out.
   *
   * @see https://github.com/vercel/next.js/issues/41980
   */
  // i18n: {
  //   locales: ["en"],
  //   defaultLocale: "en",
  // },
  images: {
    domains: [
      `${process.env.S3_UPLOAD_BUCKET}.s3.amazonaws.com`,
      `${process.env.S3_UPLOAD_BUCKET}.s3.${process.env.S3_UPLOAD_REGION}.amazonaws.com`,
    ],
    unoptimized: true,
  },
  transpilePackages: [
    "@geist-ui/icons",
    "@stencil/core",
    "react",
    "@capacitor/push-notifications",
    "@capacitor/local-notifications",
    "@capacitor/clipboard",
    "@prisma/client",
    "@geist-ui/core",
    "next-auth/react",
    "@capacitor/app",
    "@capacitor/keyboard",
    "next-s3-upload",
    "~/components/drawers/directMessage",
    "https",
    "fs",
  ],
  crossOrigin: "anonymous",
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Access-Control-Allow-Credentials", value: "true" },
          {
            key: "Access-Control-Allow-Origin",
            value: "https://phantomlive.space",
          },
          {
            key: "Access-Control-Allow-Methods",
            value: "GET,OPTIONS,PATCH,DELETE,POST,PUT",
          },
          {
            key: "Access-Control-Allow-Headers",
            value:
              "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version",
          },
        ],
      },
    ];
  },
};

// module.exports = config;
export default config;
// const config = {
//   reactStrictMode: true,

//   /**
//    * If you have `experimental: { appDir: true }` set, then you must comment the below `i18n` config
//    * out.
//    *
//    * @see https://github.com/vercel/next.js/issues/41980
//    */
//   i18n: {
//     locales: ["en"],
//     defaultLocale: "en",
//   },
// };
// export default config;
