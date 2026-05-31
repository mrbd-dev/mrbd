/** @type {import('next').NextConfig} */
const nextConfig = {
  // The /build preview and on-glasses testing load this app from a sandbox or
  // tunnel origin (e.g. https://<id>.vercel.run or https://<slug>.mrbd.host)
  // while `next dev` runs inside the sandbox. Allow those cross-origin dev
  // asset / HMR requests so Hot Module Replacement can connect instead of being
  // blocked by Next's dev-origin check.
  allowedDevOrigins: ["*.vercel.run", "*.mrbd.host"],
};

export default nextConfig;
