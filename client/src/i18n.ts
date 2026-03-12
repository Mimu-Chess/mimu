import type { AppLanguage } from './lib/desktopConfig';
import en from './i18n/en';
import es from './i18n/es';
import zhCN from './i18n/zh-CN';
import type { AppStrings } from './i18n/en';

export const APP_STRINGS: Record<AppLanguage, AppStrings> = {
    en,
    es,
    'zh-CN': zhCN,
};

export const LANGUAGE_OPTIONS: Array<{ value: AppLanguage; label: string }> = [
    { value: 'en', label: 'English' },
    { value: 'es', label: 'Espanol' },
    { value: 'zh-CN', label: '\u7b80\u4f53\u4e2d\u6587' },
];

export type { AppStrings };
