import { z } from "zod";
import type { FlowConfig } from "./flow";
import type { PaywallConfig } from "./paywall";

export const FlowTranslationLocaleSchema = z
  .object({
    code: z.string().trim().min(2).max(16),
    label: z.string().trim().min(1).max(80),
    flag: z.string().trim().min(1).max(8).optional(),
  })
  .strict();

export const FlowTranslationsSchema = z
  .object({
    defaultLocale: z.string().trim().min(2).max(16).default("en"),
    locales: z.array(FlowTranslationLocaleSchema).max(32).default([]),
    values: z
      .record(z.string(), z.record(z.string(), z.string()))
      .default({}),
  })
  .strict();

export type FlowTranslationLocale = z.infer<
  typeof FlowTranslationLocaleSchema
>;
export type FlowTranslations = z.infer<typeof FlowTranslationsSchema>;

export type FlowTranslationSource = {
  key: string;
  label: string;
  value: string;
};

export const AVAILABLE_TRANSLATION_LOCALES: FlowTranslationLocale[] = [
  { code: "en", label: "English", flag: "🇺🇸" },
  { code: "pl", label: "Polish", flag: "🇵🇱" },
  { code: "es", label: "Spanish", flag: "🇪🇸" },
  { code: "de", label: "German", flag: "🇩🇪" },
  { code: "fr", label: "French", flag: "🇫🇷" },
  { code: "it", label: "Italian", flag: "🇮🇹" },
  { code: "pt", label: "Portuguese", flag: "🇵🇹" },
  { code: "nl", label: "Dutch", flag: "🇳🇱" },
  { code: "sv", label: "Swedish", flag: "🇸🇪" },
  { code: "no", label: "Norwegian", flag: "🇳🇴" },
  { code: "da", label: "Danish", flag: "🇩🇰" },
  { code: "cs", label: "Czech", flag: "🇨🇿" },
  { code: "uk", label: "Ukrainian", flag: "🇺🇦" },
];

export function translationLocaleForCode(
  code: string,
): FlowTranslationLocale | undefined {
  return AVAILABLE_TRANSLATION_LOCALES.find((locale) => locale.code === code);
}

function ensureFlowTranslations(
  flow: FlowConfig,
): NonNullable<FlowConfig["translations"]> {
  return {
    defaultLocale: flow.translations?.defaultLocale ?? "en",
    locales: flow.translations?.locales ?? [
      translationLocaleForCode("en") ?? { code: "en", label: "English", flag: "🇺🇸" },
    ],
    values: flow.translations?.values ?? {},
  };
}

function ensurePaywallTranslations(
  paywall: PaywallConfig,
): NonNullable<PaywallConfig["translations"]> {
  return {
    defaultLocale: paywall.translations?.defaultLocale ?? "en",
    locales: paywall.translations?.locales ?? [
      translationLocaleForCode("en") ?? { code: "en", label: "English", flag: "🇺🇸" },
    ],
    values: paywall.translations?.values ?? {},
  };
}

export function addFlowTranslationLocale(
  flow: FlowConfig,
  locale: FlowTranslationLocale,
): FlowConfig {
  const translations = ensureFlowTranslations(flow);
  const nextLocales = translations.locales.some((item) => item.code === locale.code)
    ? translations.locales
    : [...translations.locales, locale];
  return {
    ...flow,
    translations: {
      ...translations,
      locales: nextLocales,
      values: {
        ...translations.values,
        [locale.code]: translations.values[locale.code] ?? {},
      },
    },
  };
}

export function removeFlowTranslationLocale(
  flow: FlowConfig,
  localeCode: string,
  referenceFlow?: FlowConfig | null,
): FlowConfig {
  const defaultLocaleCode = flow.translations?.defaultLocale ?? "en";
  if (localeCode === defaultLocaleCode) {
    return flow;
  }
  const translations = ensureFlowTranslations(flow);
  const values = { ...translations.values };
  delete values[localeCode];
  const withoutLocale: FlowConfig = {
    ...flow,
    translations: {
      ...translations,
      locales: translations.locales.filter((locale) => locale.code !== localeCode),
      values,
    },
  };
  const withDefaults = ensureFlowTranslationDefaults(withoutLocale, referenceFlow);
  return applyFlowTranslations(withDefaults, defaultLocaleCode);
}

export function setFlowTranslationValue(
  flow: FlowConfig,
  localeCode: string,
  key: string,
  value: string,
): FlowConfig {
  const translations = ensureFlowTranslations(flow);
  return {
    ...flow,
    translations: {
      ...translations,
      values: {
        ...translations.values,
        [localeCode]: {
          ...(translations.values[localeCode] ?? {}),
          [key]: value,
        },
      },
    },
  };
}

