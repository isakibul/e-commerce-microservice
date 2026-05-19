import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Commerce Auth Console",
  description: "Frontend for the e-commerce microservice auth flow.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
