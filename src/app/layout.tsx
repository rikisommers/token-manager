import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AppSidebar } from "@/components/AppSidebar";
import { AppHeader } from "@/components/AppHeader";
import { CollectionProvider } from "@/context/CollectionContext";

const inter = Inter({
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Design Token Manager",
  description: "Visual design token editor and manager",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased`}>
        <CollectionProvider>
          <div className="flex h-screen overflow-hidden bg-gray-50">
            <div className="w-[200px] flex-shrink-0">
              <AppSidebar />
            </div>
            <div className="flex-1 flex flex-col overflow-hidden">
              <AppHeader />
              <main className="flex-1 overflow-y-auto">
                {children}
              </main>
            </div>
          </div>
        </CollectionProvider>
      </body>
    </html>
  );
}
