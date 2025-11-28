import { Montserrat } from "next/font/google";
import TopBarWrapper from "../components/TopBarWrapper";
import Providers from "./providers";
import "./globals.css";

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  display: "swap",
});

export const metadata = {
  title: "AniMatch",
  description: "Find your perfect campus match",
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${montserrat.variable} antialiased font-sans`}>
        <Providers>
          {/* Global TopBar except on login and /profile-setup */}
          <TopBarWrapper />
          {children}
        </Providers>
      </body>
    </html>
  );
}
