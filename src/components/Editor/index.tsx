import { useRef, useEffect, useCallback, useState } from 'react';
import { Stage, Layer, Image as KonvaImage, Rect, Ellipse, Arrow, Line, Text, Group, Circle as KonvaCircle } from 'react-konva';
import { invoke } from '@tauri-apps/api/core';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { useEditorStore, Shape } from '@/stores/editorStore';
import Toolbar from '../Toolbar';
import useImage from 'use-image';
import Konva from 'konva';
// Html removed - using native textarea for better IME support

const TOOLBAR_HEIGHT = 50;
const MIN_SCALE = 0.1;
const MAX_SCALE = 5;
const SCALE_STEP = 0.1;

// 生成唯一 ID
const generateId = () => Math.random().toString(36).substring(2, 11);

// 渲染缓存图像的组件（马赛克/模糊）
function CachedImageShape({ 
  shape, 
  isSelected, 
  scale, 
  commonProps,
  renderAnchors 
}: { 
  shape: Shape; 
  isSelected: boolean; 
  scale: number;
  commonProps: object;
  renderAnchors: (shape: Shape, key: string, useRelativePos?: boolean) => React.ReactNode;
}) {
  const [cachedImage] = useImage(shape.cachedImageData || '');
  const w = shape.width || 0;
  const h = shape.height || 0;
  
  if (cachedImage && w > 0 && h > 0) {
    return (
      <Group x={shape.x} y={shape.y} {...commonProps}>
        <KonvaImage image={cachedImage} x={0} y={0} width={w} height={h} />
        {isSelected && (
          <Rect x={0} y={0} width={w} height={h} 
            stroke="#2196f3" strokeWidth={2 / scale} dash={[4 / scale, 4 / scale]} listening={false} />
        )}
        {renderAnchors(shape, shape.id, true)}
      </Group>
    );
  }
  
  // 占位符
  return (
    <Group x={shape.x} y={shape.y} {...commonProps}>
      <Rect x={0} y={0} width={w} height={h}
        fill="rgba(150,150,150,0.5)" stroke="#999" strokeWidth={1} dash={[4, 4]} />
      {renderAnchors(shape, shape.id, true)}
    </Group>
  );
}

