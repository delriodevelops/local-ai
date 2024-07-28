'use client'
import { Inter } from "next/font/google";
import "./globals.css";
import { useEffect } from "react";

const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({ children }) {
  useEffect(() => {
    const script1 = document.createElement('script');
    script1.src = 'https://unpkg.com/ionicons@7.1.0/dist/ionicons/ionicons.esm.js';
    script1.type = 'module';
    document.body.appendChild(script1);

    const script2 = document.createElement('script');
    script2.src = 'https://unpkg.com/ionicons@7.1.0/dist/ionicons/ionicons.js';
    script2.noModule = true;
    document.body.appendChild(script2);

    return () => {
      document.body.removeChild(script1);
      document.body.removeChild(script2);
    };
  }, []);

  return (
    <html lang="en">
      <body className={inter.className + ' antialiased'} style={{
        backgroundImage: "linear-gradient(to right top, #2f4858, #2c5164, #265b70, #1b657b, #006f85)"
      }}>
        {children}
      </body>
    </html>
  );
}
