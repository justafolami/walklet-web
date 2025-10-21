import "./globals.css";
import Providers from "./providers";

export const metadata = {
  title: "Walklet",
  description: "Move-and-Eat-to-Earn on Base",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        style={{
          background: "linear-gradient(135deg, #E0F7FA 0%, #FFF3E0 100%)",
          minHeight: "100vh",
        }}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
