import { useEffect } from 'react';
import { VERSION } from '@/version';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { open } from '@tauri-apps/plugin-dialog';
import { enable, disable } from '@tauri-apps/plugin-autostart';
import { Sun, Moon, Monitor, FolderOpen, Github } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { useSettingsStore, ThemeMode, ImageFormat, TrayClickAction } from '@/stores/settingsStore';
import { useI18n, Language, languageNames } from '@/i18n';

export default function Settings() {
  const { t, language, setLanguage } = useI18n();
  const {
    hotkey,
    savePath,
    setSavePath,
    imageFormat,
    setImageFormat,
    imageQuality,
    setImageQuality,
    autoStart,
    setAutoStart,
    theme,
    setTheme,
    trayClickAction,
    setTrayClickAction,
    loadSettings,
  } = useSettingsStore();

  // 加载设置
  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // 选择保存路径
  const handleSelectPath = async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title: t.settings.savePathSelect,
      });
      if (selected && typeof selected === 'string') {
        setSavePath(selected);
      }
    } catch (error) {
      console.error('Failed to select path:', error);
    }
  };

  // 切换自启动
  const handleAutoStartChange = async (checked: boolean) => {
    try {
      if (checked) {
        await enable();
      } else {
        await disable();
      }
      setAutoStart(checked);
    } catch (error) {
      console.error('Failed to toggle autostart:', error);
    }
  };

  // 关闭设置窗口
  const handleClose = async () => {
    await getCurrentWindow().hide();
  };

  return (
    <div className="h-screen bg-background overflow-y-auto">
      <div className="max-w-lg mx-auto space-y-6 p-6">
        <div className="flex items-center justify-between sticky top-0 bg-background py-2 -mt-2 z-10">
          <h1 className="text-2xl font-bold">{t.settings.title}</h1>
          <Button variant="ghost" size="sm" onClick={handleClose}>
            {t.common.close}
          </Button>
        </div>

        {/* 外观设置 */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold border-b pb-2">{t.settings.appearance}</h2>
          
          <div className="flex items-center justify-between">
            <Label>{t.settings.theme}</Label>
            <div className="flex gap-2">
              {[
                { value: 'light' as ThemeMode, icon: <Sun size={16} />, labelKey: 'themeLight' as const },
                { value: 'dark' as ThemeMode, icon: <Moon size={16} />, labelKey: 'themeDark' as const },
                { value: 'system' as ThemeMode, icon: <Monitor size={16} />, labelKey: 'themeSystem' as const },
              ].map(({ value, icon, labelKey }) => (
                <Button
                  key={value}
                  variant={theme === value ? 'default' : 'outline'}
                  size="sm"
                  className="gap-1"
                  onClick={() => setTheme(value)}
                >
                  {icon}
                  {t.settings[labelKey]}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* 语言设置 */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold border-b pb-2">{t.settings.language}</h2>
          
          <div className="flex items-center justify-between">
            <Label>{t.settings.language}</Label>
            <Select value={language} onValueChange={(v) => setLanguage(v as Language)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="zh-CN">{languageNames['zh-CN']}</SelectItem>
                <SelectItem value="zh-TW">{languageNames['zh-TW']}</SelectItem>
                <SelectItem value="en">{languageNames['en']}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* 保存设置 */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold border-b pb-2">{t.settings.save}</h2>
          
          <div className="flex items-center justify-between">
            <Label>{t.settings.savePath}</Label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground truncate max-w-[200px]">
                {savePath || t.settings.savePathDefault}
              </span>
              <Button variant="outline" size="icon" onClick={handleSelectPath}>
                <FolderOpen size={16} />
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <Label>{t.settings.saveFormat}</Label>
            <Select value={imageFormat} onValueChange={(v) => setImageFormat(v as ImageFormat)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="png">PNG</SelectItem>
                <SelectItem value="jpeg">JPEG</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {imageFormat === 'jpeg' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>{t.settings.saveQuality}</Label>
                <span className="text-sm text-muted-foreground">{imageQuality}%</span>
              </div>
              <Slider
                value={[imageQuality]}
                min={10}
                max={100}
                step={5}
                onValueChange={([value]) => setImageQuality(value)}
              />
            </div>
          )}
        </div>

        {/* 系统设置 */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold border-b pb-2">{t.settings.system}</h2>
          
          <div className="flex items-center justify-between">
            <div>
              <Label>{t.settings.startWithSystem}</Label>
            </div>
            <Switch
              checked={autoStart}
              onCheckedChange={handleAutoStartChange}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <Label>{t.settings.trayClickAction}</Label>
            <Select value={trayClickAction} onValueChange={(v) => setTrayClickAction(v as TrayClickAction)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fullscreen">{t.settings.trayClickFullscreen}</SelectItem>
                <SelectItem value="window">{t.settings.trayClickWindow}</SelectItem>
                <SelectItem value="region">{t.settings.trayClickRegion}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* 快捷键设置 */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold border-b pb-2">{t.settings.shortcuts}</h2>
          <div className="flex items-center justify-between">
            <Label>{t.settings.shortcutFullscreen}</Label>
            <div className="text-sm text-muted-foreground bg-secondary px-3 py-1 rounded">
              {hotkey}
            </div>
          </div>
        </div>

        {/* 关于 */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold border-b pb-2">{t.settings.about}</h2>
          
          {/* 介绍信息 */}
          <div className="bg-secondary/50 rounded-lg p-4">
            <div className="flex items-center gap-3 mb-2">
              <img src="/icon-128.png" alt="Xcreenshot" className="w-12 h-12" />
              <h3 className="text-lg font-bold">Xcreenshot</h3>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {t.settings.appDescription}
            </p>
          </div>
          
          {/* 分栏信息 */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            {/* 左侧：版本和技术栈 */}
            <div className="space-y-3 text-center">
              <div>
                <p className="font-semibold">{t.settings.version}</p>
                <p className="text-muted-foreground">{VERSION}</p>
              </div>
              <div>
                <p className="font-semibold">{t.settings.techStack}</p>
                <ul className="text-muted-foreground text-xs space-y-0.5 mt-1">
                  <li>Tauri v2 (Rust)</li>
                  <li>React 18 + TypeScript</li>
                  <li>Vite + TailwindCSS</li>
                  <li>shadcn/ui + Zustand</li>
                  <li>Konva (Canvas)</li>
                </ul>
              </div>
            </div>
            
            {/* 右侧：作者和链接 */}
            <div className="space-y-3 text-center">
              <div>
                <p className="font-semibold">{t.settings.author}</p>
                <p className="text-muted-foreground">Oca-John</p>
              </div>
              <div>
                <p className="font-semibold">{t.settings.github}</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 mt-1"
                  onClick={() => window.open('https://github.com/Oca-John/Xcreenshot-rust', '_blank')}
                >
                  <Github size={14} />
                  {t.settings.viewSource}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
