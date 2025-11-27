import { create } from 'zustand';

export type ToolType = 'hand' | 'select' | 'rectangle' | 'ellipse' | 'arrow' | 'line' | 'pen' | 'text' | 'mosaic' | 'blur';
export type CaptureMode = 'fullscreen' | 'window' | 'region';

export interface Shape {
  id: string;
  type: ToolType;
  x: number;
  y: number;
  width?: number;
  height?: number;
  points?: number[];
  text?: string;
  color: string;
  strokeWidth: number;
  fontSize?: number;
  // 用于马赛克和模糊的缓存数据
  cachedImageData?: string;
  originalX?: number;
  originalY?: number;
}

export interface SelectionRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface HistoryState {
  past: Shape[][];
  present: Shape[];
  future: Shape[][];
}

interface EditorState {
  // 截图数据
  screenshot: string | null;
  screenshotWidth: number;
  screenshotHeight: number;
  captureMode: CaptureMode;
  
  // 选区
  selection: SelectionRect | null;
  isSelecting: boolean;
  selectionConfirmed: boolean;
  
  // 绘图工具
  currentTool: ToolType;
  color: string;
  strokeWidth: number;
  fontSize: number;
  
  // 图形
  shapes: Shape[];
  selectedShapeId: string | null;
  
  // 历史记录
  history: HistoryState;
  
  // Actions
  setScreenshot: (data: string, width: number, height: number) => void;
  setCaptureMode: (mode: CaptureMode) => void;
  setSelection: (rect: SelectionRect | null) => void;
  setIsSelecting: (value: boolean) => void;
  setSelectionConfirmed: (value: boolean) => void;
  confirmSelection: () => void;
  setCurrentTool: (tool: ToolType) => void;
  setColor: (color: string) => void;
  setStrokeWidth: (width: number) => void;
  setFontSize: (size: number) => void;
  addShape: (shape: Shape) => void;
  updateShape: (id: string, updates: Partial<Shape>) => void;
  deleteShape: (id: string) => void;
  setSelectedShapeId: (id: string | null) => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  reset: () => void;
}

const MAX_HISTORY = 50;

const initialHistoryState: HistoryState = {
  past: [],
  present: [],
  future: [],
};

export const useEditorStore = create<EditorState>((set, get) => ({
  // 初始状态
  screenshot: null,
  screenshotWidth: 0,
  screenshotHeight: 0,
  captureMode: 'region',
  selection: null,
  isSelecting: false,
  selectionConfirmed: false,
  currentTool: 'hand',
  color: '#ff0000',
  strokeWidth: 2,
  fontSize: 16,
  shapes: [],
  selectedShapeId: null,
  history: initialHistoryState,

  // Actions
  setScreenshot: (data, width, height) => set({
    screenshot: data,
    screenshotWidth: width,
    screenshotHeight: height,
  }),

  setCaptureMode: (mode) => set({ captureMode: mode }),

  setSelection: (rect) => set({ selection: rect }),

  setIsSelecting: (value) => set({ isSelecting: value }),

  setSelectionConfirmed: (value) => set({ selectionConfirmed: value }),

  confirmSelection: () => set({ selectionConfirmed: true }),

  setCurrentTool: (tool) => set({ currentTool: tool, selectedShapeId: null }),

  setColor: (color) => set({ color }),

  setStrokeWidth: (width) => set({ strokeWidth: width }),

  setFontSize: (size) => set({ fontSize: size }),

  addShape: (shape) => {
    const { shapes, history } = get();
    const newShapes = [...shapes, shape];
    const newPast = [...history.past, shapes].slice(-MAX_HISTORY);
    
    set({
      shapes: newShapes,
      history: {
        past: newPast,
        present: newShapes,
        future: [],
      },
    });
  },

  updateShape: (id, updates) => {
    const { shapes } = get();
    set({
      shapes: shapes.map(s => s.id === id ? { ...s, ...updates } : s),
    });
  },

  deleteShape: (id) => {
    const { shapes, history } = get();
    const newShapes = shapes.filter(s => s.id !== id);
    const newPast = [...history.past, shapes].slice(-MAX_HISTORY);
    
    set({
      shapes: newShapes,
      selectedShapeId: null,
      history: {
        past: newPast,
        present: newShapes,
        future: [],
      },
    });
  },

  setSelectedShapeId: (id) => set({ selectedShapeId: id }),

  undo: () => {
    const { history } = get();
    if (history.past.length === 0) return;
    
    const previous = history.past[history.past.length - 1];
    const newPast = history.past.slice(0, -1);
    
    set({
      shapes: previous,
      history: {
        past: newPast,
        present: previous,
        future: [history.present, ...history.future],
      },
    });
  },

  redo: () => {
    const { history } = get();
    if (history.future.length === 0) return;
    
    const next = history.future[0];
    const newFuture = history.future.slice(1);
    
    set({
      shapes: next,
      history: {
        past: [...history.past, history.present],
        present: next,
        future: newFuture,
      },
    });
  },

  canUndo: () => get().history.past.length > 0,

  canRedo: () => get().history.future.length > 0,

  reset: () => set({
    screenshot: null,
    screenshotWidth: 0,
    screenshotHeight: 0,
    selection: null,
    isSelecting: false,
    selectionConfirmed: false,
    currentTool: 'hand',
    shapes: [],
    selectedShapeId: null,
    history: initialHistoryState,
  }),
}));