export default function Editor() {
  const stageRef = useRef<Konva.Stage>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const {
    screenshot,
    screenshotWidth,
    screenshotHeight,
    currentTool,
    color,
    strokeWidth,
    fontSize,
    shapes,
    addShape,
    updateShape,
    selectedShapeId,
    setSelectedShapeId,
    reset,
  } = useEditorStore();

  // 缩放和平移状态
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [containerSize, setContainerSize] = useState({ width: 800, height: 600 });
  
  // 绘图状态
  const [isDrawing, setIsDrawing] = useState(false);
  const [tempShape, setTempShape] = useState<Shape | null>(null);
  const [textInput, setTextInput] = useState<{ x: number; y: number; visible: boolean; value: string }>({
    x: 0, y: 0, visible: false, value: ''
  });
  const startPos = useRef<{ x: number; y: number } | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const penPoints = useRef<number[]>([]);

  // 图像的实际尺寸
  const imageWidth = screenshotWidth || 800;
  const imageHeight = screenshotHeight || 600;

  // 加载截图
  const [image] = useImage(screenshot ? `data:image/png;base64,${screenshot}` : '');

  // 计算初始缩放以适应容器
  useEffect(() => {
    if (containerRef.current && imageWidth > 0 && imageHeight > 0) {
      const container = containerRef.current;
      const containerWidth = container.clientWidth;
      const containerHeight = container.clientHeight;
      
      setContainerSize({ width: containerWidth, height: containerHeight });
      
      // 如果图像大于容器，缩放适应；否则保持原大小
      if (imageWidth > containerWidth || imageHeight > containerHeight) {
        const scaleX = containerWidth / imageWidth;
        const scaleY = containerHeight / imageHeight;
        const fitScale = Math.min(scaleX, scaleY);
        setScale(fitScale);
        
        // 居中显示
        const offsetX = (containerWidth - imageWidth * fitScale) / 2;
        const offsetY = (containerHeight - imageHeight * fitScale) / 2;
        setPosition({ x: offsetX, y: offsetY });
      } else {
        // 图像小于容器，保持原大小居中
        setScale(1);
        const offsetX = (containerWidth - imageWidth) / 2;
        const offsetY = (containerHeight - imageHeight) / 2;
        setPosition({ x: offsetX, y: offsetY });
      }
    }
  }, [imageWidth, imageHeight, screenshot]);

  // 切换工具时结束文本输入
  useEffect(() => {
    if (textInput.visible && currentTool !== 'text') {
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
      setTextInput({ x: 0, y: 0, visible: false, value: '' });
    }
  }, [currentTool]);
  
  // 文本输入框显示时自动聚焦
  useEffect(() => {
    if (textInput.visible && textareaRef.current) {
      // 延迟聚焦以确保 DOM 已更新
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 50);
    }
  }, [textInput.visible]);

  // 获取相对于图像的坐标（考虑缩放和平移）
  const getRelativePointerPosition = useCallback((stage: Konva.Stage) => {
    const pointer = stage.getPointerPosition();
    if (!pointer) return null;
    const transform = stage.getAbsoluteTransform().copy().invert();
    return transform.point(pointer);
  }, []);

  // 滚轮缩放
  const handleWheel = useCallback((e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    
    const stage = stageRef.current;
    if (!stage) return;

    const oldScale = scale;
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    // 计算新缩放
    const direction = e.evt.deltaY > 0 ? -1 : 1;
    const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, oldScale + direction * SCALE_STEP));
    
    // 以鼠标位置为中心缩放
    const mousePointTo = {
      x: (pointer.x - position.x) / oldScale,
      y: (pointer.y - position.y) / oldScale,
    };

    const newPos = {
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    };

    setScale(newScale);
    setPosition(newPos);
  }, [scale, position]);

  // 开始绘制
  const handleMouseDown = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    // 如果正在输入文本，点击其他位置结束输入
    if (textInput.visible) {
      if (textInput.value.trim()) {
        handleTextSubmit();
      } else {
        setTextInput({ ...textInput, visible: false, value: '' });
      }
      return;
    }
    
    if (currentTool === 'hand') return;
    
    if (currentTool === 'select') {
      const clickedOnEmpty = e.target === e.target.getStage();
      if (clickedOnEmpty) {
        setSelectedShapeId(null);
      }
      return;
    }

    const stage = e.target.getStage();
    if (!stage) return;

    const pos = getRelativePointerPosition(stage);
    if (!pos) return;

    if (currentTool === 'text') {
      setTextInput({ x: pos.x, y: pos.y, visible: true, value: '' });
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
  }, [currentTool, color, strokeWidth, setSelectedShapeId, getRelativePointerPosition]);

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
        setTempShape({
          id: generateId(),
          type: 'ellipse',
          x: (start.x + pos.x) / 2,
          y: (start.y + pos.y) / 2,
          width: radiusX,
          height: radiusY,
          color,
          strokeWidth,
        });
        break;
      }
      case 'arrow': {
        // 箭头：起点是箭尖位置，终点是直线末端
        setTempShape({
          id: generateId(),
          type: 'arrow',
          x: start.x,
          y: start.y,
          points: [pos.x, pos.y, start.x, start.y], // 从终点指向起点（箭尖）
          color,
          strokeWidth,
        });
        break;
      }
      case 'line': {
        setTempShape({
          id: generateId(),
          type: 'line',
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
          strokeWidth: 10, // 马赛克块大小
        });
        break;
      }
      case 'blur': {
        const bWidth = pos.x - start.x;
        const bHeight = pos.y - start.y;
        setTempShape({
          id: generateId(),
          type: 'blur',
          x: bWidth > 0 ? start.x : pos.x,
          y: bHeight > 0 ? start.y : pos.y,
          width: Math.abs(bWidth),
          height: Math.abs(bHeight),
          color: 'blur',
          strokeWidth: 10, // 模糊强度
        });
        break;
      }
    }
  }, [isDrawing, currentTool, color, strokeWidth, getRelativePointerPosition]);

  // 生成马赛克图像数据
  const generateMosaicImage = useCallback((shape: Shape): string | undefined => {
    if (!image || !shape.width || !shape.height) return undefined;
    
    const blockSize = shape.strokeWidth || 10;
    const w = shape.width;
    const h = shape.height;
    const smallW = Math.ceil(w / blockSize);
    const smallH = Math.ceil(h / blockSize);
    
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;
    
    ctx.imageSmoothingEnabled = false;
    
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = smallW;
    tempCanvas.height = smallH;
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) return undefined;
    
    // 使用 originalX/Y 或 x/y
    const srcX = shape.originalX ?? shape.x;
    const srcY = shape.originalY ?? shape.y;
    
    tempCtx.drawImage(image, srcX, srcY, w, h, 0, 0, smallW, smallH);
    ctx.drawImage(tempCanvas, 0, 0, smallW, smallH, 0, 0, w, h);
    
    return canvas.toDataURL();
  }, [image]);

  // 生成模糊图像数据
  const generateBlurImage = useCallback((shape: Shape): string | undefined => {
    if (!image || !shape.width || !shape.height) return undefined;
    
    const blurRadius = shape.strokeWidth || 10;
    const w = shape.width;
    const h = shape.height;
    
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;
    
    // 使用 originalX/Y 或 x/y
    const srcX = shape.originalX ?? shape.x;
    const srcY = shape.originalY ?? shape.y;
    
    ctx.filter = `blur(${blurRadius}px)`;
    ctx.drawImage(image, srcX, srcY, w, h, 0, 0, w, h);
    
    return canvas.toDataURL();
  }, [image]);

  // 结束绘制
  const handleMouseUp = useCallback(() => {
    if (isDrawing && tempShape) {
      let shapeToAdd = { ...tempShape };
      
      // 为马赛克和模糊生成缓存图像
      if (tempShape.type === 'mosaic') {
        shapeToAdd.cachedImageData = generateMosaicImage(tempShape);
        shapeToAdd.originalX = tempShape.x;
        shapeToAdd.originalY = tempShape.y;
      } else if (tempShape.type === 'blur') {
        shapeToAdd.cachedImageData = generateBlurImage(tempShape);
        shapeToAdd.originalX = tempShape.x;
        shapeToAdd.originalY = tempShape.y;
      }
      
      addShape(shapeToAdd);
      setTempShape(null);
      startPos.current = null;
      penPoints.current = [];
    }
    setIsDrawing(false);
  }, [isDrawing, tempShape, addShape, generateMosaicImage, generateBlurImage]);

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

  // 渲染锚点
  const renderAnchors = (shape: Shape, key: string, useRelativePos = false) => {
    if (selectedShapeId !== shape.id || currentTool !== 'select') return null;
    
    const anchorSize = 8 / scale; // 根据缩放调整锚点大小
    const anchors: { x: number; y: number; cursor: string; onDrag: (dx: number, dy: number) => Partial<Shape> }[] = [];
    
    // 对于 mosaic/blur，锚点使用相对位置（因为 Group 已经在 shape.x, shape.y）
    const baseX = useRelativePos ? 0 : shape.x;
    const baseY = useRelativePos ? 0 : shape.y;
    
    if (shape.type === 'rectangle' || shape.type === 'mosaic' || shape.type === 'blur') {
      const w = shape.width || 0;
      const h = shape.height || 0;
      // 四角锚点
      anchors.push(
        { x: baseX, y: baseY, cursor: 'nwse-resize', onDrag: (dx, dy) => ({ x: shape.x + dx, y: shape.y + dy, width: w - dx, height: h - dy }) },
        { x: baseX + w, y: baseY, cursor: 'nesw-resize', onDrag: (dx, dy) => ({ y: shape.y + dy, width: w + dx, height: h - dy }) },
        { x: baseX, y: baseY + h, cursor: 'nesw-resize', onDrag: (dx, dy) => ({ x: shape.x + dx, width: w - dx, height: h + dy }) },
        { x: baseX + w, y: baseY + h, cursor: 'nwse-resize', onDrag: (dx, dy) => ({ width: w + dx, height: h + dy }) },
      );
    } else if (shape.type === 'ellipse') {
      const rx = shape.width || 0;
      const ry = shape.height || 0;
      // 四边锚点
      anchors.push(
        { x: shape.x - rx, y: shape.y, cursor: 'ew-resize', onDrag: (dx) => ({ width: rx - dx }) },
        { x: shape.x + rx, y: shape.y, cursor: 'ew-resize', onDrag: (dx) => ({ width: rx + dx }) },
        { x: shape.x, y: shape.y - ry, cursor: 'ns-resize', onDrag: (_, dy) => ({ height: ry - dy }) },
        { x: shape.x, y: shape.y + ry, cursor: 'ns-resize', onDrag: (_, dy) => ({ height: ry + dy }) },
      );
    } else if ((shape.type === 'arrow' || shape.type === 'line') && shape.points) {
      // 起点和终点锚点
      const pts = shape.points;
      anchors.push(
        { x: pts[0], y: pts[1], cursor: 'move', onDrag: (dx, dy) => ({ points: [pts[0] + dx, pts[1] + dy, pts[2], pts[3]] }) },
        { x: pts[2], y: pts[3], cursor: 'move', onDrag: (dx, dy) => ({ points: [pts[0], pts[1], pts[2] + dx, pts[3] + dy] }) },
      );
    }
    
    return anchors.map((anchor, i) => (
      <KonvaCircle
        key={`${key}-anchor-${i}`}
        x={anchor.x}
        y={anchor.y}
        radius={anchorSize}
        fill="white"
        stroke="#2196f3"
        strokeWidth={2 / scale}
        draggable
        onDragMove={(e) => {
          const dx = e.target.x() - anchor.x;
          const dy = e.target.y() - anchor.y;
          const updates = anchor.onDrag(dx, dy);
          updateShape(shape.id, updates);
          e.target.position({ x: anchor.x, y: anchor.y }); // 重置锚点位置（会被重新渲染）
        }}
        onMouseEnter={(e) => {
          const container = e.target.getStage()?.container();
          if (container) container.style.cursor = anchor.cursor;
        }}
        onMouseLeave={(e) => {
          const container = e.target.getStage()?.container();
          if (container) container.style.cursor = 'default';
        }}
      />
    ));
  };

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
        updateShape(shape.id, { x: e.target.x(), y: e.target.y() });
      },
    };

    switch (shape.type) {
      case 'rectangle':
        return (
          <Group key={key}>
            <Rect x={shape.x} y={shape.y} width={shape.width} height={shape.height}
              stroke={shape.color} strokeWidth={shape.strokeWidth}
              shadowBlur={isSelected ? 4 : 0} shadowColor={shape.color} {...commonProps} />
            {isSelected && <Rect x={shape.x} y={shape.y} width={shape.width} height={shape.height}
              stroke="#2196f3" strokeWidth={1 / scale} dash={[4 / scale, 4 / scale]} listening={false} />}
            {renderAnchors(shape, key)}
          </Group>
        );
      case 'ellipse':
        return (
          <Group key={key}>
            <Ellipse x={shape.x} y={shape.y} radiusX={shape.width || 0} radiusY={shape.height || 0}
              stroke={shape.color} strokeWidth={shape.strokeWidth}
              shadowBlur={isSelected ? 4 : 0} shadowColor={shape.color} {...commonProps} />
            {isSelected && <Ellipse x={shape.x} y={shape.y} radiusX={shape.width || 0} radiusY={shape.height || 0}
              stroke="#2196f3" strokeWidth={1 / scale} dash={[4 / scale, 4 / scale]} listening={false} />}
            {renderAnchors(shape, key)}
          </Group>
        );
      case 'arrow':
        return (
          <Group key={key}>
            <Arrow points={shape.points || []} stroke={shape.color} strokeWidth={shape.strokeWidth}
              fill={shape.color} pointerLength={12} pointerWidth={10}
              shadowBlur={isSelected ? 4 : 0} shadowColor={shape.color} {...commonProps} />
            {renderAnchors(shape, key)}
          </Group>
        );
      case 'line':
        return (
          <Group key={key}>
            <Line points={shape.points || []} stroke={shape.color} strokeWidth={shape.strokeWidth}
              lineCap="round" shadowBlur={isSelected ? 4 : 0} shadowColor={shape.color} {...commonProps} />
            {renderAnchors(shape, key)}
          </Group>
        );
      case 'pen':
        return (
          <Line key={key} points={shape.points || []} stroke={shape.color} strokeWidth={shape.strokeWidth}
            tension={0.5} lineCap="round" lineJoin="round"
            shadowBlur={isSelected ? 4 : 0} shadowColor={shape.color} {...commonProps} />
        );
      case 'text':
        return (
          <Text key={key} x={shape.x} y={shape.y} text={shape.text || ''} fontSize={shape.fontSize || 16}
            fill={shape.color} shadowBlur={isSelected ? 4 : 0} shadowColor={shape.color} {...commonProps} />
        );
      case 'mosaic':
      case 'blur': {
        const w = shape.width || 0;
        const h = shape.height || 0;
        
        // 临时绘制时显示预览框
        if (isTemp) {
          return (
            <Group key={key}>
              <Rect x={shape.x} y={shape.y} width={w} height={h}
                fill={shape.type === 'mosaic' ? "rgba(100,100,100,0.3)" : "rgba(200,200,255,0.3)"}
                stroke={shape.type === 'mosaic' ? "#666" : "#99f"} 
                strokeWidth={2} dash={[4, 4]} />
            </Group>
          );
        }
        
        // 已完成的图形使用 CachedImageShape 组件
        if (shape.cachedImageData) {
          return (
            <CachedImageShape 
              key={key}
              shape={shape}
              isSelected={isSelected}
              scale={scale}
              commonProps={commonProps}
              renderAnchors={renderAnchors}
            />
          );
        }
        
        // 占位符
        return (
          <Group key={key} x={shape.x} y={shape.y} {...commonProps}>
            <Rect x={0} y={0} width={w} height={h}
              fill="rgba(150,150,150,0.5)" stroke="#999" strokeWidth={1} dash={[4, 4]} />
            {renderAnchors(shape, key, true)}
          </Group>
        );
      }
      default:
        return null;
    }
  };

  // 预加载图像
  const loadImage = (src: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new window.Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  };

  // 导出图像（导出原始大小，不受缩放影响）
  const exportImage = useCallback(async (): Promise<string | null> => {
    if (!stageRef.current || !image) return null;

    // 预加载所有 mosaic/blur 缓存图像
    const cachedImages: Map<string, HTMLImageElement> = new Map();
    for (const shape of shapes) {
      if ((shape.type === 'mosaic' || shape.type === 'blur') && shape.cachedImageData) {
        try {
          const img = await loadImage(shape.cachedImageData);
          cachedImages.set(shape.id, img);
        } catch (e) {
          console.error('Failed to load cached image for shape:', shape.id);
        }
      }
    }

    // 使用 canvas 直接渲染
    const canvas = document.createElement('canvas');
    canvas.width = imageWidth;
    canvas.height = imageHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // 绘制背景图像
    ctx.drawImage(image, 0, 0, imageWidth, imageHeight);

    // 遍历所有绘制的图形并渲染
    for (const shape of shapes) {
      ctx.save();
      
      switch (shape.type) {
        case 'rectangle':
          ctx.strokeStyle = shape.color;
          ctx.lineWidth = shape.strokeWidth;
          ctx.strokeRect(shape.x, shape.y, shape.width || 0, shape.height || 0);
          break;
          
        case 'ellipse':
          ctx.strokeStyle = shape.color;
          ctx.lineWidth = shape.strokeWidth;
          ctx.beginPath();
          ctx.ellipse(shape.x, shape.y, shape.width || 0, shape.height || 0, 0, 0, Math.PI * 2);
          ctx.stroke();
          break;
          
        case 'arrow':
        case 'line':
          if (shape.points && shape.points.length >= 4) {
            ctx.strokeStyle = shape.color;
            ctx.lineWidth = shape.strokeWidth;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(shape.points[0], shape.points[1]);
            ctx.lineTo(shape.points[2], shape.points[3]);
            ctx.stroke();
            
            // 箭头头部
            if (shape.type === 'arrow') {
              const angle = Math.atan2(shape.points[1] - shape.points[3], shape.points[0] - shape.points[2]);
              const headLen = 12;
              ctx.fillStyle = shape.color;
              ctx.beginPath();
              ctx.moveTo(shape.points[0], shape.points[1]);
              ctx.lineTo(
                shape.points[0] - headLen * Math.cos(angle - Math.PI / 6),
                shape.points[1] - headLen * Math.sin(angle - Math.PI / 6)
              );
              ctx.lineTo(
                shape.points[0] - headLen * Math.cos(angle + Math.PI / 6),
                shape.points[1] - headLen * Math.sin(angle + Math.PI / 6)
              );
              ctx.closePath();
              ctx.fill();
            }
          }
          break;
          
        case 'pen':
          if (shape.points && shape.points.length >= 2) {
            ctx.strokeStyle = shape.color;
            ctx.lineWidth = shape.strokeWidth;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.beginPath();
            ctx.moveTo(shape.points[0], shape.points[1]);
            for (let i = 2; i < shape.points.length; i += 2) {
              ctx.lineTo(shape.points[i], shape.points[i + 1]);
            }
            ctx.stroke();
          }
          break;
          
        case 'text':
          ctx.fillStyle = shape.color;
          ctx.font = `${shape.fontSize || 16}px sans-serif`;
          const lines = (shape.text || '').split('\n');
          lines.forEach((line, i) => {
            ctx.fillText(line, shape.x, shape.y + (i + 1) * (shape.fontSize || 16));
          });
          break;
          
        case 'mosaic':
        case 'blur': {
          const cachedImg = cachedImages.get(shape.id);
          if (cachedImg) {
            ctx.drawImage(cachedImg, shape.x, shape.y, shape.width || 0, shape.height || 0);
          }
          break;
        }
      }
      
      ctx.restore();
    }

    const dataUrl = canvas.toDataURL('image/png');
    return dataUrl.replace(/^data:image\/png;base64,/, '');
  }, [image, imageWidth, imageHeight, shapes]);

  // 复制到剪贴板
  const copyToClipboard = useCallback(async () => {
    const imageData = await exportImage();
    if (!imageData) return;

    try {
      await invoke('copy_to_clipboard', { imageData });
      reset();
      await getCurrentWindow().hide();
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  }, [exportImage, reset]);

  // 保存图片
  const saveImage = useCallback(async (quickSave: boolean) => {
    console.log('[saveImage] Starting, quickSave:', quickSave);
    const imageData = await exportImage();
    console.log('[saveImage] imageData length:', imageData?.length);
    if (!imageData) {
      console.error('[saveImage] No image data');
      return;
    }

    try {
      const win = getCurrentWindow();
      
      if (quickSave) {
        console.log('[saveImage] Quick save...');
        await invoke('quick_save_image', { imageData });
        reset();
        await win.hide();
      } else {
        console.log('[saveImage] Opening save dialog...');
        // 保存对话框前取消置顶并最小化，以便对话框正常显示
        await win.setAlwaysOnTop(false);
        await win.minimize();
        
        try {
          const result = await invoke('save_image_dialog', { imageData });
          console.log('[saveImage] Save result:', result);
          reset();
          await win.hide();
        } catch (error) {
          console.error('[saveImage] Save dialog error:', error);
          // 用户取消保存，恢复窗口
          await win.unminimize();
          await win.setAlwaysOnTop(true);
        }
      }
    } catch (error) {
      console.error('[saveImage] Failed to save image:', error);
    }
  }, [exportImage, reset]);

  // 快捷键处理
  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'c') {
        await copyToClipboard();
      }
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        await saveImage(!e.shiftKey);
      }
      if (e.ctrlKey && e.key === 'z' && !e.shiftKey) {
        useEditorStore.getState().undo();
      }
      if ((e.ctrlKey && e.key === 'y') || (e.ctrlKey && e.shiftKey && e.key === 'z')) {
        useEditorStore.getState().redo();
      }
      // 重置缩放
      if (e.ctrlKey && e.key === '0') {
        e.preventDefault();
        setScale(1);
        setPosition({ x: 0, y: 0 });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [copyToClipboard, saveImage]);

  // 取消截图
  const handleCancel = useCallback(async () => {
    reset();
    await getCurrentWindow().hide();
  }, [reset]);

  if (!screenshot) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-900">
        <div className="text-white">加载中...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col bg-gray-800 select-none w-full h-full">
      {/* 工具栏在顶部 */}
      <div className="flex items-center justify-between px-2" style={{ height: TOOLBAR_HEIGHT }}>
        <Toolbar
          onConfirm={copyToClipboard}
          onCancel={handleCancel}
          onSave={() => saveImage(false)}
        />
        {/* 缩放信息 */}
        <div className="text-white text-sm bg-gray-700 px-2 py-1 rounded">
          {Math.round(scale * 100)}%
        </div>
      </div>

      {/* 画布区域 */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-hidden bg-gray-900"
        style={{ 
          backgroundImage: 'linear-gradient(45deg, #333 25%, transparent 25%), linear-gradient(-45deg, #333 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #333 75%), linear-gradient(-45deg, transparent 75%, #333 75%)',
          backgroundSize: '20px 20px',
          backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
        }}
      >
        <Stage
          ref={stageRef}
          width={containerSize.width}
          height={containerSize.height}
          scaleX={scale}
          scaleY={scale}
          x={position.x}
          y={position.y}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          draggable={currentTool === 'hand'}
          onDragEnd={(e) => {
            if (currentTool === 'hand') {
              setPosition({
                x: e.target.x(),
                y: e.target.y(),
              });
            }
          }}
          style={{ cursor: currentTool === 'hand' ? 'grab' : 'crosshair' }}
        >
          {/* 背景图层 */}
          <Layer>
            {image && (
              <KonvaImage
                image={image}
                x={0}
                y={0}
                width={imageWidth}
                height={imageHeight}
              />
            )}
            {/* 透明背景用于捕获鼠标事件 */}
            <Rect
              x={0}
              y={0}
              width={imageWidth}
              height={imageHeight}
              fill="transparent"
            />
          </Layer>

          {/* 绘图层 */}
          <Layer name="drawing-layer">
            {/* 已绘制的图形 */}
            {shapes.map((shape) => renderShape(shape))}
            {/* 正在绘制的临时图形 */}
            {tempShape && renderShape(tempShape, true)}
          </Layer>
          
        </Stage>
        
        {/* 文字输入 - 在 Stage 外部渲染以确保输入法正常工作 */}
        {textInput.visible && (
          <textarea
            ref={textareaRef}
            value={textInput.value}
            onChange={(e) => setTextInput({ ...textInput, value: e.target.value })}
            onKeyDown={(e) => {
              e.stopPropagation(); // 阻止快捷键干扰
              // Alt+Enter 结束输入
              if (e.altKey && e.key === 'Enter') {
                e.preventDefault();
                handleTextSubmit();
                return;
              }
              // Escape 取消输入
              if (e.key === 'Escape') {
                setTextInput({ ...textInput, visible: false, value: '' });
              }
              // 普通 Enter 允许换行（默认行为）
            }}
            onBlur={() => {
              // 点击其他地方时提交
              if (textInput.value.trim()) {
                handleTextSubmit();
              } else {
                setTextInput({ ...textInput, visible: false, value: '' });
              }
            }}
            placeholder="输入文字..."
            style={{
              position: 'absolute',
              left: textInput.x * scale + position.x,
              top: textInput.y * scale + position.y + TOOLBAR_HEIGHT,
              border: '2px solid ' + color,
              background: 'rgba(255,255,255,0.95)',
              padding: '4px 8px',
              fontSize: fontSize * scale + 'px',
              outline: 'none',
              minWidth: '120px',
              minHeight: '40px',
              resize: 'both',
              borderRadius: '4px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
              caretColor: color,
              zIndex: 1000,
            }}
          />
        )}
      </div>
    </div>
  );
}
