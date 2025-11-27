# Xcreenshot 开发检查清单

> 跨平台截图工具 | Tauri v2 + React + TypeScript

---

## 技术栈速览

| 层级 | 技术选型 |
|------|----------|
| 框架 | Tauri v2 |
| 后端 | Rust |
| 前端 | React + Vite + TypeScript |
| UI | shadcn/ui + TailwindCSS |
| 绘图 | React-Konva |
| 状态 | Zustand |

### 核心依赖

| 功能 | Crate/包 |
|------|----------|
| 截图 | `xcap` |
| 热键 | `tauri-plugin-global-shortcut` |
| 剪贴板 | `arboard` |
| 图像 | `image` |
| 配置 | `tauri-plugin-store` |
| 自启动 | `tauri-plugin-autostart` |

---

## 阶段一：项目初始化与托盘系统

### 1.1 项目脚手架

- [ ] **1.1.1** 使用 `pnpm create tauri-app` 创建 Tauri v2 项目
  - 选择 React + TypeScript 模板
  - 项目名称: `xcreenshot`
- [ ] **1.1.2** 配置开发工具链
  - ESLint + Prettier (前端)
  - rustfmt + clippy (Rust)
- [ ] **1.1.3** 安装前端依赖
  ```bash
  pnpm add zustand react-konva konva
  pnpm add -D tailwindcss postcss autoprefixer
  npx tailwindcss init -p
  ```
- [ ] **1.1.4** 安装 shadcn/ui
  ```bash
  npx shadcn-ui@latest init
  ```
- [ ] **1.1.5** 添加 Rust 依赖 (`src-tauri/Cargo.toml`)
  ```toml
  [dependencies]
  xcap = "0.0.14"
  arboard = { version = "3", features = ["image-data"] }
  image = "0.25"
  base64 = "0.22"
  ```

**验收标准**: `pnpm tauri dev` 能启动空白 React 应用

---

### 1.2 窗口配置

- [ ] **1.2.1** 修改 `tauri.conf.json` 主窗口配置
  ```json
  {
    "label": "main",
    "title": "Xcreenshot",
    "visible": false,
    "decorations": false,
    "transparent": true,
    "skipTaskbar": true,
    "alwaysOnTop": true,
    "resizable": false
  }
  ```
  > 注意: `skipTaskbar: true` 确保应用不显示任务栏图标
- [ ] **1.2.2** 添加设置窗口配置
  ```json
  {
    "label": "settings",
    "title": "设置 - Xcreenshot",
    "width": 600,
    "height": 500,
    "visible": false,
    "center": true,
    "resizable": false,
    "skipTaskbar": true
  }
  ```
- [ ] **1.2.3** 配置窗口权限 (`capabilities`)
  - 允许窗口操作 (`window:allow-show`, `window:allow-hide`, 等)

**验收标准**: 配置文件无语法错误，应用可正常编译

---

### 1.3 托盘实现

- [ ] **1.3.1** 准备托盘图标
  - `icons/tray-icon.png` (32x32)
  - `icons/tray-icon@2x.png` (64x64)
  - 支持格式: PNG with transparency
- [ ] **1.3.2** 创建托盘模块 `src-tauri/src/tray.rs`
  ```rust
  // 实现托盘创建函数
  pub fn create_tray(app: &AppHandle) -> Result<()>
  ```
- [ ] **1.3.3** 实现托盘菜单（一级菜单，无子菜单）
  - 🖥️ 全屏截图 (`fullscreen`)
  - 🪟 窗口截图 (`window`)
  - ✂️ 区域截图 (`region`)
  - ➖ 分隔线
  - ⚙️ 设置 (`settings`)
  - ➖ 分隔线
  - ❌ 退出 (`quit`)
- [ ] **1.3.4** 托盘事件处理
  - 左键单击: 触发区域截图（默认模式）
  - 右键单击: 显示菜单
  - 菜单项点击: 执行对应截图模式
- [ ] **1.3.5** 在 `main.rs` 中初始化托盘
  ```rust
  .setup(|app| {
      tray::create_tray(app.handle())?;
      Ok(())
  })
  ```

