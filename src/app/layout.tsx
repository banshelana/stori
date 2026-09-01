// The real <html>/<body> live in app/[locale]/layout.tsx, where the
// active locale determines lang and dir. This root layout exists only
// because Next requires one above a dynamic segment.
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
