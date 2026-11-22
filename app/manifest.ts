import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Perkly — Loyalty Pass Wallet',
    short_name: 'Perkly Wallet',
    description: 'Digital loyalty cards, rewards, and stamp collection in one phone wallet.',
    start_url: '/wallet',
    display: 'standalone',
    background_color: '#0d3b26',
    theme_color: '#0d3b26',
    icons: [
      {
        src: '/favicon.ico',
        sizes: 'any',
        type: 'image/x-icon'
      }
    ]
  };
}
