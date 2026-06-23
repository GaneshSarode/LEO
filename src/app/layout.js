import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata = {
  title: 'LEO — The Last-Minute Life Saver',
  description:
    'AI-powered productivity companion that proactively helps you plan, prioritize, and complete tasks before deadlines. Built with Google Gemini.',
  keywords: ['productivity', 'AI', 'task manager', 'Gemini', 'planner', 'deadline'],
  openGraph: {
    title: 'LEO — The Last-Minute Life Saver',
    description: 'AI-powered productivity companion built with Google Gemini',
    type: 'website',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={inter.variable}>
      <head>
        <meta name="theme-color" content="#0f1117" />
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body>{children}</body>
    </html>
  );
}