export function setFlowTranslationValues(
  flow: FlowConfig,
  localeCode: string,
  values: Record<string, string>,
): FlowConfig {
  const translations = ensureFlowTranslations(flow);
  return {
    ...flow,
    translations: {
      ...translations,
      values: {
        ...translations.values,
        [localeCode]: {
          ...(translations.values[localeCode] ?? {}),
          ...values,
        },
      },
    },
  };
}

const TEXT_FIELDS_BY_TYPE: Record<string, string[]> = {
  title: ["text"],
  subtitle: ["text"],
  cta_button: ["text"],
  input: ["placeholder"],
  badge: ["text"],
  back_button: ["text"],
  skip_button: ["text"],
  testimonial_card: ["text", "name", "role"],
  loading: ["sheetTitle", "actionText"],
  age_picker: ["selectorLabel", "valueSuffix", "sheetTitle", "actionText"],
  height_picker: ["selectorLabel", "sheetTitle", "actionText"],
  weight_picker: ["selectorLabel", "sheetTitle", "actionText"],
  package_selector: ["title", "subtitle", "badge", "priceTemplate", "priceFallback"],
  package_card: ["title", "subtitle", "badge", "priceTemplate", "priceFallback"],
  package_list: ["title", "subtitle", "badge", "priceTemplate", "priceFallback"],
  price_text: ["template", "fallbackText"],
  trial_text: ["template", "fallbackText"],
  restore_purchases_button: ["text"],
  close_button: ["text"],
  legal_text: ["text"],
  terms_links: ["separator"],
};

const METRIC_PICKER_TRANSLATION_DEFAULTS: Record<
  string,
  Record<string, string>
> = {
  age_picker: {
    valueSuffix: "years",
  },
};

const ARRAY_TEXT_FIELDS_BY_TYPE: Record<
  string,
  Array<{ arrayKey: string; fields: string[]; idField?: string }>
> = {
  carousel: [
    {
      arrayKey: "items",
      fields: ["title", "subtitle", "text", "name", "role"],
    },
  ],
  quiz: [
    {
      arrayKey: "options",
      idField: "id",
      fields: ["label", "subtitle"],
    },
  ],
  features: [
    {
      arrayKey: "items",
      idField: "id",
      fields: ["title", "subtitle"],
    },
  ],
  packages: [
    {
      arrayKey: "plans",
      idField: "id",
      fields: ["title", "price", "period"],
    },
  ],
  feature_list: [
    {
      arrayKey: "items",
      fields: ["text"],
    },
  ],
  terms_links: [
    {
      arrayKey: "links",
      fields: ["label"],
    },
  ],
};

export function collectFlowTranslationSources(
  flow: FlowConfig,
): FlowTranslationSource[] {
  const sources: FlowTranslationSource[] = [];

  if (flow.primitives && typeof flow.primitives === "object") {
    for (const [primitiveKey, primitive] of orderedPrimitiveEntries(
      flow.primitives,
    )) {
      collectPrimitiveTranslationSources(
        sources,
        `flow.primitives.${primitiveKey}`,
        primitive,
      );
    }
  }

  flow.steps.forEach((step) => {
    if (!step.primitives || typeof step.primitives !== "object") {
      return;
    }
    for (const [primitiveKey, primitive] of orderedPrimitiveEntries(
      step.primitives,
    )) {
      collectPrimitiveTranslationSources(
        sources,
        `steps.${step.id}.primitives.${primitiveKey}`,
        primitive,
      );
    }
  });

  return sources;
}

export function collectStepTranslationSources(
  flow: FlowConfig,
  stepId: string,
): FlowTranslationSource[] {
  const prefix = `steps.${stepId}.`;
  return collectFlowTranslationSources(flow).filter((source) =>
    source.key.startsWith(prefix),
  );
}

export function collectPaywallTranslationSources(
  paywall: PaywallConfig,
): FlowTranslationSource[] {
  const sources: FlowTranslationSource[] = [];
  for (const [primitiveKey, primitive] of orderedPrimitiveEntries(
    paywall.primitives ?? {},
  )) {
    collectPrimitiveTranslationSources(
      sources,
      `primitives.${primitiveKey}`,
      primitive,
    );
  }
  return sources;
}

