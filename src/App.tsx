import { useEffect, useState } from 'react';
import { listen } from '@tauri-apps/api/event';
import { getCurrentWindow } from '@tauri-apps/api/window';
import Editor from './components/Editor';
import RegionSelector from './components/RegionSelector';
import WindowSelector from './components/WindowSelector';
import Settings from './pages/Settings';
import { useEditorStore } from './stores/editorStore';

type ViewType = 'editor' | 'region-select' | 'window-select' | 'settings' | 'hidden';

interface WindowInfo {
  id: number;
  title: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

function App() {
  const [view, setView] = useState<ViewType>('hidden');
  const [windowList, setWindowList] = useState<WindowInfo[]>([]);
  const { setScreenshot, setCaptureMode, setSelection, setSelectionConfirmed, reset } = useEditorStore();

  useEffect(() => {
    // 确定当前窗口类型
    const windowLabel = getCurrentWindow().label;
    
    if (windowLabel === 'settings') {
      setView('settings');
      return;
    }

    console.log('[Xcreenshot] Setting up event listeners');

    // 监听编辑器打开事件（全屏/窗口截图后直接进入编辑）
    const unlistenEditor = listen<{
      mode: 'fullscreen' | 'window' | 'region';
      screenshot: string;
      physicalWidth: number;
      physicalHeight: number;
      logicalWidth: number;
      logicalHeight: number;
      scaleFactor: number;
    }>('open-editor', (event) => {
      console.log('[Xcreenshot] Received open-editor event:', event.payload.mode);
      const { mode, screenshot, physicalWidth, physicalHeight } = event.payload;
      reset(); // 重置状态
      setCaptureMode(mode);
      // 使用物理像素尺寸，因为 base64 图像是物理像素大小
      setScreenshot(screenshot, physicalWidth, physicalHeight);
      // 全屏/窗口截图直接确认选区为整个图片
      setSelection({ x: 0, y: 0, width: physicalWidth, height: physicalHeight });
      setSelectionConfirmed(true);
      setView('editor');
    });

    // 监听区域选择事件
    const unlistenRegion = listen<{
      screenshot: string;
      physicalWidth: number;
      physicalHeight: number;
      logicalWidth: number;
      logicalHeight: number;
      scaleFactor: number;
    }>('start-region-select', (event) => {
      console.log('[Xcreenshot] Received start-region-select event');
      const { screenshot, logicalWidth, logicalHeight } = event.payload;
      reset(); // 重置状态
      setCaptureMode('region');
      // 区域选择时使用逻辑像素尺寸显示（窗口是逻辑像素大小）
      // 裁剪时 handleRegionSelected 会用 dpr 转换为物理像素
      setScreenshot(screenshot, logicalWidth, logicalHeight);
      setView('region-select');
    });

    // 监听窗口选择事件
    const unlistenWindow = listen<{
      screenshot: string;
      logicalWidth: number;
      logicalHeight: number;
      scaleFactor: number;
      windows: WindowInfo[];
    }>('start-window-select', (event) => {
      console.log('[Xcreenshot] Received start-window-select event');
      const { screenshot, logicalWidth, logicalHeight, windows } = event.payload;
      reset(); // 重置状态
      setCaptureMode('window');
      setScreenshot(screenshot, logicalWidth, logicalHeight);
      setWindowList(windows);
      setView('window-select');
    });

    // 监听取消截图事件
    const unlistenCancel = listen('cancel-capture', () => {
      reset();
      setView('hidden');
      getCurrentWindow().hide();
    });

    return () => {
      unlistenEditor.then(fn => fn());
      unlistenRegion.then(fn => fn());
      unlistenWindow.then(fn => fn());
      unlistenCancel.then(fn => fn());
    };
  }, [setCaptureMode, setScreenshot, setSelection, setSelectionConfirmed, reset]);

  // 监听 ESC 键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && (view === 'editor' || view === 'region-select' || view === 'window-select')) {
        reset();
        setView('hidden');
        getCurrentWindow().hide();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [view, reset]);

  // 区域选择完成后，裁剪图像并进入编辑器
  const handleRegionSelected = async () => {
    const { screenshot, selection } = useEditorStore.getState();
    
    if (screenshot && selection && selection.width > 0 && selection.height > 0) {
      // 创建 canvas 裁剪选区
      const img = new Image();
      img.src = `data:image/png;base64,${screenshot}`;
      
      await new Promise<void>((resolve) => {
        img.onload = () => {
          // 考虑 DPI 缩放
          const dpr = window.devicePixelRatio || 1;
          const cropX = Math.round(selection.x * dpr);
          const cropY = Math.round(selection.y * dpr);
          const cropW = Math.round(selection.width * dpr);
          const cropH = Math.round(selection.height * dpr);
          
          const canvas = document.createElement('canvas');
          canvas.width = cropW;
          canvas.height = cropH;
          const ctx = canvas.getContext('2d');
          
          if (ctx) {
            // 绘制裁剪后的图像
            ctx.drawImage(
              img,
              cropX, cropY, cropW, cropH,
              0, 0, cropW, cropH
            );
            
            // 获取裁剪后的 base64
            const croppedBase64 = canvas.toDataURL('image/png').replace(/^data:image\/png;base64,/, '');
            
            // 更新 store - 使用物理像素尺寸，因为裁剪后的图像是物理像素大小
            setScreenshot(croppedBase64, cropW, cropH);
            setSelection({ x: 0, y: 0, width: cropW, height: cropH });
          }
          resolve();
        };
      });
      
      // 调整窗口大小为屏幕80%（与其他截图方式统一）
      const win = getCurrentWindow();
      const screenWidth = window.screen.width;
      const screenHeight = window.screen.height;
      const winWidth = Math.round(screenWidth * 0.8);
      const winHeight = Math.round(screenHeight * 0.8);
      const winX = Math.round((screenWidth - winWidth) / 2);
      const winY = Math.round((screenHeight - winHeight) / 2);
      
      await win.setSize(new (await import('@tauri-apps/api/dpi')).LogicalSize(winWidth, winHeight));
      await win.setPosition(new (await import('@tauri-apps/api/dpi')).LogicalPosition(winX, winY));
    }
    
    setSelectionConfirmed(true);
    setView('editor');
  };

  // 取消选择
  const handleCancelSelection = async () => {
    reset();
    setView('hidden');
    await getCurrentWindow().hide();
  };

  if (view === 'settings') {
    return <Settings />;
  }

  if (view === 'region-select') {
    return <RegionSelector onComplete={handleRegionSelected} />;
  }

  if (view === 'window-select') {
    return <WindowSelector windows={windowList} onCancel={handleCancelSelection} />;
  }

  if (view === 'editor') {
    return <Editor />;
  }

  // 隐藏状态
  return null;
}

export default App;
