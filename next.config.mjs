// En GitHub Pages la web cuelga de /meshmind; en local, de la raíz
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Web estática: el modelo corre en el navegador, no hace falta servidor
  output: 'export',
  basePath,
  images: { unoptimized: true },
};

export default nextConfig;
