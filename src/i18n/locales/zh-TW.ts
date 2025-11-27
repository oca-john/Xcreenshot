// 繁體中文
export default {
  // 托盤選單
  tray: {
    fullscreen: '全螢幕截圖',
    window: '視窗截圖',
    region: '區域截圖',
    settings: '設定',
    quit: '退出',
  },
  
  // 編輯器工具列
  tools: {
    hand: '拖曳',
    select: '選擇',
    rectangle: '矩形',
    ellipse: '橢圓',
    arrow: '箭頭',
    line: '直線',
    pen: '畫筆',
    text: '文字',
    blur: '模糊',
    mosaic: '馬賽克',
  },
  
  // 編輯器
  editor: {
    loading: '載入中...',
    undo: '復原',
    redo: '重做',
    save: '儲存',
    copy: '複製',
    cancel: '取消',
    confirm: '確認',
    strokeWidth: '線條粗細',
    color: '顏色',
  },
  
  // 區域選擇器
  regionSelector: {
    dragToSelect: '拖曳選擇區域 / 雙擊全選',
    escToCancel: 'ESC 取消',
    doubleClickFullscreen: '雙擊全選',
  },
  
  // 視窗選擇器
  windowSelector: {
    clickToCapture: '點擊視窗進行擷取',
    escToCancel: 'ESC 取消',
  },
  
  // 設定面板
  settings: {
    title: '設定',
    // 外觀
    appearance: '外觀',
    theme: '主題',
    themeLight: '淺色',
    themeDark: '深色',
    themeSystem: '跟隨系統',
    
    // 語言
    language: '語言',
    languageZhCN: '简体中文',
    languageZhTW: '繁體中文',
    languageEn: 'English',
    
    // 托盤
    trayClickAction: '托盤左鍵點擊',
    trayClickRegion: '區域截圖',
    trayClickFullscreen: '全螢幕截圖',
    trayClickWindow: '視窗截圖',
    
    // 儲存
    save: '儲存',
    saveFormat: '預設格式',
    saveQuality: '圖像品質',
    savePath: '儲存路徑',
    savePathDefault: '預設路徑',
    savePathCustom: '自訂',
    savePathSelect: '選擇資料夾',
    
    // 系統
    system: '系統',
    startWithSystem: '開機自啟動',
    showInTray: '顯示托盤圖示',
    
    // 快捷鍵
    shortcuts: '快捷鍵',
    shortcutFullscreen: '全螢幕截圖',
    shortcutWindow: '視窗截圖',
    shortcutRegion: '區域截圖',
    shortcutEdit: '編輯快捷鍵',
    
    // 關於
    about: '關於',
    version: '版本',
    author: '作者',
    techStack: '技術棧',
    github: 'GitHub',
    viewSource: '查看源碼',
    appDescription: 'Xcreenshot 是一款現代化的跨平台截圖工具，基於 Tauri v2 構建，提供快速、高效的螢幕截圖體驗。支援區域截圖、全螢幕截圖、視窗截圖等多種模式，內建強大的圖像編輯器，可添加標註、馬賽克、模糊等效果。採用 Rust 後端確保高性能和低資源佔用，React 前端提供流暢的使用者介面。',
  },
  
  // 通用
  common: {
    ok: '確定',
    cancel: '取消',
    save: '儲存',
    close: '關閉',
    reset: '重設',
    apply: '套用',
  },
  
  // 訊息提示
  messages: {
    copySuccess: '已複製到剪貼簿',
    copyFailed: '複製失敗',
    saveSuccess: '儲存成功',
    saveFailed: '儲存失敗',
    saveCancelled: '儲存已取消',
  },
};
