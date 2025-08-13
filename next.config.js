/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable source maps in production to reduce bundle size
  productionBrowserSourceMaps: false,

  // Enable SWC minifier for better performance
  swcMinify: true,

  webpack: (config) => {
    // Audio file handling
    config.module.rules.push({
      test: /\.(mp3|wav|ogg)$/,
      type: 'asset/resource',
    });

    return config;
  },

  // Experimental features for better performance
  experimental: {
    optimizeCss: true,
  },
}

module.exports = {
  experimental: {
    optimizeCss: true,
  },
};