function orderedPrimitiveEntries(
  primitives: Record<string, unknown>,
): Array<[string, unknown]> {
  return Object.entries(primitives).sort(([keyA, primitiveA], [keyB, primitiveB]) => {
    const sortA = primitiveSortTuple(keyA, primitiveA);
    const sortB = primitiveSortTuple(keyB, primitiveB);
    return (
      sortA.slot - sortB.slot ||
      sortA.order - sortB.order ||
      sortA.key.localeCompare(sortB.key)
    );
  });
}

function primitiveSortTuple(
  key: string,
  primitive: unknown,
): { slot: number; order: number; key: string } {
  if (!primitive || typeof primitive !== "object" || Array.isArray(primitive)) {
    return { slot: 1, order: Number.MAX_SAFE_INTEGER, key };
  }
  const record = primitive as Record<string, unknown>;
  return {
    slot: slotSortIndex(record.slot),
    order:
      typeof record.order === "number" && Number.isFinite(record.order)
        ? record.order
        : Number.MAX_SAFE_INTEGER,
    key,
  };
}

function slotSortIndex(slot: unknown): number {
  if (slot === "top") {
    return 0;
  }
  if (slot === "bottom") {
    return 2;
  }
  return 1;
}

export function buildDefaultTranslationSnapshot(
  flow: FlowConfig,
): Record<string, string> {
  const sources = collectFlowTranslationSources(flow);
  return Object.fromEntries(sources.map((source) => [source.key, source.value]));
}

export function ensureFlowTranslationDefaults(
  flow: FlowConfig,
  referenceFlow?: FlowConfig | null,
): FlowConfig {
  const translations = flow.translations;
  if (!translations) {
    return flow;
  }

  const defaultLocale = translations.defaultLocale ?? "en";
  const existing = translations.values[defaultLocale];
  if (existing && Object.keys(existing).length > 0) {
    return flow;
  }

  const referenceSources = referenceFlow
    ? collectFlowTranslationSources(referenceFlow)
    : [];
  const referenceByKey = new Map(
    referenceSources.map((source) => [source.key, source.value]),
  );
  const draftSources = collectFlowTranslationSources(flow);
  if (draftSources.length === 0) {
    return flow;
  }

  const defaultValues: Record<string, string> = {};
  for (const source of draftSources) {
    const referenceValue = referenceByKey.get(source.key);
    defaultValues[source.key] = referenceValue ?? source.value;
  }

  return {
    ...flow,
    translations: {
      ...translations,
      values: {
        ...translations.values,
        [defaultLocale]: {
          ...(translations.values[defaultLocale] ?? {}),
          ...defaultValues,
        },
      },
    },
  };
}

export function prepareBuilderFlowDraft(
  flow: FlowConfig,
  referenceFlow?: FlowConfig | null,
): FlowConfig {
  const withDefaults = ensureFlowTranslationDefaults(flow, referenceFlow);
  const defaultLocale = withDefaults.translations?.defaultLocale ?? "en";
  const defaultValues = withDefaults.translations?.values[defaultLocale];
  if (!defaultValues || Object.keys(defaultValues).length === 0) {
    return withDefaults;
  }
  return applyFlowTranslations(withDefaults, defaultLocale);
}

export function applyFlowTranslations(
  flow: FlowConfig,
  locale: string | undefined,
): FlowConfig {
  const normalizedLocale = locale?.trim();
  const translations = flow.translations;
  if (
    !normalizedLocale ||
    !translations
  ) {
    return flow;
  }

  const defaultLocale = translations.defaultLocale ?? "en";
  const baseLocale = normalizedLocale.split("-")[0] ?? "";
  const isDefaultLocale =
    normalizedLocale === defaultLocale || baseLocale === defaultLocale;

  const configuredLocaleCodes = new Set(
    translations.locales.map((entry) => entry.code),
  );
  configuredLocaleCodes.add(defaultLocale);

  const matchedLocale = isDefaultLocale
    ? defaultLocale
    : configuredLocaleCodes.has(normalizedLocale)
      ? normalizedLocale
      : configuredLocaleCodes.has(baseLocale)
        ? baseLocale
        : null;
  if (!matchedLocale) {
    return flow;
  }

  const values = translations.values[matchedLocale];
  if (!values || Object.keys(values).length === 0) {
    return flow;
  }

  const next = structuredClone(flow) as FlowConfig;
  for (const [key, value] of Object.entries(values)) {
    if (typeof value !== "string" || value.length === 0) {
      continue;
    }
    setPathValue(next as unknown as Record<string, unknown>, key.split("."), value);
  }
  return next;
}

