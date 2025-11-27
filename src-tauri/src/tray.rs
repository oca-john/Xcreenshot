use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::RwLock;
use std::time::Duration;
use tauri::{
    image::Image,
    menu::{CheckMenuItem, Menu, MenuItem, PredefinedMenuItem, Submenu},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Manager,
};

use crate::capture;

// 全局延迟时间设置（秒）
pub static CAPTURE_DELAY: AtomicU64 = AtomicU64::new(0);

// 托盘点击动作设置
pub static TRAY_CLICK_ACTION: RwLock<String> = RwLock::new(String::new());

// 设置托盘点击动作
pub fn set_tray_click_action(action: &str) {
    if let Ok(mut lock) = TRAY_CLICK_ACTION.write() {
        *lock = action.to_string();
    }
}

// 获取托盘点击动作
fn get_tray_click_action() -> String {
    TRAY_CLICK_ACTION
        .read()
        .map(|s| s.clone())
        .unwrap_or_else(|_| "region".to_string())
}

pub fn create_tray(app: &tauri::AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    // 创建菜单项
    let fullscreen = MenuItem::with_id(app, "fullscreen", "全屏截图", true, None::<&str>)?;
    let window_capture = MenuItem::with_id(app, "window", "窗口截图", true, None::<&str>)?;
    let region = MenuItem::with_id(app, "region", "区域截图", true, None::<&str>)?;
    
    // 延迟时间子菜单 - 使用 CheckMenuItem
    let delay_0s = CheckMenuItem::with_id(app, "delay_0", "无延迟", true, true, None::<&str>)?;
    let delay_1s = CheckMenuItem::with_id(app, "delay_1", "1 秒", true, false, None::<&str>)?;
    let delay_2s = CheckMenuItem::with_id(app, "delay_2", "2 秒", true, false, None::<&str>)?;
    let delay_3s = CheckMenuItem::with_id(app, "delay_3", "3 秒", true, false, None::<&str>)?;
    let delay_5s = CheckMenuItem::with_id(app, "delay_5", "5 秒", true, false, None::<&str>)?;
    let delay_10s = CheckMenuItem::with_id(app, "delay_10", "10 秒", true, false, None::<&str>)?;
    
    // 克隆用于事件处理
    let delay_items: Vec<CheckMenuItem<tauri::Wry>> = vec![
        delay_0s.clone(), delay_1s.clone(), delay_2s.clone(),
        delay_3s.clone(), delay_5s.clone(), delay_10s.clone(),
    ];
    
    let delay_submenu = Submenu::with_items(
        app,
        "延迟时间",
        true,
        &[&delay_0s, &delay_1s, &delay_2s, &delay_3s, &delay_5s, &delay_10s],
    )?;
    
    let separator1 = PredefinedMenuItem::separator(app)?;
    let settings = MenuItem::with_id(app, "settings", "设置", true, None::<&str>)?;
    let separator2 = PredefinedMenuItem::separator(app)?;
    let quit = MenuItem::with_id(app, "quit", "退出", true, None::<&str>)?;

    // 创建菜单
    let menu = Menu::with_items(
        app,
        &[
            &fullscreen,
            &window_capture,
            &region,
            &delay_submenu,
            &separator1,
            &settings,
            &separator2,
            &quit,
        ],
    )?;

    // 加载托盘图标 - 使用应用图标
    let icon = app
        .default_window_icon()
        .cloned()
        .unwrap_or_else(|| Image::from_bytes(include_bytes!("../icons/32x32.png")).unwrap());

    // 创建托盘
    let _tray = TrayIconBuilder::with_id("main-tray")
        .icon(icon)
        .menu(&menu)
        .show_menu_on_left_click(false) // 左键不显示菜单，只有右键显示
        .tooltip("Xcreenshot - 截图工具")
        .on_menu_event(move |app, event| {
            let id = event.id.as_ref();
            match id {
                "fullscreen" => {
                    start_capture_with_delay(app.clone(), "fullscreen");
                }
                "window" => {
                    start_capture_with_delay(app.clone(), "window");
                }
                "region" => {
                    start_capture_with_delay(app.clone(), "region");
                }
                "settings" => {
                    if let Some(settings_window) = app.get_webview_window("settings") {
                        let _ = settings_window.show();
                        let _ = settings_window.set_focus();
                    }
                }
                "quit" => {
                    app.exit(0);
                }
                _ if id.starts_with("delay_") => {
                    // 设置延迟时间
                    if let Ok(seconds) = id.strip_prefix("delay_").unwrap_or("0").parse::<u64>() {
                        CAPTURE_DELAY.store(seconds, Ordering::SeqCst);
                        println!("[Tray] Delay set to {} seconds", seconds);
                        
                        // 更新所有延迟选项的勾选状态
                        let delay_values = [0u64, 1, 2, 3, 5, 10];
                        for (item, &val) in delay_items.iter().zip(delay_values.iter()) {
                            let _ = item.set_checked(val == seconds);
                        }
                    }
                }
                _ => {}
            }
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                // 左键单击 - 根据设置触发对应截图方式
                let action = get_tray_click_action();
                let mode = match action.as_str() {
                    "fullscreen" => "fullscreen",
                    "window" => "window",
                    _ => "region", // 默认区域截图
                };
                start_capture_with_delay(tray.app_handle().clone(), mode);
            }
        })
        .build(app)?;

    Ok(())
}

// 带延迟的截图启动（公开供快捷键使用）
pub fn start_capture_with_delay(app: tauri::AppHandle, mode: &'static str) {
    let delay = CAPTURE_DELAY.load(Ordering::SeqCst);
    
    if delay == 0 {
        // 无延迟，直接截图
        if let Err(e) = capture::start_capture(&app, mode) {
            eprintln!("Failed to start capture: {}", e);
        }
    } else {
        // 有延迟，在新线程中等待后截图
        std::thread::spawn(move || {
            std::thread::sleep(Duration::from_secs(delay));
            if let Err(e) = capture::start_capture(&app, mode) {
                eprintln!("Failed to start delayed capture: {}", e);
            }
        });
    }
}
