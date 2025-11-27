import { useState, useRef, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { useEditorStore } from '@/stores/editorStore';

interface WindowInfo {
  id: number;
  title: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface WindowSelectorProps {
  windows: WindowInfo[];
  onCancel: () => void;
}

export default function WindowSelector({ windows, onCancel }: WindowSelectorProps) {
  const { screenshot, screenshotWidth, screenshotHeight, reset } = useEditorStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredWindow, setHoveredWindow] = useState<WindowInfo | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // 处理鼠标移动 - 找到鼠标下的窗口
  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setMousePos({ x, y });

    // 找到鼠标下的窗口（按 Z 顺序，列表前面的是最上层）
    const found = windows.find(w => 
      x >= w.x && x < w.x + w.width && y >= w.y && y < w.y + w.height
    );
    setHoveredWindow(found || null);
  };

  // 处理点击 - 选择窗口
  const handleClick = async () => {
    if (hoveredWindow) {
      try {
        await invoke('capture_selected_window', { windowId: hoveredWindow.id });
      } catch (error) {
        console.error('Failed to capture window:', error);
        reset();
        await getCurrentWindow().hide();
      }
    }
  };

  // ESC 取消
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onCancel]);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 cursor-crosshair select-none"
      style={{ 
        width: screenshotWidth, 
        height: screenshotHeight,
      }}
      onMouseMove={handleMouseMove}
      onClick={handleClick}
    >
      {/* 截图背景 */}
      {screenshot && (
        <img
          src={`data:image/png;base64,${screenshot}`}
          alt="Screenshot"
          className="absolute inset-0 pointer-events-none"
          style={{
            width: screenshotWidth,
            height: screenshotHeight,
          }}
          draggable={false}
        />
      )}
      
      {/* 半透明遮罩 */}
      <div className="absolute inset-0 bg-black/40 pointer-events-none" />
      
      {/* 高亮选中的窗口 */}
      {hoveredWindow && (
        <>
          {/* 窗口区域高亮 - 使用 background-image 方式 */}
          <div
            className="absolute pointer-events-none"
            style={{
              left: hoveredWindow.x,
              top: hoveredWindow.y,
              width: hoveredWindow.width,
              height: hoveredWindow.height,
              backgroundImage: screenshot ? `url(data:image/png;base64,${screenshot})` : undefined,
              backgroundSize: `${screenshotWidth}px ${screenshotHeight}px`,
              backgroundPosition: `-${hoveredWindow.x}px -${hoveredWindow.y}px`,
            }}
          />
          
          {/* 窗口边框 */}
          <div
            className="absolute border-2 border-blue-500 pointer-events-none"
            style={{
              left: hoveredWindow.x,
              top: hoveredWindow.y,
              width: hoveredWindow.width,
              height: hoveredWindow.height,
              boxShadow: '0 0 0 2000px rgba(0, 0, 0, 0.3)',
            }}
          />
        </>
      )}
      
      {/* 窗口标题提示 */}
      {hoveredWindow && (
        <div 
          className="fixed bg-black/80 text-white px-3 py-1.5 rounded text-sm pointer-events-none max-w-md truncate"
          style={{
            left: Math.min(mousePos.x + 15, screenshotWidth - 200),
            top: Math.min(mousePos.y + 15, screenshotHeight - 40),
          }}
        >
          {hoveredWindow.title || '无标题窗口'}
          <span className="text-gray-400 ml-2">
            {hoveredWindow.width} × {hoveredWindow.height}
          </span>
        </div>
      )}
      
      {/* 顶部提示 */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-black/80 text-white px-4 py-2 rounded-lg text-sm pointer-events-none">
        点击选择窗口 | ESC 取消
      </div>
    </div>
  );
}
