import { useRef, useState, useCallback } from 'react';
import { Layer, Rect, Ellipse, Arrow, Line, Text, Group } from 'react-konva';
import { useEditorStore, Shape } from '@/stores/editorStore';
import Konva from 'konva';
import { Html } from 'react-konva-utils';

// 生成唯一 ID
const generateId = () => Math.random().toString(36).substring(2, 11);

export default function DrawingLayer() {
  const layerRef = useRef<Konva.Layer>(null);
  const {
    currentTool,
    color,
    strokeWidth,
    fontSize,
    shapes,
    addShape,
    updateShape,
    selectedShapeId,
    setSelectedShapeId,
  } = useEditorStore();

  const [isDrawing, setIsDrawing] = useState(false);
  const [tempShape, setTempShape] = useState<Shape | null>(null);
  const [textInput, setTextInput] = useState<{
    x: number;
    y: number;
    visible: boolean;
    value: string;
  }>({ x: 0, y: 0, visible: false, value: '' });

  const startPos = useRef<{ x: number; y: number } | null>(null);
  const penPoints = useRef<number[]>([]);

  // 获取相对于图像的坐标（考虑缩放和平移）
  const getRelativePointerPosition = (stage: Konva.Stage) => {
    const pointer = stage.getPointerPosition();
    if (!pointer) return null;
    
    const transform = stage.getAbsoluteTransform().copy().invert();
    return transform.point(pointer);
  };

  // 开始绘制
  const handleMouseDown = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    // 手型工具不处理绘图
    if (currentTool === 'hand') {
      return;
    }
    
    if (currentTool === 'select') {
      // 点击空白处取消选择
      const clickedOnEmpty = e.target === e.target.getStage() || e.target.getLayer();
      if (clickedOnEmpty) {
        setSelectedShapeId(null);
      }
      return;
    }

    const stage = e.target.getStage();
    if (!stage) return;

    const pos = getRelativePointerPosition(stage);
    if (!pos) return;

    // 文字工具
    if (currentTool === 'text') {
      setTextInput({
        x: pos.x,
        y: pos.y,
        visible: true,
        value: '',
      });
      return;
    }

    startPos.current = pos;
    setIsDrawing(true);

    if (currentTool === 'pen') {
      penPoints.current = [pos.x, pos.y];
      setTempShape({
        id: generateId(),
        type: 'pen',
        x: 0,
        y: 0,
        points: [pos.x, pos.y],
        color,
        strokeWidth,
      });
    }
  }, [currentTool, color, strokeWidth, setSelectedShapeId]);

  // 绘制中
  const handleMouseMove = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    if (!isDrawing || !startPos.current) return;

    const stage = e.target.getStage();
    if (!stage) return;

    const pos = getRelativePointerPosition(stage);
    if (!pos) return;

    const start = startPos.current;

    switch (currentTool) {
      case 'rectangle': {
        const width = pos.x - start.x;
        const height = pos.y - start.y;
        setTempShape({
          id: generateId(),
          type: 'rectangle',
          x: width > 0 ? start.x : pos.x,
          y: height > 0 ? start.y : pos.y,
          width: Math.abs(width),
          height: Math.abs(height),
          color,
          strokeWidth,
        });
        break;
      }
      case 'ellipse': {
        const radiusX = Math.abs(pos.x - start.x) / 2;
        const radiusY = Math.abs(pos.y - start.y) / 2;
        const centerX = (start.x + pos.x) / 2;
        const centerY = (start.y + pos.y) / 2;
        setTempShape({
          id: generateId(),
          type: 'ellipse',
          x: centerX,
          y: centerY,
          width: radiusX,
          height: radiusY,
          color,
          strokeWidth,
        });
        break;
      }
      case 'arrow': {
        setTempShape({
          id: generateId(),
          type: 'arrow',
          x: start.x,
          y: start.y,
          points: [start.x, start.y, pos.x, pos.y],
          color,
          strokeWidth,
        });
        break;
      }
      case 'pen': {
        penPoints.current.push(pos.x, pos.y);
        setTempShape({
          id: generateId(),
          type: 'pen',
          x: 0,
          y: 0,
          points: [...penPoints.current],
          color,
          strokeWidth,
        });
        break;
      }
      case 'mosaic': {
        // 马赛克作为矩形处理
        const mWidth = pos.x - start.x;
        const mHeight = pos.y - start.y;
        setTempShape({
          id: generateId(),
          type: 'mosaic',
          x: mWidth > 0 ? start.x : pos.x,
          y: mHeight > 0 ? start.y : pos.y,
          width: Math.abs(mWidth),
          height: Math.abs(mHeight),
          color: 'mosaic',
          strokeWidth: 8,
        });
        break;
      }
    }
  }, [isDrawing, currentTool, color, strokeWidth]);

  // 结束绘制
  const handleMouseUp = useCallback(() => {
    if (isDrawing && tempShape) {
      addShape(tempShape);
      setTempShape(null);
      startPos.current = null;
      penPoints.current = [];
    }
    setIsDrawing(false);
  }, [isDrawing, tempShape, addShape]);

  // 提交文字
  const handleTextSubmit = useCallback(() => {
    if (textInput.value.trim()) {
      addShape({
        id: generateId(),
        type: 'text',
        x: textInput.x,
        y: textInput.y,
        text: textInput.value,
        color,
        strokeWidth: 0,
        fontSize,
      });
    }
    setTextInput({ ...textInput, visible: false, value: '' });
  }, [textInput, color, fontSize, addShape]);

  // 渲染图形
  const renderShape = (shape: Shape, isTemp = false) => {
    const key = isTemp ? `temp-${shape.id}` : shape.id;
    const isSelected = selectedShapeId === shape.id;

    const commonProps = {
      draggable: !isTemp && currentTool === 'select',
      onClick: () => {
        if (currentTool === 'select') {
          setSelectedShapeId(shape.id);
        }
      },
      onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => {
        updateShape(shape.id, {
          x: e.target.x(),
          y: e.target.y(),
        });
      },
    };

    switch (shape.type) {
      case 'rectangle':
        return (
          <Rect
            key={key}
            x={shape.x}
            y={shape.y}
            width={shape.width}
            height={shape.height}
            stroke={shape.color}
            strokeWidth={shape.strokeWidth}
            shadowBlur={isSelected ? 4 : 0}
            shadowColor={shape.color}
            {...commonProps}
          />
        );
      case 'ellipse':
        return (
          <Ellipse
            key={key}
            x={shape.x}
            y={shape.y}
            radiusX={shape.width || 0}
            radiusY={shape.height || 0}
            stroke={shape.color}
            strokeWidth={shape.strokeWidth}
            shadowBlur={isSelected ? 4 : 0}
            shadowColor={shape.color}
            {...commonProps}
          />
        );
      case 'arrow':
        return (
          <Arrow
            key={key}
            points={shape.points || []}
            stroke={shape.color}
            strokeWidth={shape.strokeWidth}
            fill={shape.color}
            pointerLength={10}
            pointerWidth={10}
            shadowBlur={isSelected ? 4 : 0}
            shadowColor={shape.color}
            {...commonProps}
          />
        );
      case 'pen':
        return (
          <Line
            key={key}
            points={shape.points || []}
            stroke={shape.color}
            strokeWidth={shape.strokeWidth}
            tension={0.5}
            lineCap="round"
            lineJoin="round"
            shadowBlur={isSelected ? 4 : 0}
            shadowColor={shape.color}
            {...commonProps}
          />
        );
      case 'text':
        return (
          <Text
            key={key}
            x={shape.x}
            y={shape.y}
            text={shape.text || ''}
            fontSize={shape.fontSize || 16}
            fill={shape.color}
            shadowBlur={isSelected ? 4 : 0}
            shadowColor={shape.color}
            {...commonProps}
          />
        );
      case 'mosaic':
        // 简化的马赛克效果 - 使用灰色矩形块
        return (
          <Group key={key}>
            <Rect
              x={shape.x}
              y={shape.y}
              width={shape.width}
              height={shape.height}
              fill="#808080"
              opacity={0.8}
              {...commonProps}
            />
          </Group>
        );
      default:
        return null;
    }
  };

  return (
    <Layer
      ref={layerRef}
      name="drawing-layer"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      {/* 已绘制的图形 */}
      {shapes.map((shape) => renderShape(shape))}

      {/* 正在绘制的临时图形 */}
      {tempShape && renderShape(tempShape, true)}

      {/* 文字输入框 */}
      {textInput.visible && (
        <Html
          divProps={{
            style: {
              position: 'absolute',
              left: textInput.x,
              top: textInput.y,
            },
          }}
        >
          <input
            type="text"
            value={textInput.value}
            onChange={(e) => setTextInput({ ...textInput, value: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleTextSubmit();
              }
              if (e.key === 'Escape') {
                setTextInput({ ...textInput, visible: false, value: '' });
              }
            }}
            onBlur={handleTextSubmit}
            autoFocus
            style={{
              border: '2px solid ' + color,
              background: 'white',
              padding: '4px 8px',
              fontSize: fontSize + 'px',
              outline: 'none',
              minWidth: '100px',
            }}
          />
        </Html>
      )}
    </Layer>
  );
}
