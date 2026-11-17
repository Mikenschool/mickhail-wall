import "./globals.css";

export const metadata = {
  title: "Mickhail's Wall",
  description: "A 2008-style wall built with React, Next.js and Supabase. Write on it.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
