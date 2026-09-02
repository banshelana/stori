import type { Locale } from "@/i18n/config";

// ---------------------------------------------------------------
// Country / Province / City reference data.
//
// Kept strictly hierarchical (city -> province -> country) so the
// address form can only ever produce a valid combination. Names are
// stored per-locale because place names are themselves translated.
//
// Phase 2 swaps this for GET /geo/countries|provinces|cities; the
// shapes below are what the API is expected to return.
// ---------------------------------------------------------------

export interface GeoName {
  en: string;
  fa: string;
}

export interface Country {
  id: string;
  iso2: string;
  dialCode: string;
  name: GeoName;
}

export interface Province {
  id: string;
  countryId: string;
  name: GeoName;
}

export interface City {
  id: string;
  provinceId: string;
  name: GeoName;
  /** Decimal degrees. Used to centre the map picker on a chosen city. */
  lat?: number;
  lon?: number;
}

export const COUNTRIES: Country[] = [
  { id: "ir", iso2: "IR", dialCode: "+98", name: { en: "Iran", fa: "ایران" } },
  { id: "de", iso2: "DE", dialCode: "+49", name: { en: "Germany", fa: "آلمان" } },
  { id: "tr", iso2: "TR", dialCode: "+90", name: { en: "Türkiye", fa: "ترکیه" } },
];

export const PROVINCES: Province[] = [
  // Iran
  { id: "ir-thr", countryId: "ir", name: { en: "Tehran", fa: "تهران" } },
  { id: "ir-esf", countryId: "ir", name: { en: "Isfahan", fa: "اصفهان" } },
  { id: "ir-fas", countryId: "ir", name: { en: "Fars", fa: "فارس" } },
  { id: "ir-rkh", countryId: "ir", name: { en: "Razavi Khorasan", fa: "خراسان رضوی" } },
  { id: "ir-eaz", countryId: "ir", name: { en: "East Azerbaijan", fa: "آذربایجان شرقی" } },
  { id: "ir-gil", countryId: "ir", name: { en: "Gilan", fa: "گیلان" } },
  // Germany
  { id: "de-be", countryId: "de", name: { en: "Berlin", fa: "برلین" } },
  { id: "de-by", countryId: "de", name: { en: "Bavaria", fa: "باواریا" } },
  { id: "de-nw", countryId: "de", name: { en: "North Rhine-Westphalia", fa: "نوردراین-وستفالن" } },
  // Türkiye
  { id: "tr-34", countryId: "tr", name: { en: "Istanbul", fa: "استانبول" } },
  { id: "tr-06", countryId: "tr", name: { en: "Ankara", fa: "آنکارا" } },
];

