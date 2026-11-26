import type { Locale } from '../types/survey.ts';

const ADJECTIVES: Record<Locale, string[]> = {
  et: ['Kiire', 'Täpne', 'Vapper', 'Osav', 'Julge', 'Tugev', 'Nobe', 'Kerge', 'Särav', 'Rahulik'],
  en: ['Swift', 'Sharp', 'Brave', 'Steady', 'Bright', 'Quick', 'Bold', 'Clever', 'Calm', 'Agile'],
  ru: ['Быстрый', 'Точный', 'Смелый', 'Ловкий', 'Сильный', 'Бодрый', 'Яркий', 'Шустрый', 'Упорный', 'Стойкий'],
};

const NOUNS: Record<Locale, string[]> = {
  et: ['Kotkas', 'Rebane', 'Ilves', 'Hunt', 'Pääsuke', 'Komeet', 'Täht', 'Ründaja', 'Kaitse', 'Välk'],
  en: ['Falcon', 'Fox', 'Lynx', 'Wolf', 'Comet', 'Striker', 'Keeper', 'Spark', 'Hawk', 'Panther'],
  ru: ['Сокол', 'Лис', 'Рысь', 'Волк', 'Комета', 'Форвард', 'Вратарь', 'Молния', 'Ястреб', 'Барс'],
};

export function generateNickname(locale: Locale, randomFn: () => number = Math.random): string {
  const adjs = ADJECTIVES[locale] || ADJECTIVES.et;
  const nouns = NOUNS[locale] || NOUNS.et;
  const adj = adjs[Math.floor(randomFn() * adjs.length) % adjs.length];
  const noun = nouns[Math.floor(randomFn() * nouns.length) % nouns.length];
  const num = Math.floor(randomFn() * 90) + 10;
  return `${adj} ${noun} ${num}`;
}