export function setPaywallTranslationValue(
  paywall: PaywallConfig,
  localeCode: string,
  key: string,
  value: string,
): PaywallConfig {
  const translations = ensurePaywallTranslations(paywall);
  const locale =
    translations.locales.find((item) => item.code === localeCode) ??
    translationLocaleForCode(localeCode) ??
    { code: localeCode, label: localeCode.toUpperCase() };
  const locales = translations.locales.some((item) => item.code === locale.code)
    ? translations.locales
    : [...translations.locales, locale];
  return {
    ...paywall,
    translations: {
      ...translations,
      locales,
      values: {
        ...translations.values,
        [localeCode]: {
          ...(translations.values[localeCode] ?? {}),
          [key]: value,
        },
      },
    },
  };
}

export function setPaywallTranslationValues(
  paywall: PaywallConfig,
  localeCode: string,
  values: Record<string, string>,
): PaywallConfig {
  const translations = ensurePaywallTranslations(paywall);
  const locale =
    translations.locales.find((item) => item.code === localeCode) ??
    translationLocaleForCode(localeCode) ??
    { code: localeCode, label: localeCode.toUpperCase() };
  const locales = translations.locales.some((item) => item.code === locale.code)
    ? translations.locales
    : [...translations.locales, locale];
  return {
    ...paywall,
    translations: {
      ...translations,
      locales,
      values: {
        ...translations.values,
        [localeCode]: {
          ...(translations.values[localeCode] ?? {}),
          ...values,
        },
      },
    },
  };
}

export function ensurePaywallTranslationDefaults(
  paywall: PaywallConfig,
  referencePaywall?: PaywallConfig | null,
): PaywallConfig {
  const translations = paywall.translations;
  if (!translations) {
    return paywall;
  }

  const defaultLocale = translations.defaultLocale ?? "en";
  const existing = translations.values[defaultLocale];
  if (existing && Object.keys(existing).length > 0) {
    return paywall;
  }

  const referenceSources = referencePaywall
    ? collectPaywallTranslationSources(referencePaywall)
    : [];
  const referenceByKey = new Map(
    referenceSources.map((source) => [source.key, source.value]),
  );
  const draftSources = collectPaywallTranslationSources(paywall);
  if (draftSources.length === 0) {
    return paywall;
  }

  const defaultValues: Record<string, string> = {};
  for (const source of draftSources) {
    const referenceValue = referenceByKey.get(source.key);
    defaultValues[source.key] = referenceValue ?? source.value;
  }

  return {
    ...paywall,
    translations: {
      ...translations,
      values: {
        ...translations.values,
        [defaultLocale]: {
          ...(translations.values[defaultLocale] ?? {}),
          ...defaultValues,
        },
      },
    },
  };
}

export function prepareBuilderPaywallDraft(
  paywall: PaywallConfig,
  referencePaywall?: PaywallConfig | null,
): PaywallConfig {
  const withDefaults = ensurePaywallTranslationDefaults(paywall, referencePaywall);
  const defaultLocale = withDefaults.translations?.defaultLocale ?? "en";
  const defaultValues = withDefaults.translations?.values[defaultLocale];
  if (!defaultValues || Object.keys(defaultValues).length === 0) {
    return withDefaults;
  }
  return applyPaywallTranslations(withDefaults, defaultLocale);
}

export function applyPaywallTranslations(
  paywall: PaywallConfig,
  locale: string | undefined,
): PaywallConfig {
  const normalizedLocale = locale?.trim();
  const translations = paywall.translations;
  if (!normalizedLocale || !translations) {
    return paywall;
  }

  const defaultLocale = translations.defaultLocale ?? "en";
  const baseLocale = normalizedLocale.split("-")[0] ?? "";
  const isDefaultLocale =
    normalizedLocale === defaultLocale || baseLocale === defaultLocale;

  const configuredLocaleCodes = new Set(
    translations.locales.map((entry) => entry.code),
  );
  configuredLocaleCodes.add(defaultLocale);

  const matchedLocale = isDefaultLocale
    ? defaultLocale
    : configuredLocaleCodes.has(normalizedLocale)
      ? normalizedLocale
      : configuredLocaleCodes.has(baseLocale)
        ? baseLocale
        : null;
  if (!matchedLocale) {
    return paywall;
  }

  const values = translations.values[matchedLocale];
  if (!values || Object.keys(values).length === 0) {
    return paywall;
  }

  const next = structuredClone(paywall) as PaywallConfig;
  for (const [key, value] of Object.entries(values)) {
    if (typeof value !== "string" || value.length === 0) {
      continue;
    }
    setPathValue(next as unknown as Record<string, unknown>, key.split("."), value);
  }
  return next;
}

