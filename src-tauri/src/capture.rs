use image::ImageEncoder;
use serde::{Deserialize, Serialize};
use tauri::{Emitter, Manager};
use xcap::{Monitor, Window};

#[derive(Debug, Serialize, Deserialize)]
pub struct MonitorInfo {
    pub id: usize,
    pub name: String,
    pub x: i32,
    pub y: i32,
    pub width: u32,
    pub height: u32,
    pub scale_factor: f32,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct WindowInfo {
    pub id: u32,
    pub title: String,
    pub app_name: String,
    pub x: i32,
    pub y: i32,
    pub width: u32,
    pub height: u32,
    pub is_minimized: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ScreenCapture {
    pub monitor_id: usize,
    pub image: String,
    pub width: u32,
    pub height: u32,
}

#[tauri::command]
pub fn get_monitors() -> Result<Vec<MonitorInfo>, String> {
    let monitors = Monitor::all().map_err(|e| e.to_string())?;
    
    let infos: Vec<MonitorInfo> = monitors
        .iter()
        .enumerate()
        .map(|(id, m)| MonitorInfo {
            id,
            name: m.name().to_string(),
            x: m.x(),
            y: m.y(),
            width: m.width(),
            height: m.height(),
            scale_factor: m.scale_factor(),
        })
        .collect();

    Ok(infos)
}

#[tauri::command]
pub fn capture_screen(monitor_id: usize) -> Result<String, String> {
    let monitors = Monitor::all().map_err(|e| e.to_string())?;
    
    let monitor = monitors
        .get(monitor_id)
        .ok_or_else(|| format!("Monitor {} not found", monitor_id))?;

    let image = monitor.capture_image().map_err(|e| e.to_string())?;
    
    // 转换为 Base64 PNG
    let mut buffer = Vec::new();
    let encoder = image::codecs::png::PngEncoder::new(&mut buffer);
    encoder
        .write_image(
            image.as_raw(),
            image.width(),
            image.height(),
            image::ExtendedColorType::Rgba8,
        )
        .map_err(|e| e.to_string())?;

    Ok(base64::Engine::encode(
        &base64::engine::general_purpose::STANDARD,
        &buffer,
    ))
}

#[tauri::command]
pub fn capture_all_screens() -> Result<Vec<ScreenCapture>, String> {
    let monitors = Monitor::all().map_err(|e| e.to_string())?;
    
    let mut captures = Vec::new();
    
    for (id, monitor) in monitors.iter().enumerate() {
        let image = monitor.capture_image().map_err(|e| e.to_string())?;
        
        let mut buffer = Vec::new();
        let encoder = image::codecs::png::PngEncoder::new(&mut buffer);
        encoder
            .write_image(
                image.as_raw(),
                image.width(),
                image.height(),
                image::ExtendedColorType::Rgba8,
            )
            .map_err(|e| e.to_string())?;

        captures.push(ScreenCapture {
            monitor_id: id,
            image: base64::Engine::encode(
                &base64::engine::general_purpose::STANDARD,
                &buffer,
            ),
            width: monitor.width(),
            height: monitor.height(),
        });
    }

    Ok(captures)
}

#[tauri::command]
pub fn get_windows() -> Result<Vec<WindowInfo>, String> {
    let windows = Window::all().map_err(|e| e.to_string())?;
    
    let infos: Vec<WindowInfo> = windows
        .iter()
        .filter(|w| !w.is_minimized() && w.width() > 0 && w.height() > 0)
        .map(|w| WindowInfo {
            id: w.id(),
            title: w.title().to_string(),
            app_name: w.app_name().to_string(),
            x: w.x(),
            y: w.y(),
            width: w.width(),
            height: w.height(),
            is_minimized: w.is_minimized(),
        })
        .collect();

    Ok(infos)
}

#[tauri::command]
pub fn capture_window_by_id(window_id: u32) -> Result<String, String> {
    let windows = Window::all().map_err(|e| e.to_string())?;
    
    let window = windows
        .iter()
        .find(|w| w.id() == window_id)
        .ok_or_else(|| format!("Window {} not found", window_id))?;

    let image = window.capture_image().map_err(|e| e.to_string())?;
    
    let mut buffer = Vec::new();
    let encoder = image::codecs::png::PngEncoder::new(&mut buffer);
    encoder
        .write_image(
            image.as_raw(),
            image.width(),
            image.height(),
            image::ExtendedColorType::Rgba8,
        )
        .map_err(|e| e.to_string())?;

    Ok(base64::Engine::encode(
        &base64::engine::general_purpose::STANDARD,
        &buffer,
    ))
}

/// 全屏截图：捕获整个屏幕并发送到编辑器
pub fn capture_fullscreen(app: &tauri::AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    println!("[Xcreenshot] Starting fullscreen capture");
    
    // 先隐藏主窗口
    if let Some(main_window) = app.get_webview_window("main") {
        let _ = main_window.hide();
    }
    
    // 等待托盘菜单消失
    std::thread::sleep(std::time::Duration::from_millis(300));
    
    // 获取主显示器并截图
    let monitors = Monitor::all()?;
    if monitors.is_empty() {
        return Err("No monitors found".into());
    }
    
    let monitor = &monitors[0];
    let image = monitor.capture_image()?;
    let base64_image = image_to_base64(&image)?;
    
    // 发送到编辑器（编辑模式，不需要选区）
    send_to_editor(app, "fullscreen", &base64_image, image.width(), image.height())?;
    
    Ok(())
}

/// 窗口截图：显示窗口选择界面，用户点击选择窗口
pub fn capture_window_at_cursor(app: &tauri::AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    println!("[Xcreenshot] Starting window capture - showing selector");
    
    // 先隐藏主窗口
    if let Some(main_window) = app.get_webview_window("main") {
        let _ = main_window.hide();
    }
    
    // 等待托盘菜单消失
    std::thread::sleep(std::time::Duration::from_millis(300));
    
    // 获取主显示器截图作为背景
    let monitors = Monitor::all()?;
    if monitors.is_empty() {
        return Err("No monitors found".into());
    }
    
    let monitor = &monitors[0];
    let scale_factor = get_scale_factor();
    let image = monitor.capture_image()?;
    let base64_image = image_to_base64(&image)?;
    
    // 获取所有窗口信息
    let windows = Window::all()?;
    let window_infos: Vec<serde_json::Value> = windows.iter()
        .filter(|w| !w.is_minimized() && w.width() > 0 && w.height() > 0)
        .map(|w| {
            serde_json::json!({
                "id": w.id(),
                "title": w.title(),
                "x": (w.x() as f64 / scale_factor) as i32,
                "y": (w.y() as f64 / scale_factor) as i32,
                "width": (w.width() as f64 / scale_factor) as u32,
                "height": (w.height() as f64 / scale_factor) as u32,
            })
        })
        .collect();
    
    let physical_width = image.width();
    let physical_height = image.height();
    let logical_width = (physical_width as f64 / scale_factor) as u32;
    let logical_height = (physical_height as f64 / scale_factor) as u32;
    
    // 发送到前端进入窗口选择模式
    if let Some(main_window) = app.get_webview_window("main") {
        let _ = main_window.set_decorations(false);
        let _ = main_window.set_always_on_top(true);
        let _ = main_window.set_size(tauri::LogicalSize::new(
            logical_width as f64,
            logical_height as f64,
        ));
        let _ = main_window.set_position(tauri::LogicalPosition::new(
            monitor.x() as f64 / scale_factor,
            monitor.y() as f64 / scale_factor,
        ));
        
        main_window.emit(
            "start-window-select",
            serde_json::json!({
                "screenshot": base64_image,
                "logicalWidth": logical_width,
                "logicalHeight": logical_height,
                "scaleFactor": scale_factor,
                "windows": window_infos,
            }),
        )?;
        
        let _ = main_window.show();
        let _ = main_window.set_focus();
    }
    
    Ok(())
}

/// 捕获指定窗口（由前端调用）
#[tauri::command]
pub fn capture_selected_window(app: tauri::AppHandle, window_id: u32) -> Result<(), String> {
    println!("[Xcreenshot] Capturing selected window: {}", window_id);
    
    let windows = Window::all().map_err(|e| e.to_string())?;
    let target_window = windows.iter()
        .find(|w| w.id() == window_id)
        .ok_or_else(|| format!("Window {} not found", window_id))?;
    
    let image = target_window.capture_image().map_err(|e| e.to_string())?;
    let base64_image = image_to_base64(&image).map_err(|e| e.to_string())?;
    
    send_to_editor(&app, "window", &base64_image, image.width(), image.height())
        .map_err(|e| e.to_string())?;
    
    Ok(())
}

/// 区域截图：显示选区界面让用户选择区域
pub fn capture_region(app: &tauri::AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    println!("[Xcreenshot] Starting region capture");
    
    // 先隐藏主窗口
    if let Some(main_window) = app.get_webview_window("main") {
        let _ = main_window.hide();
    }
    
    // 等待托盘菜单消失
    std::thread::sleep(std::time::Duration::from_millis(300));
    
    // 获取主显示器截图作为背景
    let monitors = Monitor::all()?;
    if monitors.is_empty() {
        return Err("No monitors found".into());
    }
    
    let monitor = &monitors[0];
    let scale_factor = get_scale_factor();
    println!("[Xcreenshot] Scale factor: {}", scale_factor);
    
    let image = monitor.capture_image()?;
    let base64_image = image_to_base64(&image)?;
    
    // 物理像素尺寸（截图的实际尺寸）
    let physical_width = image.width();
    let physical_height = image.height();
    
    // 逻辑像素尺寸（屏幕显示尺寸）
    let logical_width = (physical_width as f64 / scale_factor) as u32;
    let logical_height = (physical_height as f64 / scale_factor) as u32;
    
    println!("[Xcreenshot] Physical: {}x{}, Logical: {}x{}", 
        physical_width, physical_height, logical_width, logical_height);
    
    // 发送到前端进入选区模式
    if let Some(main_window) = app.get_webview_window("main") {
        // 使用逻辑像素设置窗口（Tauri 会自动处理 DPI）
        let _ = main_window.set_decorations(false);
        let _ = main_window.set_always_on_top(true);
        let _ = main_window.set_size(tauri::LogicalSize::new(
            logical_width as f64,
            logical_height as f64,
        ));
        let _ = main_window.set_position(tauri::LogicalPosition::new(
            monitor.x() as f64 / scale_factor,
            monitor.y() as f64 / scale_factor,
        ));
        
        // 发送截图数据，包含缩放因子
        main_window.emit(
            "start-region-select",
            serde_json::json!({
                "screenshot": base64_image,
                "physicalWidth": physical_width,
                "physicalHeight": physical_height,
                "logicalWidth": logical_width,
                "logicalHeight": logical_height,
                "scaleFactor": scale_factor,
            }),
        )?;
        
        let _ = main_window.show();
        let _ = main_window.set_focus();
    }
    
    Ok(())
}

/// 将图像转换为 Base64
fn image_to_base64(image: &image::RgbaImage) -> Result<String, Box<dyn std::error::Error>> {
    let mut buffer = Vec::new();
    let encoder = image::codecs::png::PngEncoder::new(&mut buffer);
    encoder.write_image(
        image.as_raw(),
        image.width(),
        image.height(),
        image::ExtendedColorType::Rgba8,
    )?;
    Ok(base64::Engine::encode(&base64::engine::general_purpose::STANDARD, &buffer))
}

/// 发送截图到编辑器窗口（固定为屏幕 80% 大小）
fn send_to_editor(
    app: &tauri::AppHandle,
    mode: &str,
    base64_image: &str,
    physical_width: u32,
    physical_height: u32,
) -> Result<(), Box<dyn std::error::Error>> {
    if let Some(main_window) = app.get_webview_window("main") {
        let scale_factor = get_scale_factor();
        
        // 转换为逻辑像素
        let logical_width = (physical_width as f64 / scale_factor) as u32;
        let logical_height = (physical_height as f64 / scale_factor) as u32;
        
        // 获取屏幕尺寸
        let monitors = Monitor::all()?;
        let screen_physical_width = monitors.get(0).map(|m| m.width()).unwrap_or(1920);
        let screen_physical_height = monitors.get(0).map(|m| m.height()).unwrap_or(1080);
        let screen_logical_width = (screen_physical_width as f64 / scale_factor) as u32;
        let screen_logical_height = (screen_physical_height as f64 / scale_factor) as u32;
        
        // 固定窗口大小为屏幕的 80%
        let window_width = (screen_logical_width as f64 * 0.8) as u32;
        let window_height = (screen_logical_height as f64 * 0.8) as u32;
        
        // 居中
        let x = ((screen_logical_width - window_width) / 2) as i32;
        let y = ((screen_logical_height - window_height) / 2) as i32;
        
        println!("[Xcreenshot] Image: {}x{}, Window: {}x{}, Scale: {}", 
            logical_width, logical_height, window_width, window_height, scale_factor);
        
        // 设置窗口
        let _ = main_window.set_fullscreen(false);
        let _ = main_window.set_decorations(false);
        let _ = main_window.set_always_on_top(true);
        let _ = main_window.set_size(tauri::LogicalSize::new(
            window_width as f64,
            window_height as f64,
        ));
        let _ = main_window.set_position(tauri::LogicalPosition::new(
            x as f64,
            y as f64,
        ));
        
        // 发送截图数据
        main_window.emit(
            "open-editor",
            serde_json::json!({
                "mode": mode,
                "screenshot": base64_image,
                "physicalWidth": physical_width,
                "physicalHeight": physical_height,
                "logicalWidth": logical_width,
                "logicalHeight": logical_height,
                "scaleFactor": scale_factor,
            }),
        )?;
        
        let _ = main_window.show();
        let _ = main_window.set_focus();
        
        println!("[Xcreenshot] Editor opened: {}x{} at ({}, {})", window_width, window_height, x, y);
    }
    
    Ok(())
}

/// 获取屏幕缩放因子 (Windows)
#[cfg(target_os = "windows")]
fn get_scale_factor() -> f64 {
    extern "system" {
        fn GetDC(hWnd: *mut std::ffi::c_void) -> *mut std::ffi::c_void;
        fn ReleaseDC(hWnd: *mut std::ffi::c_void, hDC: *mut std::ffi::c_void) -> i32;
        fn GetDeviceCaps(hdc: *mut std::ffi::c_void, index: i32) -> i32;
    }
    
    const LOGPIXELSX: i32 = 88;
    
    unsafe {
        let hdc = GetDC(std::ptr::null_mut());
        if hdc.is_null() {
            return 1.0;
        }
        let dpi = GetDeviceCaps(hdc, LOGPIXELSX);
        ReleaseDC(std::ptr::null_mut(), hdc);
        dpi as f64 / 96.0
    }
}

/// 获取屏幕缩放因子 (非 Windows)
#[cfg(not(target_os = "windows"))]
fn get_scale_factor() -> f64 {
    1.0
}

/// 获取鼠标位置 (Windows)
#[cfg(target_os = "windows")]
fn get_mouse_position() -> (i32, i32) {
    use std::mem::MaybeUninit;
    
    #[repr(C)]
    struct POINT {
        x: i32,
        y: i32,
    }
    
    extern "system" {
        fn GetCursorPos(lpPoint: *mut POINT) -> i32;
    }
    
    unsafe {
        let mut point = MaybeUninit::<POINT>::uninit();
        if GetCursorPos(point.as_mut_ptr()) != 0 {
            let point = point.assume_init();
            (point.x, point.y)
        } else {
            (0, 0)
        }
    }
}

/// 获取鼠标位置 (Linux/macOS)
#[cfg(not(target_os = "windows"))]
fn get_mouse_position() -> (i32, i32) {
    // Linux/macOS 下暂时返回 (0, 0)，后续可以使用 x11/wayland 或 cocoa API
    (0, 0)
}

/// 兼容旧接口
pub fn start_capture(app: &tauri::AppHandle, mode: &str) -> Result<(), Box<dyn std::error::Error>> {
    match mode {
        "fullscreen" => capture_fullscreen(app),
        "window" => capture_window_at_cursor(app),
        "region" => capture_region(app),
        _ => capture_region(app),
    }
}
