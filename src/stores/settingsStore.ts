import { create } from 'zustand';
import { Store } from '@tauri-apps/plugin-store';
import { invoke } from '@tauri-apps/api/core';

export type ThemeMode = 'light' | 'dark' | 'system';
export type ImageFormat = 'png' | 'jpeg';
export type TrayClickAction = 'region' | 'fullscreen' | 'window';
export type CaptureDelay = 0 | 1 | 2 | 3 | 5 | 10;

interface SettingsState {
  // 设置项
  hotkey: string;
  savePath: string;
  imageFormat: ImageFormat;
  imageQuality: number;
  autoStart: boolean;
  theme: ThemeMode;
  trayClickAction: TrayClickAction;
  captureDelay: CaptureDelay;
  
  // Actions
  setHotkey: (hotkey: string) => void;
  setSavePath: (path: string) => void;
  setImageFormat: (format: ImageFormat) => void;
  setImageQuality: (quality: number) => void;
  setAutoStart: (enabled: boolean) => void;
  setTheme: (theme: ThemeMode) => void;
  setTrayClickAction: (action: TrayClickAction) => void;
  setCaptureDelay: (delay: CaptureDelay) => void;
  loadSettings: () => Promise<void>;
  saveSettings: () => Promise<void>;
}

let store: Store | null = null;

const getStore = async () => {
  if (!store) {
    store = await Store.load('settings.json');
  }
  return store;
};

export const useSettingsStore = create<SettingsState>((set, get) => ({
  // 默认值
  hotkey: 'Ctrl+Shift+A',
  savePath: '',
  imageFormat: 'png',
  imageQuality: 90,
  autoStart: false,
  theme: 'system',
  trayClickAction: 'region',
  captureDelay: 0,

  setHotkey: (hotkey) => {
    set({ hotkey });
    get().saveSettings();
  },

  setSavePath: (path) => {
    set({ savePath: path });
    get().saveSettings();
  },

  setImageFormat: (format) => {
    set({ imageFormat: format });
    get().saveSettings();
  },

  setImageQuality: (quality) => {
    set({ imageQuality: quality });
    get().saveSettings();
  },

  setAutoStart: (enabled) => {
    set({ autoStart: enabled });
    get().saveSettings();
  },

  setTheme: (theme) => {
    set({ theme });
    get().saveSettings();
    applyTheme(theme);
  },

  setTrayClickAction: (action) => {
    set({ trayClickAction: action });
    get().saveSettings();
    // 同步到后端
    invoke('set_tray_click_action', { action }).catch(console.error);
  },

  setCaptureDelay: (delay) => {
    set({ captureDelay: delay });
    get().saveSettings();
    // 同步到后端
    invoke('set_capture_delay', { seconds: delay }).catch(console.error);
  },

  loadSettings: async () => {
    try {
      const s = await getStore();
      const hotkey = await s.get<string>('hotkey');
      const savePath = await s.get<string>('savePath');
      const imageFormat = await s.get<ImageFormat>('imageFormat');
      const imageQuality = await s.get<number>('imageQuality');
      const autoStart = await s.get<boolean>('autoStart');
      const theme = await s.get<ThemeMode>('theme');
      const trayClickAction = await s.get<TrayClickAction>('trayClickAction');
      const captureDelay = await s.get<CaptureDelay>('captureDelay');
      
      const finalTrayClickAction = trayClickAction ?? 'region';
      const finalCaptureDelay = captureDelay ?? 0;
      
      set({
        hotkey: hotkey ?? 'Ctrl+Shift+A',
        savePath: savePath ?? '',
        imageFormat: imageFormat ?? 'png',
        imageQuality: imageQuality ?? 90,
        autoStart: autoStart ?? false,
        theme: theme ?? 'system',
        trayClickAction: finalTrayClickAction,
        captureDelay: finalCaptureDelay,
      });
      
      applyTheme(theme ?? 'system');
      
      // 同步到后端
      invoke('set_tray_click_action', { action: finalTrayClickAction }).catch(console.error);
      invoke('set_capture_delay', { seconds: finalCaptureDelay }).catch(console.error);
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  },

  saveSettings: async () => {
    try {
      const s = await getStore();
      const state = get();
      
      await s.set('hotkey', state.hotkey);
      await s.set('savePath', state.savePath);
      await s.set('imageFormat', state.imageFormat);
      await s.set('imageQuality', state.imageQuality);
      await s.set('autoStart', state.autoStart);
      await s.set('theme', state.theme);
      await s.set('trayClickAction', state.trayClickAction);
      await s.set('captureDelay', state.captureDelay);
      await s.save();
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  },
}));

function applyTheme(theme: ThemeMode) {
  const root = document.documentElement;
  
  if (theme === 'system') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    root.classList.toggle('dark', prefersDark);
  } else {
    root.classList.toggle('dark', theme === 'dark');
  }
}

// 监听系统主题变化
if (typeof window !== 'undefined') {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    const { theme } = useSettingsStore.getState();
    if (theme === 'system') {
      document.documentElement.classList.toggle('dark', e.matches);
    }
  });
}
