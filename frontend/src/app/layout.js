import { Montserrat } from "next/font/google";
import TopBarWrapper from "../components/TopBarWrapper";
import "./globals.css";

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  display: "swap",
});

export const metadata = {
  title: "Animatch",
  description: "Animatch matching & chat platform",
  icons: {
    icon: "/animatch-logo-2.png",
    shortcut: "/animatch-logo-2.png",
    apple: "/animatch-logo-2.png",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${montserrat.variable} antialiased font-sans`}>
        {/* Global TopBar except on login and /profile-setup */}
        <TopBarWrapper />
        {children}
      </body>
    </html>
  );
}
