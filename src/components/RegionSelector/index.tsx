import { useState, useRef } from 'react';
import { useEditorStore } from '@/stores/editorStore';

interface RegionSelectorProps {
  onComplete: () => void;
}

export default function RegionSelector({ onComplete }: RegionSelectorProps) {
  const { screenshot, screenshotWidth, screenshotHeight, setSelection } = useEditorStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState({ x: 0, y: 0 });
  const [currentRect, setCurrentRect] = useState({ x: 0, y: 0, width: 0, height: 0 });
  
  // 窗口使用逻辑像素，截图是物理像素
  const displayWidth = screenshotWidth;
  const displayHeight = screenshotHeight;

  // 鼠标按下开始绘制
  const handleMouseDown = (e: React.MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setIsDrawing(true);
    setStartPoint({ x, y });
    setCurrentRect({ x, y, width: 0, height: 0 });
  };

  // 鼠标移动更新选区
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDrawing) return;
    
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // 计算矩形（支持任意方向拖拽）
    const newRect = {
      x: Math.min(startPoint.x, x),
      y: Math.min(startPoint.y, y),
      width: Math.abs(x - startPoint.x),
      height: Math.abs(y - startPoint.y),
    };
    
    setCurrentRect(newRect);
  };

  // 鼠标释放完成选区
  const handleMouseUp = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    
    // 检查选区是否有效（最小 10x10）
    if (currentRect.width >= 10 && currentRect.height >= 10) {
      setSelection(currentRect);
      onComplete();
    }
  };

  // 双击全选
  const handleDoubleClick = () => {
    setSelection({ x: 0, y: 0, width: displayWidth, height: displayHeight });
    onComplete();
  };

  // 显示选区尺寸
  const sizeText = currentRect.width > 0 && currentRect.height > 0 
    ? `${Math.round(currentRect.width)} × ${Math.round(currentRect.height)}`
    : '拖拽选择区域 / 双击全选';

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 cursor-crosshair select-none"
      style={{ 
        width: displayWidth, 
        height: displayHeight,
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onDoubleClick={handleDoubleClick}
    >
      {/* 截图背景 - 使用 CSS 将物理像素图片缩放到逻辑像素大小 */}
      {screenshot && (
        <img
          src={`data:image/png;base64,${screenshot}`}
          alt="Screenshot"
          className="absolute inset-0 pointer-events-none"
          style={{
            width: displayWidth,
            height: displayHeight,
          }}
          draggable={false}
        />
      )}
      
      {/* 半透明遮罩 */}
      <div className="absolute inset-0 bg-black/50 pointer-events-none" />
      
      {/* 选区高亮 */}
      {currentRect.width > 0 && currentRect.height > 0 && (
        <>
          {/* 选区内的原图 - 使用 background-image 方式 */}
          <div
            className="absolute pointer-events-none"
            style={{
              left: currentRect.x,
              top: currentRect.y,
              width: currentRect.width,
              height: currentRect.height,
              backgroundImage: screenshot ? `url(data:image/png;base64,${screenshot})` : undefined,
              backgroundSize: `${displayWidth}px ${displayHeight}px`,
              backgroundPosition: `-${currentRect.x}px -${currentRect.y}px`,
            }}
          />
          
          {/* 选区边框 */}
          <div
            className="absolute border-2 border-blue-500 pointer-events-none"
            style={{
              left: currentRect.x,
              top: currentRect.y,
              width: currentRect.width,
              height: currentRect.height,
            }}
          />
        </>
      )}
      
      {/* 尺寸提示 */}
      <div 
        className="fixed top-4 left-1/2 -translate-x-1/2 bg-black/80 text-white px-4 py-2 rounded-lg text-sm pointer-events-none"
      >
        {sizeText}
      </div>
      
      {/* 操作提示 */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-black/80 text-white px-4 py-2 rounded-lg text-xs pointer-events-none">
        ESC 取消 | 拖拽选择区域 | 双击全选
      </div>
    </div>
  );
}