**验收标准**: 
- 托盘图标正常显示
- 右键菜单可点击
- "退出" 可关闭应用

---

### 1.4 全局热键

- [ ] **1.4.1** 添加插件依赖
  ```bash
  pnpm tauri add global-shortcut
  ```
- [ ] **1.4.2** 配置插件权限 (`capabilities`)
- [ ] **1.4.3** 注册默认热键
  - `Ctrl+Shift+A` (Windows) / `Super+Shift+A` (Linux): 区域截图
  - `PrintScreen`: 全屏截图
- [ ] **1.4.4** 热键触发时发送事件到前端
  ```rust
  app.emit("start-capture", payload)?;
  ```

**验收标准**: 按下热键后控制台打印事件日志

---

## 阶段二：截图核心功能

### 2.1 屏幕捕获后端

- [ ] **2.1.1** 创建截图模块 `src-tauri/src/capture.rs`
- [ ] **2.1.2** 实现显示器枚举
  ```rust
  #[tauri::command]
  pub fn get_monitors() -> Result<Vec<MonitorInfo>, String>
  ```
  返回: `{ id, name, x, y, width, height, scale_factor }`
- [ ] **2.1.3** 实现屏幕捕获
  ```rust
  #[tauri::command]
  pub fn capture_screen(monitor_id: usize) -> Result<String, String>
  ```
  返回: Base64 编码的 PNG 图像
- [ ] **2.1.4** 实现全屏截图（所有显示器）
  ```rust
  #[tauri::command]
  pub fn capture_all_screens() -> Result<Vec<ScreenCapture>, String>
  ```
- [ ] **2.1.5** Linux Wayland 权限处理
  - 首次启动检测 Wayland 环境
  - 引导用户配置 Systemd 用户服务
  - 创建 `~/.config/systemd/user/xcreenshot.service`
  - 使用 PolicyKit 请求一次性管理员权限
  - 后续截图无需再次授权

**验收标准**: 
- 调用 `capture_screen(0)` 返回有效 Base64 字符串
- 前端可解码并显示图片

---

### 2.2 窗口检测 (窗口截图)

- [ ] **2.2.1** 实现窗口枚举
  ```rust
  #[tauri::command]
  pub fn get_windows() -> Result<Vec<WindowInfo>, String>
  ```
  返回: `{ id, title, x, y, width, height, is_visible }`
- [ ] **2.2.2** 实现窗口截图
  ```rust
  #[tauri::command]
  pub fn capture_window(window_id: u32) -> Result<String, String>
  ```
- [ ] **2.2.3** 鼠标位置检测
  ```rust
  #[tauri::command]
  pub fn get_window_at_cursor() -> Result<Option<WindowInfo>, String>
  ```

**验收标准**: 可获取鼠标下窗口信息并截取

---

### 2.3 编辑器窗口管理

- [ ] **2.3.1** 实现截图前隐藏主窗口（避免截到自己）
- [ ] **2.3.2** 截图完成后创建全屏编辑窗口
  ```rust
  WebviewWindowBuilder::new(app, "editor", url)
      .fullscreen(true)
      .decorations(false)
      .always_on_top(true)
      .build()?;
  ```
- [ ] **2.3.3** 窗口定位到正确显示器
- [ ] **2.3.4** 实现 ESC 键关闭编辑器

**验收标准**: 热键触发后全屏显示截图画布

---

## 阶段三：Canvas 编辑器

### 3.1 Konva 基础架构

- [ ] **3.1.1** 创建编辑器组件 `src/components/Editor/index.tsx`
- [ ] **3.1.2** 实现图层结构
  ```
  Stage
  ├── BackgroundLayer (截图底图)
  ├── MaskLayer (区域选择遮罩)
  ├── DrawingLayer (标注绘制)
  └── UILayer (工具栏等)
  ```
- [ ] **3.1.3** 创建 Zustand Store
  ```typescript
  interface EditorState {
    image: string | null;
    tool: ToolType;
    color: string;
    strokeWidth: number;
    shapes: Shape[];
    selectedId: string | null;
  }
  ```
- [ ] **3.1.4** 响应式画布尺寸

**验收标准**: 截图显示在 Konva Stage 中

