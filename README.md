# Xcreenshot

![Version](https://img.shields.io/badge/version-0.9.2-blue)

跨平台截图工具 | Cross-platform Screenshot Tool

基于 Tauri v2 + React + TypeScript 开发

## 功能特性

- **区域截图** - 自由选择截图区域
- **全屏截图** - 一键捕获整个屏幕
- **窗口截图** - 快速截取指定窗口
- **标注工具** - 矩形、椭圆、箭头、画笔、文字、马赛克
- **撤销/重做** - 支持多步操作回退
- **剪贴板** - 一键复制到剪贴板
- **快速保存** - 自动保存到默认目录
- **全局热键** - 随时随地快速截图
- **系统托盘** - 常驻后台，快速访问
- **主题切换** - 支持浅色/深色/跟随系统

## 快捷键

| 功能 | Windows/Linux | macOS |
|------|---------------|-------|
| 区域截图 | `Ctrl+Shift+A` | `Cmd+Shift+A` |
| 全屏截图 | `PrintScreen` | `PrintScreen` |
| 确认截图 | `Enter` | `Enter` |
| 取消截图 | `Esc` | `Esc` |
| 撤销 | `Ctrl+Z` | `Cmd+Z` |
| 重做 | `Ctrl+Y` | `Cmd+Y` |
| 复制到剪贴板 | `Ctrl+C` | `Cmd+C` |
| 快速保存 | `Ctrl+S` | `Cmd+S` |
| 另存为 | `Ctrl+Shift+S` | `Cmd+Shift+S` |

## 绘图工具快捷键

| 工具 | 快捷键 |
|------|--------|
| 矩形 | `R` |
| 椭圆 | `O` |
| 箭头 | `A` |
| 画笔 | `P` |
| 文字 | `T` |
| 马赛克 | `M` |

## 开发

### 环境要求

- Node.js 18+
- pnpm 8+
- Rust 1.70+

### 安装依赖

```bash
# 前端依赖
pnpm install

# Rust 依赖会在首次构建时自动安装
```

### 开发模式

```bash
pnpm tauri dev
```

### 构建发布版本

```bash
pnpm tauri build
```

## 技术栈

| 层级 | 技术选型 |
|------|----------|
| 框架 | Tauri v2 |
| 后端 | Rust |
| 前端 | React + Vite + TypeScript |
| UI | shadcn/ui + TailwindCSS |
| 绘图 | React-Konva |
| 状态 | Zustand |

## 许可证

MIT License