export const CITIES: City[] = [
  // Tehran
  { id: "ir-thr-tehran", provinceId: "ir-thr", name: { en: "Tehran", fa: "تهران" }, lat: 35.6892, lon: 51.389 },
  { id: "ir-thr-karaj", provinceId: "ir-thr", name: { en: "Karaj", fa: "کرج" }, lat: 35.8355, lon: 50.9915 },
  { id: "ir-thr-shahriar", provinceId: "ir-thr", name: { en: "Shahriar", fa: "شهریار" }, lat: 35.6592, lon: 51.0576 },
  { id: "ir-thr-varamin", provinceId: "ir-thr", name: { en: "Varamin", fa: "ورامین" }, lat: 35.3242, lon: 51.6459 },
  // Isfahan
  { id: "ir-esf-isfahan", provinceId: "ir-esf", name: { en: "Isfahan", fa: "اصفهان" }, lat: 32.6546, lon: 51.668 },
  { id: "ir-esf-kashan", provinceId: "ir-esf", name: { en: "Kashan", fa: "کاشان" }, lat: 33.9831, lon: 51.4364 },
  { id: "ir-esf-najafabad", provinceId: "ir-esf", name: { en: "Najafabad", fa: "نجف‌آباد" }, lat: 32.634, lon: 51.3665 },
  // Fars
  { id: "ir-fas-shiraz", provinceId: "ir-fas", name: { en: "Shiraz", fa: "شیراز" }, lat: 29.5918, lon: 52.5837 },
  { id: "ir-fas-marvdasht", provinceId: "ir-fas", name: { en: "Marvdasht", fa: "مرودشت" }, lat: 29.8742, lon: 52.8025 },
  // Razavi Khorasan
  { id: "ir-rkh-mashhad", provinceId: "ir-rkh", name: { en: "Mashhad", fa: "مشهد" }, lat: 36.2605, lon: 59.6168 },
  { id: "ir-rkh-neyshabur", provinceId: "ir-rkh", name: { en: "Neyshabur", fa: "نیشابور" }, lat: 36.2133, lon: 58.7958 },
  // East Azerbaijan
  { id: "ir-eaz-tabriz", provinceId: "ir-eaz", name: { en: "Tabriz", fa: "تبریز" }, lat: 38.0962, lon: 46.2738 },
  { id: "ir-eaz-maragheh", provinceId: "ir-eaz", name: { en: "Maragheh", fa: "مراغه" }, lat: 37.3925, lon: 46.2389 },
  // Gilan
  { id: "ir-gil-rasht", provinceId: "ir-gil", name: { en: "Rasht", fa: "رشت" }, lat: 37.2808, lon: 49.5832 },
  { id: "ir-gil-anzali", provinceId: "ir-gil", name: { en: "Bandar Anzali", fa: "بندر انزلی" }, lat: 37.4722, lon: 49.4622 },
  // Germany
  { id: "de-be-berlin", provinceId: "de-be", name: { en: "Berlin", fa: "برلین" }, lat: 52.52, lon: 13.405 },
  { id: "de-by-munich", provinceId: "de-by", name: { en: "Munich", fa: "مونیخ" }, lat: 48.1351, lon: 11.582 },
  { id: "de-by-nuremberg", provinceId: "de-by", name: { en: "Nuremberg", fa: "نورنبرگ" }, lat: 49.4521, lon: 11.0767 },
  { id: "de-nw-cologne", provinceId: "de-nw", name: { en: "Cologne", fa: "کلن" }, lat: 50.9375, lon: 6.9603 },
  { id: "de-nw-dusseldorf", provinceId: "de-nw", name: { en: "Düsseldorf", fa: "دوسلدورف" }, lat: 51.2277, lon: 6.7735 },
  // Türkiye
  { id: "tr-34-istanbul", provinceId: "tr-34", name: { en: "Istanbul", fa: "استانبول" }, lat: 41.0082, lon: 28.9784 },
  { id: "tr-06-ankara", provinceId: "tr-06", name: { en: "Ankara", fa: "آنکارا" }, lat: 39.9334, lon: 32.8597 },
];

export function geoName(name: GeoName, locale: Locale): string {
  return name[locale] ?? name.en;
}

export function provincesOf(countryId: string | undefined): Province[] {
  if (!countryId) return [];
  return PROVINCES.filter((p) => p.countryId === countryId);
}

export function citiesOf(provinceId: string | undefined): City[] {
  if (!provinceId) return [];
  return CITIES.filter((c) => c.provinceId === provinceId);
}

export function findCountry(id: string | undefined): Country | undefined {
  return COUNTRIES.find((c) => c.id === id);
}

export function findProvince(id: string | undefined): Province | undefined {
  return PROVINCES.find((p) => p.id === id);
}

export function findCity(id: string | undefined): City | undefined {
  return CITIES.find((c) => c.id === id);
}

/**
 * Guards against a stale combination surviving a form edit — e.g. the user
 * changes country but the previously chosen city still sits in state.
 */
export function isValidGeoSelection(
  countryId: string | undefined,
  provinceId: string | undefined,
  cityId: string | undefined
): boolean {
  const province = findProvince(provinceId);
  const city = findCity(cityId);
  if (!countryId || !province || !city) return false;
  return province.countryId === countryId && city.provinceId === province.id;
}

// ---------------------------------------------------------------
// Referential integrity.
//
// The mock source has no database to enforce foreign keys, so the
// admin screens ask these before deleting. A real backend should
// enforce the same constraint server-side — this is a UI courtesy,
// not the guarantee.
// ---------------------------------------------------------------

export function provinceCountOf(countryId: string): number {
  return PROVINCES.filter((p) => p.countryId === countryId).length;
}

export function cityCountOf(provinceId: string): number {
  return CITIES.filter((c) => c.provinceId === provinceId).length;
}

/** Every city under a country, across all its provinces. */
export function cityCountOfCountry(countryId: string): number {
  const provinceIds = new Set(
    PROVINCES.filter((p) => p.countryId === countryId).map((p) => p.id)
  );
  return CITIES.filter((c) => provinceIds.has(c.provinceId)).length;
}
