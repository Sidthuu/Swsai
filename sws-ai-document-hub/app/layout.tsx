import "./globals.css";
import { Livvic } from "next/font/google";

const livvic = Livvic({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={livvic.className}>
        {children}
      </body>
    </html>
  );
}