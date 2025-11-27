import { useCallback } from 'react';
import {
  Hand,
  MousePointer2,
  Square,
  Circle,
  ArrowUpLeft,
  Minus,
  Pencil,
  Type,
  Grid3X3,
  Droplets,
  Undo2,
  Redo2,
  Check,
  X,
  Save,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Slider } from '@/components/ui/slider';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { useEditorStore, ToolType } from '@/stores/editorStore';
import { useI18n } from '@/i18n';
import { cn } from '@/lib/utils';

interface ToolbarProps {
  position?: { x: number; y: number }; // 保留但可选，用于兼容
  onConfirm: () => void;
  onCancel: () => void;
  onSave: () => void;
}

const COLORS = [
  '#ff0000', '#ff9800', '#ffeb3b', '#4caf50',
  '#2196f3', '#9c27b0', '#000000', '#ffffff',
];

// 工具定义（不包含翻译标签）
const toolDefs: { type: ToolType; icon: React.ReactNode; labelKey: keyof typeof import('@/i18n/locales/zh-CN').default.tools; shortcut: string }[] = [
  { type: 'hand', icon: <Hand size={18} />, labelKey: 'hand', shortcut: 'H' },
  { type: 'select', icon: <MousePointer2 size={18} />, labelKey: 'select', shortcut: 'V' },
  { type: 'rectangle', icon: <Square size={18} />, labelKey: 'rectangle', shortcut: 'R' },
  { type: 'ellipse', icon: <Circle size={18} />, labelKey: 'ellipse', shortcut: 'O' },
  { type: 'arrow', icon: <ArrowUpLeft size={18} />, labelKey: 'arrow', shortcut: 'A' },
  { type: 'line', icon: <Minus size={18} />, labelKey: 'line', shortcut: 'L' },
  { type: 'pen', icon: <Pencil size={18} />, labelKey: 'pen', shortcut: 'P' },
  { type: 'text', icon: <Type size={18} />, labelKey: 'text', shortcut: 'T' },
  { type: 'blur', icon: <Droplets size={18} />, labelKey: 'blur', shortcut: 'B' },
  { type: 'mosaic', icon: <Grid3X3 size={18} />, labelKey: 'mosaic', shortcut: 'M' },
];

export default function Toolbar({ onConfirm, onCancel, onSave }: ToolbarProps) {
  const { t } = useI18n();
  const {
    currentTool,
    setCurrentTool,
    color,
    setColor,
    strokeWidth,
    setStrokeWidth,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useEditorStore();

  // 快捷键处理
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.target instanceof HTMLInputElement) return;

    const shortcuts: Record<string, ToolType> = {
      h: 'hand',
      v: 'select',
      r: 'rectangle',
      o: 'ellipse',
      a: 'arrow',
      l: 'line',
      p: 'pen',
      t: 'text',
      m: 'mosaic',
      b: 'blur',
    };

    const key = e.key.toLowerCase();
    if (shortcuts[key]) {
      setCurrentTool(shortcuts[key]);
    }
  }, [setCurrentTool]);

  // 注册快捷键
  if (typeof window !== 'undefined') {
    window.addEventListener('keydown', handleKeyDown);
  }

  return (
    <TooltipProvider>
      <div
        className="flex items-center gap-1 p-1 bg-white dark:bg-gray-800 shadow-lg border-b w-full"
      >
        {/* 工具按钮 */}
        {toolDefs.map(({ type, icon, labelKey, shortcut }) => (
          <Tooltip key={type}>
            <TooltipTrigger asChild>
              <Button
                variant={currentTool === type ? 'default' : 'ghost'}
                size="icon"
                className="h-8 w-8"
                onClick={() => setCurrentTool(type)}
              >
                {icon}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{t.tools[labelKey]} ({shortcut})</p>
            </TooltipContent>
          </Tooltip>
        ))}

        <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-1" />

        {/* 颜色选择器 */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <div
                className="w-5 h-5 rounded border-2 border-gray-300"
                style={{ backgroundColor: color }}
              />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-48 p-2">
            <div className="grid grid-cols-4 gap-2">
              {COLORS.map((c) => (
                <button
                  key={c}
                  className={cn(
                    'w-8 h-8 rounded border-2',
                    color === c ? 'border-primary' : 'border-gray-200'
                  )}
                  style={{ backgroundColor: c }}
                  onClick={() => setColor(c)}
                />
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {/* 线条粗细 */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <div className="flex items-center justify-center">
                <div
                  className="rounded-full bg-current"
                  style={{
                    width: Math.min(strokeWidth * 2, 16),
                    height: Math.min(strokeWidth * 2, 16),
                  }}
                />
              </div>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-48 p-4">
            <div className="space-y-2">
              <div className="text-sm font-medium">{t.editor.strokeWidth}: {strokeWidth}px</div>
              <Slider
                value={[strokeWidth]}
                min={1}
                max={20}
                step={1}
                onValueChange={([value]) => setStrokeWidth(value)}
              />
            </div>
          </PopoverContent>
        </Popover>

        <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-1" />

        {/* 撤销/重做 */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={undo}
              disabled={!canUndo()}
            >
              <Undo2 size={18} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{t.editor.undo} (Ctrl+Z)</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={redo}
              disabled={!canRedo()}
            >
              <Redo2 size={18} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{t.editor.redo} (Ctrl+Y)</p>
          </TooltipContent>
        </Tooltip>

        <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-1" />

        {/* 操作按钮 */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onSave}>
              <Save size={18} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{t.editor.save} (Ctrl+Shift+S)</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-red-500 hover:text-red-600"
              onClick={onCancel}
            >
              <X size={18} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{t.editor.cancel} (Esc)</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="default"
              size="icon"
              className="h-8 w-8"
              onClick={onConfirm}
            >
              <Check size={18} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{t.editor.confirm} (Enter)</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}
