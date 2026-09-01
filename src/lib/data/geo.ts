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
  { id: "ir-thr-tehran", provinceId: "ir-thr", name: { en: "Tehran", fa: "تهران" } },
  { id: "ir-thr-karaj", provinceId: "ir-thr", name: { en: "Karaj", fa: "کرج" } },
  { id: "ir-thr-shahriar", provinceId: "ir-thr", name: { en: "Shahriar", fa: "شهریار" } },
  { id: "ir-thr-varamin", provinceId: "ir-thr", name: { en: "Varamin", fa: "ورامین" } },
  // Isfahan
  { id: "ir-esf-isfahan", provinceId: "ir-esf", name: { en: "Isfahan", fa: "اصفهان" } },
  { id: "ir-esf-kashan", provinceId: "ir-esf", name: { en: "Kashan", fa: "کاشان" } },
  { id: "ir-esf-najafabad", provinceId: "ir-esf", name: { en: "Najafabad", fa: "نجف‌آباد" } },
  // Fars
  { id: "ir-fas-shiraz", provinceId: "ir-fas", name: { en: "Shiraz", fa: "شیراز" } },
  { id: "ir-fas-marvdasht", provinceId: "ir-fas", name: { en: "Marvdasht", fa: "مرودشت" } },
  // Razavi Khorasan
  { id: "ir-rkh-mashhad", provinceId: "ir-rkh", name: { en: "Mashhad", fa: "مشهد" } },
  { id: "ir-rkh-neyshabur", provinceId: "ir-rkh", name: { en: "Neyshabur", fa: "نیشابور" } },
  // East Azerbaijan
  { id: "ir-eaz-tabriz", provinceId: "ir-eaz", name: { en: "Tabriz", fa: "تبریز" } },
  { id: "ir-eaz-maragheh", provinceId: "ir-eaz", name: { en: "Maragheh", fa: "مراغه" } },
  // Gilan
  { id: "ir-gil-rasht", provinceId: "ir-gil", name: { en: "Rasht", fa: "رشت" } },
  { id: "ir-gil-anzali", provinceId: "ir-gil", name: { en: "Bandar Anzali", fa: "بندر انزلی" } },
  // Germany
  { id: "de-be-berlin", provinceId: "de-be", name: { en: "Berlin", fa: "برلین" } },
  { id: "de-by-munich", provinceId: "de-by", name: { en: "Munich", fa: "مونیخ" } },
  { id: "de-by-nuremberg", provinceId: "de-by", name: { en: "Nuremberg", fa: "نورنبرگ" } },
  { id: "de-nw-cologne", provinceId: "de-nw", name: { en: "Cologne", fa: "کلن" } },
  { id: "de-nw-dusseldorf", provinceId: "de-nw", name: { en: "Düsseldorf", fa: "دوسلدورف" } },
  // Türkiye
  { id: "tr-34-istanbul", provinceId: "tr-34", name: { en: "Istanbul", fa: "استانبول" } },
  { id: "tr-06-ankara", provinceId: "tr-06", name: { en: "Ankara", fa: "آنکارا" } },
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
