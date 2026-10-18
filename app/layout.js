import "./globals.css";

export const metadata = {
  title: "Smart Print Center",
  description: "Upload documents and request prints online.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
