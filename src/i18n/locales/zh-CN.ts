// 简体中文
export default {
  // 托盘菜单
  tray: {
    fullscreen: '全屏截图',
    window: '窗口截图',
    region: '区域截图',
    settings: '设置',
    quit: '退出',
  },
  
  // 编辑器工具栏
  tools: {
    hand: '拖动',
    select: '选择',
    rectangle: '矩形',
    ellipse: '椭圆',
    arrow: '箭头',
    line: '直线',
    pen: '画笔',
    text: '文字',
    blur: '模糊',
    mosaic: '马赛克',
  },
  
  // 编辑器
  editor: {
    loading: '加载中...',
    undo: '撤销',
    redo: '重做',
    save: '保存',
    copy: '复制',
    cancel: '取消',
    confirm: '确认',
    strokeWidth: '线条粗细',
    color: '颜色',
  },
  
  // 区域选择器
  regionSelector: {
    dragToSelect: '拖拽选择区域 / 双击全选',
    escToCancel: 'ESC 取消',
    doubleClickFullscreen: '双击全选',
  },
  
  // 窗口选择器
  windowSelector: {
    clickToCapture: '点击窗口进行捕获',
    escToCancel: 'ESC 取消',
  },
  
  // 设置面板
  settings: {
    title: '设置',
    // 外观
    appearance: '外观',
    theme: '主题',
    themeLight: '浅色',
    themeDark: '深色',
    themeSystem: '跟随系统',
    
    // 语言
    language: '语言',
    languageZhCN: '简体中文',
    languageZhTW: '繁体中文',
    languageEn: 'English',
    
    // 托盘
    trayClickAction: '托盘左键点击',
    trayClickRegion: '区域截图',
    trayClickFullscreen: '全屏截图',
    trayClickWindow: '窗口截图',
    
    // 保存
    save: '保存',
    saveFormat: '默认格式',
    saveQuality: '图像质量',
    savePath: '保存路径',
    savePathDefault: '默认路径',
    savePathCustom: '自定义',
    savePathSelect: '选择文件夹',
    
    // 系统
    system: '系统',
    startWithSystem: '开机自启动',
    showInTray: '显示托盘图标',
    
    // 快捷键
    shortcuts: '快捷键',
    shortcutFullscreen: '全屏截图',
    shortcutWindow: '窗口截图',
    shortcutRegion: '区域截图',
    shortcutEdit: '编辑快捷键',
    
    // 关于
    about: '关于',
    version: '版本',
    author: '作者',
    techStack: '技术栈',
    github: 'GitHub',
    viewSource: '查看源码',
    appDescription: 'Xcreenshot 是一款现代化的跨平台截图工具，基于 Tauri v2 构建，提供快速、高效的屏幕截图体验。支持区域截图、全屏截图、窗口截图等多种模式，内置强大的图像编辑器，可添加标注、马赛克、模糊等效果。采用 Rust 后端确保高性能和低资源占用，React 前端提供流畅的用户界面。',
  },
  
  // 通用
  common: {
    ok: '确定',
    cancel: '取消',
    save: '保存',
    close: '关闭',
    reset: '重置',
    apply: '应用',
  },
  
  // 消息提示
  messages: {
    copySuccess: '已复制到剪贴板',
    copyFailed: '复制失败',
    saveSuccess: '保存成功',
    saveFailed: '保存失败',
    saveCancelled: '保存已取消',
  },
};