---

### 3.2 区域选择 (核心)

- [ ] **3.2.1** 实现全屏半透明遮罩
- [ ] **3.2.2** 鼠标拖拽绘制选区矩形
- [ ] **3.2.3** 选区内区域透明显示（反向遮罩）
- [ ] **3.2.4** 选区边缘控制点（8个方向调整）
- [ ] **3.2.5** 选区尺寸实时显示
- [ ] **3.2.6** 双击或回车确认选区

**验收标准**: 类似 QQ 截图的区域选择体验

---

### 3.3 工具栏 UI

- [ ] **3.3.1** 创建工具栏组件 `src/components/Toolbar/index.tsx`
- [ ] **3.3.2** 工具栏位置: 选区下方，跟随选区移动
- [ ] **3.3.3** 工具按钮实现
  | 图标 | 工具 | 快捷键 |
  |------|------|--------|
  | □ | 矩形 | R |
  | ○ | 椭圆 | O |
  | ↗ | 箭头 | A |
  | ✏️ | 画笔 | P |
  | T | 文字 | T |
  | ▦ | 马赛克 | M |
  | ↩ | 撤销 | Ctrl+Z |
  | ↪ | 重做 | Ctrl+Y |
- [ ] **3.3.4** 颜色选择器
- [ ] **3.3.5** 线条粗细选择

**验收标准**: 工具栏可点击切换工具

---

### 3.4 绘图工具实现

- [ ] **3.4.1** 矩形工具
  - 鼠标按下 -> 移动 -> 松开
  - 支持边框颜色和粗细
- [ ] **3.4.2** 椭圆工具
  - 同矩形逻辑
- [ ] **3.4.3** 箭头工具
  - 绘制线段
  - 计算箭头三角形坐标
- [ ] **3.4.4** 画笔工具
  - 记录路径点
  - 平滑曲线 (`tension` 属性)
- [ ] **3.4.5** 文字工具
  - 点击创建输入框
  - 失焦后转为 Konva.Text
  - 支持拖拽移动
- [ ] **3.4.6** 马赛克工具
  - 获取选区内像素
  - 像素化处理 (8x8 块取平均色)
  - 或高斯模糊效果

**验收标准**: 每个工具可正常绘制并显示

---

### 3.5 撤销/重做系统

- [ ] **3.5.1** 创建历史记录管理
  ```typescript
  interface HistoryState {
    past: Shape[][];
    present: Shape[];
    future: Shape[][];
  }
  ```
- [ ] **3.5.2** 每次绘制完成后记录状态
- [ ] **3.5.3** 实现撤销 (Ctrl+Z)
- [ ] **3.5.4** 实现重做 (Ctrl+Y / Ctrl+Shift+Z)
- [ ] **3.5.5** 历史记录上限 (50步)

**验收标准**: 可撤销到初始状态，可重做到最新状态

---

## 阶段四：输出与系统集成

### 4.1 剪贴板输出

- [ ] **4.1.1** 前端导出图片
  ```typescript
  const dataUrl = stageRef.current.toDataURL({ pixelRatio: 2 });
  ```
- [ ] **4.1.2** 创建 Rust 命令
  ```rust
  #[tauri::command]
  pub fn copy_to_clipboard(image_data: String) -> Result<(), String>
  ```
- [ ] **4.1.3** Base64 解码并写入剪贴板
  ```rust
  let clipboard = Clipboard::new()?;
  clipboard.set_image(image_data)?;
  ```
- [ ] **4.1.4** 复制成功提示 (托盘通知)

**验收标准**: Ctrl+C 或确认按钮后可粘贴到其他应用

---

### 4.2 文件保存

- [ ] **4.2.1** 实现快速保存 (Ctrl+S)
  - 保存到默认目录
  - 文件名: `Screenshot_YYYYMMDD_HHmmss.png`
- [ ] **4.2.2** 实现另存为 (Ctrl+Shift+S)
  - 调用系统文件对话框
  - 支持 PNG / JPEG 格式选择
- [ ] **4.2.3** Rust 文件保存命令
  ```rust
  #[tauri::command]
  pub fn save_image(path: String, data: String) -> Result<(), String>
  ```
