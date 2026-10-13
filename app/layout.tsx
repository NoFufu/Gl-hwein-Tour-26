import type { Metadata, Viewport } from 'next';
import '@fontsource-variable/fraunces';
import '@fontsource-variable/instrument-sans';
import '@fontsource-variable/bricolage-grotesque';
import '@fontsource-variable/fredoka';
import '@fontsource-variable/outfit';
import '@fontsource-variable/playfair-display';
import '@fontsource-variable/playfair-display/wght-italic.css';
import 'maplibre-gl/dist/maplibre-gl.css';
import './app.css';
import './welcome.css';
import PwaRegister from '../components/PwaRegister';
import { asset } from '../lib/asset';
import { themeBootScript } from '../lib/themes';
export const metadata: Metadata = {
  title: 'Glühwein Tour 26',
  description: 'Deine winterliche Glühwein-Tour durch Bielefeld.',
  manifest: asset('/manifest.webmanifest'),
  icons: { icon: asset('/favicon.svg'), apple: asset('/apple-touch-icon.png') },
  appleWebApp: { capable: true, title: 'Glühwein 26', statusBarStyle: 'black-translucent' },
  formatDetection: { telephone: false },
};
export const viewport: Viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover', themeColor: '#120e16' };
export default function RootLayout({children}: Readonly<{children: React.ReactNode}>) { return <html lang="de" data-ui="2026" suppressHydrationWarning><head><script dangerouslySetInnerHTML={{ __html: themeBootScript }} /></head><body>{children}<PwaRegister /></body></html> }
