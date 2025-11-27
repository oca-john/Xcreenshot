import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import zhCN from './locales/zh-CN';
import zhTW from './locales/zh-TW';
import en from './locales/en';

export type Language = 'zh-CN' | 'zh-TW' | 'en';

export type Translations = typeof zhCN;

const locales: Record<Language, Translations> = {
  'zh-CN': zhCN,
  'zh-TW': zhTW,
  'en': en,
};

interface I18nStore {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: Translations;
}

export const useI18n = create<I18nStore>()(
  persist(
    (set) => ({
      language: 'zh-CN',
      setLanguage: (lang: Language) => {
        set({ language: lang, t: locales[lang] });
      },
      t: locales['zh-CN'],
    }),
    {
      name: 'xcreenshot-i18n',
      partialize: (state) => ({ language: state.language }),
      merge: (persisted, current) => {
        const lang = (persisted as { language?: Language })?.language || 'zh-CN';
        return { ...current, language: lang, t: locales[lang] };
      },
    }
  )
);

// 辅助函数：获取翻译
export const getTranslations = () => {
  const { language } = useI18n.getState();
  return locales[language];
};

// 语言显示名称
export const languageNames: Record<Language, string> = {
  'zh-CN': '简体中文',
  'zh-TW': '繁體中文',
  'en': 'English',
};