- [ ] **4.2.4** 保存成功提示

**验收标准**: 图片可保存到指定位置

---

### 4.3 设置中心

- [ ] **4.3.1** 创建设置页面 `src/pages/Settings.tsx`
- [ ] **4.3.2** 添加 store 插件
  ```bash
  pnpm tauri add store
  ```
- [ ] **4.3.3** 设置项实现
  | 设置项 | 类型 | 默认值 |
  |--------|------|--------|
  | 截图热键 | string | Ctrl+Shift+A |
  | 保存路径 | string | ~/Pictures/Screenshots |
  | 图片格式 | enum | PNG |
  | 图片质量 | number | 90 |
  | 开机自启 | boolean | false |
  | 主题 | enum | system |
- [ ] **4.3.6** 主题切换实现
  - 支持: `light` / `dark` / `system`
  - 使用 TailwindCSS `dark:` 类实现
  - 监听系统主题变化 (`prefers-color-scheme`)
  - 持久化用户选择
- [ ] **4.3.4** 添加自启动插件
  ```bash
  pnpm tauri add autostart
  ```
- [ ] **4.3.5** 设置持久化与读取

**验收标准**: 设置保存后重启应用仍生效

---

## 阶段五：打包与发布

### 5.1 应用信息

- [ ] **5.1.1** 配置 `tauri.conf.json` 元信息
  ```json
  {
    "productName": "Xcreenshot",
    "version": "1.0.0",
    "identifier": "com.xcreenshot.app"
  }
  ```
- [ ] **5.1.2** 准备应用图标
  - `icon.ico` (Windows)
  - `icon.png` (Linux)
  - 多尺寸: 32, 64, 128, 256, 512

---

### 5.2 Windows 打包

- [ ] **5.2.1** 配置 NSIS 打包（生成 .exe 安装包）
  ```json
  "bundle": {
    "targets": ["nsis"],
    "windows": {
      "certificateThumbprint": null,
      "nsis": {
        "languages": ["SimpChinese", "English"],
        "displayLanguageSelector": true
      }
    }
  }
  ```
- [ ] **5.2.2** 执行打包
  ```bash
  pnpm tauri build
  ```
- [ ] **5.2.3** 测试安装包
  - 安装/卸载正常
  - 托盘图标显示正常
  - 热键可用
  - 无任务栏图标

**验收标准**: 生成可分发的 `.exe` 安装包

---

### 5.3 Linux 打包

- [ ] **5.3.1** 配置 rpm/deb/AppImage 打包
  ```json
  "bundle": {
    "targets": ["deb", "rpm", "appimage"],
    "linux": {
      "section": "Graphics",
      "deb": {
        "depends": [
          "libwebkit2gtk-4.1-0",
          "libappindicator3-1"
        ]
      },
      "rpm": {
        "depends": [
          "webkit2gtk4.1",
          "libappindicator-gtk3"
        ]
      }
    }
  }
  ```
- [ ] **5.3.2** 执行打包
- [ ] **5.3.3** 测试 (KDE Plasma / Xfce / GNOME)
  - Wayland 下截图权限正常
  - 托盘图标显示正常
  - 无任务栏图标

**验收标准**: 生成 `.deb`、`.rpm` 和 `.AppImage`

---

## 风险清单

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| Wayland 截图权限 | 每次截图需授权 | 首次启动时配置 Systemd 服务，一次性授权 |
| 多显示器 DPI | 坐标计算错误 | 初期只支持单显示器截图 |
| Linux 托盘兼容 | 图标不显示 | 提供多尺寸图标，文档说明依赖 |
| Konva 性能 | 大图卡顿 | 限制画布尺寸，优化渲染 |

---

## 里程碑

| 版本 | 阶段 | 功能范围 |
|------|------|----------|
| v0.1 | 阶段一 | 托盘 + 热键 + 空窗口 |
| v0.2 | 阶段二 | 基础截图 + 图片显示 |
| v0.5 | 阶段三 | 完整编辑器 |
| v0.8 | 阶段四 | 剪贴板 + 保存 + 设置 |
| v1.0 | 阶段五 | 发布版本 |
