import "./globals.css";

export const metadata = {
  title: "Smart Print Center",
  description: "Upload documents and request prints online.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
