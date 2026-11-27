import { vietnamese } from './locale-vi.ts';

export type Language = 'en' | 'vi';
const languageKey = 'ai-game-studio:monster-survivor:language:v1';
function storedLanguage(): Language {
  try { return localStorage.getItem(languageKey) === 'vi' ? 'vi' : 'en'; }
  catch { return 'en'; }
}

export let language = storedLanguage();
export function setLanguage(value: Language) {
  language = value;
  try { localStorage.setItem(languageKey, value); } catch { /* Language still applies in this session. */ }
}

export type Phrase = keyof typeof vietnamese;
export function t(english: Phrase, ...args: (string | number)[]) {
  const phrase = language === 'vi' ? vietnamese[english] : english;
  return phrase.replace(/\{(\d+)\}/g, (_, index: string) => String(args[Number(index)] ?? ''));
}

export function name(value: string) {
  return language === 'vi' && Object.hasOwn(vietnamese, value) ? vietnamese[value as Phrase] : value;
}

const formats = new Map<string, Intl.NumberFormat>();
export function number(value: number, digits = 0) {
  const key = language + digits;
  let format = formats.get(key);
  if (!format) {
    format = new Intl.NumberFormat(language === 'vi' ? 'vi-VN' : 'en', { maximumFractionDigits: digits });
    formats.set(key, format);
  }
  return format.format(value);
}

export function materials(treats: number, shards: number) {
  return t(treats === 1 ? '{0} Treat' : '{0} Treats', number(treats)) + ' · ' +
    t(shards === 1 ? '{0} Sigil Shard' : '{0} Sigil Shards', number(shards));
}