function collectPrimitiveTranslationSources(
  sources: FlowTranslationSource[],
  basePath: string,
  primitive: unknown,
): void {
  if (!primitive || typeof primitive !== "object" || Array.isArray(primitive)) {
    return;
  }
  const record = primitive as Record<string, unknown>;
  const type = typeof record.type === "string" ? record.type : "";
  const props =
    record.props && typeof record.props === "object" && !Array.isArray(record.props)
      ? (record.props as Record<string, unknown>)
      : {};

  for (const field of TEXT_FIELDS_BY_TYPE[type] ?? []) {
    const value = props[field];
    if (typeof value === "string" && value.trim().length > 0) {
      sources.push({
        key: `${basePath}.props.${field}`,
        label: labelForPath(type, field),
        value,
      });
    }
  }

  for (const [field, defaultValue] of Object.entries(
    METRIC_PICKER_TRANSLATION_DEFAULTS[type] ?? {},
  )) {
    const key = `${basePath}.props.${field}`;
    if (sources.some((source) => source.key === key)) {
      continue;
    }
    sources.push({
      key,
      label: labelForPath(type, field),
      value: defaultValue,
    });
  }

  if (type === "loading" && Array.isArray(props.messages)) {
    props.messages.forEach((message, index) => {
      if (typeof message === "string" && message.trim().length > 0) {
        sources.push({
          key: `${basePath}.props.messages.${index}`,
          label: `Message ${index + 1}`,
          value: message,
        });
      }
    });
  }

  for (const arraySpec of ARRAY_TEXT_FIELDS_BY_TYPE[type] ?? []) {
    const items = props[arraySpec.arrayKey];
    if (!Array.isArray(items)) {
      continue;
    }
    items.forEach((item, index) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) {
        return;
      }
      const itemRecord = item as Record<string, unknown>;
      const itemLabel =
        typeof itemRecord[arraySpec.idField ?? "id"] === "string"
          ? String(itemRecord[arraySpec.idField ?? "id"])
          : String(index + 1);
      for (const field of arraySpec.fields) {
        const value = itemRecord[field];
        if (typeof value === "string" && value.trim().length > 0) {
          sources.push({
            key: `${basePath}.props.${arraySpec.arrayKey}.${index}.${field}`,
            label: `${labelForPath(type, field)} ${itemLabel}`,
            value,
          });
        }
      }
    });
  }

  if ((type === "x_stack" || type === "y_stack") && Array.isArray(props.children)) {
    props.children.forEach((child, index) => {
      collectPrimitiveTranslationSources(
        sources,
        `${basePath}.props.children.${index}`,
        child,
      );
    });
  }
}

function labelForPath(type: string, field: string): string {
  if (field === "text") {
    return type === "cta_button" ? "Button text" : "Text";
  }
  if (field === "placeholder") {
    return "Placeholder";
  }
  if (field === "sheetTitle") {
    return "Sheet title";
  }
  if (field === "actionText") {
    return "Action text";
  }
  if (field === "selectorLabel") {
    return "Selector label";
  }
  if (field === "selectorLabel") {
    return "Selector label";
  }
  if (field === "valueSuffix") {
    return "Value suffix";
  }
  return field
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (char) => char.toUpperCase());
}

function setPathValue(
  target: Record<string, unknown>,
  path: string[],
  value: string,
): void {
  let cursor: unknown = target;
  for (let index = 0; index < path.length - 1; index += 1) {
    const segment = path[index];
    if (!segment) {
      return;
    }
    if (Array.isArray(cursor)) {
      const itemIndex = Number(segment);
      if (Number.isInteger(itemIndex) && itemIndex >= 0 && itemIndex < cursor.length) {
        cursor = cursor[itemIndex];
        continue;
      }
      cursor = cursor.find(
        (item) =>
          item &&
          typeof item === "object" &&
          !Array.isArray(item) &&
          (item as { id?: unknown }).id === segment,
      );
      if (!cursor) {
        return;
      }
      continue;
    }
    if (!cursor || typeof cursor !== "object") {
      return;
    }
    cursor = (cursor as Record<string, unknown>)[segment];
  }

  const last = path[path.length - 1];
  if (!last) {
    return;
  }
  if (Array.isArray(cursor)) {
    const itemIndex = Number(last);
    if (Number.isInteger(itemIndex) && itemIndex >= 0 && itemIndex < cursor.length) {
      cursor[itemIndex] = value;
    }
    return;
  }
  if (cursor && typeof cursor === "object") {
    (cursor as Record<string, unknown>)[last] = value;
  }
}
