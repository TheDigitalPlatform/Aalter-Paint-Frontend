import enJson from "./en.json";
import nlJson from "./nl.json";

export type Language = "NL" | "EN" | "GB";

export type TranslationNode =
  | string
  | number
  | boolean
  | null
  | TranslationObject
  | TranslationNode[];

export type TranslationObject = { [key: string]: TranslationNode };

const locales: Record<string, TranslationObject> = {
  EN: enJson as TranslationObject,
  GB: enJson as TranslationObject,
  NL: nlJson as TranslationObject,
};

export function getLocaleSync(lang: Language | string): TranslationObject {
  return locales[lang] || locales.NL;
}

export async function loadLocale(lang: Language | string): Promise<TranslationObject> {
  return getLocaleSync(lang);
}

export function resolveTranslation(
  messages: TranslationObject,
  path: string,
  fallback?: string,
  params?: Record<string, string | number>,
): string {
  const keys = path.split(".");
  let result: TranslationNode = messages;

  for (const key of keys) {
    if (
      result === null ||
      typeof result !== "object" ||
      Array.isArray(result)
    ) {
      result = fallback ?? path;
      break;
    }
    const obj = result as TranslationObject;
    if (obj[key] === undefined) {
      result = fallback ?? path;
      break;
    }
    result = obj[key];
  }

  let str = typeof result === "string" ? result : (fallback ?? path);

  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      str = str.replace(new RegExp(`{{\\s*${k}\\s*}}`, "g"), String(v));
      str = str.replace(new RegExp(`{\\s*${k}\\s*}`, "g"), String(v));
    });
  }

  return str;
}
