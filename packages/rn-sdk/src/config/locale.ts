import { getLocales } from "expo-localization";

export function resolveRuntimeLocale(locale?: string): string | undefined {
  const explicitLocale = normalizeLocale(locale);
  if (explicitLocale) {
    return explicitLocale;
  }

  const expoLocale = resolveExpoLocale();
  if (expoLocale) {
    return expoLocale;
  }

  try {
    const resolvedLocale = Intl.DateTimeFormat().resolvedOptions().locale;
    return normalizeLocale(resolvedLocale);
  } catch {
    return undefined;
  }
}

function resolveExpoLocale(): string | undefined {
  try {
    const [primaryLocale] = getLocales();
    return normalizeLocale(
      primaryLocale?.languageTag ?? primaryLocale?.languageCode ?? undefined,
    );
  } catch {
    return undefined;
  }
}

function normalizeLocale(locale: string | undefined): string | undefined {
  const trimmed = locale?.trim();
  if (!trimmed) {
    return undefined;
  }
  return trimmed.replace("_", "-");
}
