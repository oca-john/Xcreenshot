mod capture;
mod clipboard;
mod tray;

use tauri_plugin_autostart::MacosLauncher;

#[tauri::command]
fn set_tray_click_action(action: String) {
    tray::set_tray_click_action(&action);
}

#[tauri::command]
fn set_capture_delay(seconds: u64) {
    tray::CAPTURE_DELAY.store(seconds, std::sync::atomic::Ordering::SeqCst);
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_autostart::init(
            MacosLauncher::LaunchAgent,
            Some(vec!["--hidden"]),
        ))
        .setup(|app| {
            // 创建托盘
            tray::create_tray(app.handle())?;

            // 注册全局快捷键
            register_shortcuts(app.handle())?;

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            capture::get_monitors,
            capture::capture_screen,
            capture::capture_all_screens,
            capture::get_windows,
            capture::capture_window_by_id,
            capture::capture_selected_window,
            clipboard::copy_to_clipboard,
            clipboard::quick_save_image,
            clipboard::save_image_dialog,
            set_tray_click_action,
            set_capture_delay,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

fn register_shortcuts(app: &tauri::AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut};

    // Ctrl+Shift+A - 区域截图
    let shortcut = Shortcut::new(Some(Modifiers::CONTROL | Modifiers::SHIFT), Code::KeyA);
    
    // 先尝试取消注册（忽略错误）
    let _ = app.global_shortcut().unregister(shortcut);
    
    let app_handle = app.clone();
    app.global_shortcut().on_shortcut(shortcut, move |_app, _shortcut, _event| {
        // 使用延迟截图
        tray::start_capture_with_delay(app_handle.clone(), "region");
    })?;

    if let Err(e) = app.global_shortcut().register(shortcut) {
        eprintln!("Failed to register Ctrl+Shift+A: {}", e);
    }

    // PrintScreen - 全屏截图
    let print_screen = Shortcut::new(None, Code::PrintScreen);
    
    // 先尝试取消注册（忽略错误）
    let _ = app.global_shortcut().unregister(print_screen);
    
    let app_handle2 = app.clone();
    app.global_shortcut().on_shortcut(print_screen, move |_app, _shortcut, _event| {
        // 使用延迟截图
        tray::start_capture_with_delay(app_handle2.clone(), "fullscreen");
    })?;

    if let Err(e) = app.global_shortcut().register(print_screen) {
        eprintln!("Failed to register PrintScreen: {}", e);
    }

    Ok(())
}
