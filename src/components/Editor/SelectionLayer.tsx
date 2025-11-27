import { useRef, useEffect, useCallback } from 'react';
import { Layer, Rect, Circle, Text, Group } from 'react-konva';
import { useEditorStore } from '@/stores/editorStore';
import Konva from 'konva';

// 控制点方向
type HandlePosition = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

const HANDLE_SIZE = 8;
const HANDLE_COLOR = '#1a73e8';

export default function SelectionLayer() {
  const layerRef = useRef<Konva.Layer>(null);
  const {
    selection,
    setSelection,
    isSelecting,
    setIsSelecting,
    selectionConfirmed,
    confirmSelection,
    screenshotWidth,
    screenshotHeight,
  } = useEditorStore();

  const startPos = useRef<{ x: number; y: number } | null>(null);
  const resizeHandle = useRef<HandlePosition | null>(null);
  const moveStart = useRef<{ x: number; y: number; selX: number; selY: number } | null>(null);

  // 开始选择
  const handleMouseDown = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    if (selectionConfirmed) return;

    const stage = e.target.getStage();
    if (!stage) return;

    const pos = stage.getPointerPosition();
    if (!pos) return;

    startPos.current = pos;
    setIsSelecting(true);
    setSelection({ x: pos.x, y: pos.y, width: 0, height: 0 });
  }, [selectionConfirmed, setIsSelecting, setSelection]);

  // 拖动选择
  const handleMouseMove = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    const stage = e.target.getStage();
    if (!stage) return;

    const pos = stage.getPointerPosition();
    if (!pos) return;

    // 调整选区大小
    if (resizeHandle.current && selection) {
      const handle = resizeHandle.current;
      let newX = selection.x;
      let newY = selection.y;
      let newWidth = selection.width;
      let newHeight = selection.height;

      if (handle.includes('w')) {
        newWidth = selection.x + selection.width - pos.x;
        newX = pos.x;
      }
      if (handle.includes('e')) {
        newWidth = pos.x - selection.x;
      }
      if (handle.includes('n')) {
        newHeight = selection.y + selection.height - pos.y;
        newY = pos.y;
      }
      if (handle.includes('s')) {
        newHeight = pos.y - selection.y;
      }

      // 确保最小尺寸
      if (newWidth > 10 && newHeight > 10) {
        setSelection({ x: newX, y: newY, width: newWidth, height: newHeight });
      }
      return;
    }

    // 移动选区
    if (moveStart.current && selection) {
      const dx = pos.x - moveStart.current.x;
      const dy = pos.y - moveStart.current.y;
      
      let newX = moveStart.current.selX + dx;
      let newY = moveStart.current.selY + dy;

      // 边界检查
      newX = Math.max(0, Math.min(screenshotWidth - selection.width, newX));
      newY = Math.max(0, Math.min(screenshotHeight - selection.height, newY));

      setSelection({ ...selection, x: newX, y: newY });
      return;
    }

    // 绘制选区
    if (isSelecting && startPos.current) {
      const width = pos.x - startPos.current.x;
      const height = pos.y - startPos.current.y;

      setSelection({
        x: width > 0 ? startPos.current.x : pos.x,
        y: height > 0 ? startPos.current.y : pos.y,
        width: Math.abs(width),
        height: Math.abs(height),
      });
    }
  }, [isSelecting, selection, setSelection, screenshotWidth, screenshotHeight]);

  // 结束选择
  const handleMouseUp = useCallback(() => {
    if (isSelecting) {
      setIsSelecting(false);
      startPos.current = null;
    }
    resizeHandle.current = null;
    moveStart.current = null;
  }, [isSelecting, setIsSelecting]);

  // 双击确认选区
  const handleDblClick = useCallback(() => {
    if (selection && selection.width > 10 && selection.height > 10) {
      confirmSelection();
    }
  }, [selection, confirmSelection]);

  // 回车确认
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && selection && !selectionConfirmed) {
        confirmSelection();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selection, selectionConfirmed, confirmSelection]);

  // 控制点位置
  const getHandlePositions = useCallback(() => {
    if (!selection) return [];

    const { x, y, width, height } = selection;
    return [
      { pos: 'nw' as HandlePosition, x: x, y: y },
      { pos: 'n' as HandlePosition, x: x + width / 2, y: y },
      { pos: 'ne' as HandlePosition, x: x + width, y: y },
      { pos: 'e' as HandlePosition, x: x + width, y: y + height / 2 },
      { pos: 'se' as HandlePosition, x: x + width, y: y + height },
      { pos: 's' as HandlePosition, x: x + width / 2, y: y + height },
      { pos: 'sw' as HandlePosition, x: x, y: y + height },
      { pos: 'w' as HandlePosition, x: x, y: y + height / 2 },
    ];
  }, [selection]);

  // 获取控制点光标
  const getHandleCursor = (pos: HandlePosition) => {
    const cursors: Record<HandlePosition, string> = {
      nw: 'nwse-resize',
      n: 'ns-resize',
      ne: 'nesw-resize',
      e: 'ew-resize',
      se: 'nwse-resize',
      s: 'ns-resize',
      sw: 'nesw-resize',
      w: 'ew-resize',
    };
    return cursors[pos];
  };

  return (
    <Layer
      ref={layerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onDblClick={handleDblClick}
    >
      {/* 选区边框 */}
      {selection && (
        <Group>
          {/* 边框 */}
          <Rect
            x={selection.x}
            y={selection.y}
            width={selection.width}
            height={selection.height}
            stroke={HANDLE_COLOR}
            strokeWidth={2}
            listening={!selectionConfirmed}
            onMouseDown={(e) => {
              if (selectionConfirmed) return;
              e.cancelBubble = true;
              const pos = e.target.getStage()?.getPointerPosition();
              if (pos) {
                moveStart.current = {
                  x: pos.x,
                  y: pos.y,
                  selX: selection.x,
                  selY: selection.y,
                };
              }
            }}
          />

          {/* 尺寸显示 */}
          <Text
            x={selection.x}
            y={selection.y - 25}
            text={`${Math.round(selection.width)} x ${Math.round(selection.height)}`}
            fontSize={14}
            fill="white"
            padding={4}
            shadowColor="black"
            shadowBlur={3}
            shadowOpacity={0.5}
          />

          {/* 控制点 */}
          {!selectionConfirmed &&
            getHandlePositions().map(({ pos, x, y }) => (
              <Circle
                key={pos}
                x={x}
                y={y}
                radius={HANDLE_SIZE / 2}
                fill="white"
                stroke={HANDLE_COLOR}
                strokeWidth={2}
                onMouseEnter={(e) => {
                  const stage = e.target.getStage();
                  if (stage) {
                    stage.container().style.cursor = getHandleCursor(pos);
                  }
                }}
                onMouseLeave={(e) => {
                  const stage = e.target.getStage();
                  if (stage) {
                    stage.container().style.cursor = 'crosshair';
                  }
                }}
                onMouseDown={(e) => {
                  e.cancelBubble = true;
                  resizeHandle.current = pos;
                }}
              />
            ))}
        </Group>
      )}
    </Layer>
  );
}
