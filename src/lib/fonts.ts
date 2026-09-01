import localFont from "next/font/local";

// ---------------------------------------------------------------
// Fonts are vendored under /public/fonts and loaded from disk — no
// request ever leaves the machine, at build time or at runtime.
//
// Vazirmatn is a variable font carrying BOTH Latin and Persian
// glyphs in a single file, so one download serves both locales.
//
// To swap in a licensed IRANYekan: drop the .woff2 files into
// public/fonts/ and replace the `src` array of `fontFa` below. The
// CSS variable name stays the same, so nothing else has to change.
// ---------------------------------------------------------------

export const fontFa = localFont({
  src: [
    {
      path: "../../public/fonts/Vazirmatn-Variable.woff2",
      weight: "100 900",
      style: "normal",
    },
  ],
  variable: "--font-fa",
  display: "swap",
  // Rendered before the webfont settles; Tahoma ships with Windows and
  // has usable Persian coverage, which keeps the fallback readable.
  fallback: ["Tahoma", "Segoe UI", "sans-serif"],
  adjustFontFallback: false,
});

export const fontEn = localFont({
  src: [
    {
      path: "../../public/fonts/Vazirmatn-Variable.woff2",
      weight: "100 900",
      style: "normal",
    },
  ],
  variable: "--font-en",
  display: "swap",
  fallback: ["Segoe UI", "system-ui", "sans-serif"],
  adjustFontFallback: false,
});
