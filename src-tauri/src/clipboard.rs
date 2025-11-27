use arboard::{Clipboard, ImageData};
use base64::Engine;
use chrono::Local;
use image::GenericImageView;
use std::path::PathBuf;
use tauri_plugin_dialog::DialogExt;

#[tauri::command]
pub fn copy_to_clipboard(image_data: String) -> Result<(), String> {
    // 解码 Base64
    let bytes = base64::engine::general_purpose::STANDARD
        .decode(&image_data)
        .map_err(|e| format!("Failed to decode base64: {}", e))?;

    // 解析 PNG 图像
    let img = image::load_from_memory(&bytes)
        .map_err(|e| format!("Failed to load image: {}", e))?;

    let rgba = img.to_rgba8();
    let (width, height) = img.dimensions();

    // 创建剪贴板图像数据
    let img_data = ImageData {
        width: width as usize,
        height: height as usize,
        bytes: rgba.into_raw().into(),
    };

    // 写入剪贴板
    let mut clipboard = Clipboard::new()
        .map_err(|e| format!("Failed to access clipboard: {}", e))?;

    clipboard
        .set_image(img_data)
        .map_err(|e| format!("Failed to copy to clipboard: {}", e))?;

    Ok(())
}

#[tauri::command]
pub fn quick_save_image(image_data: String) -> Result<String, String> {
    // 解码 Base64
    let bytes = base64::engine::general_purpose::STANDARD
        .decode(&image_data)
        .map_err(|e| format!("Failed to decode base64: {}", e))?;

    // 获取保存路径
    let save_dir = get_default_save_dir()?;
    
    // 生成文件名
    let filename = format!(
        "Screenshot_{}.png",
        Local::now().format("%Y%m%d_%H%M%S")
    );
    
    let save_path = save_dir.join(&filename);

    // 保存文件
    std::fs::write(&save_path, &bytes)
        .map_err(|e| format!("Failed to save image: {}", e))?;

    Ok(save_path.to_string_lossy().to_string())
}

#[tauri::command]
pub async fn save_image_dialog(app: tauri::AppHandle, image_data: String) -> Result<String, String> {
    use std::sync::Arc;
    use tokio::sync::oneshot;
    
    println!("[save_image_dialog] Called, image_data length: {}", image_data.len());
    
    // 解码 Base64
    let bytes = base64::engine::general_purpose::STANDARD
        .decode(&image_data)
        .map_err(|e| format!("Failed to decode base64: {}", e))?;
    
    println!("[save_image_dialog] Decoded {} bytes", bytes.len());

    // 生成默认文件名
    let default_name = format!(
        "Screenshot_{}.png",
        Local::now().format("%Y%m%d_%H%M%S")
    );

    println!("[save_image_dialog] Opening dialog with filename: {}", default_name);

    // 使用异步回调方式显示对话框
    let (tx, rx) = oneshot::channel();
    let bytes = Arc::new(bytes);
    let bytes_clone = bytes.clone();
    
    app.dialog()
        .file()
        .add_filter("PNG Image", &["png"])
        .add_filter("JPEG Image", &["jpg", "jpeg"])
        .set_file_name(&default_name)
        .save_file(move |file_path| {
            println!("[save_image_dialog] Dialog callback, path: {:?}", file_path);
            
            let result = match file_path {
                Some(path) => {
                    let path_str = path.to_string();
                    
                    // 根据扩展名确定格式并保存
                    let save_result = if path_str.ends_with(".jpg") || path_str.ends_with(".jpeg") {
                        // 转换为 JPEG
                        image::load_from_memory(&bytes_clone)
                            .map_err(|e| format!("Failed to load image: {}", e))
                            .and_then(|img| {
                                img.save(&path_str)
                                    .map_err(|e| format!("Failed to save image: {}", e))
                            })
                            .map(|_| path_str.clone())
                    } else {
                        // 保存为 PNG
                        std::fs::write(&path_str, bytes_clone.as_ref())
                            .map_err(|e| format!("Failed to save image: {}", e))
                            .map(|_| path_str.clone())
                    };
                    
                    save_result
                }
                None => Err("Save cancelled".to_string()),
            };
            
            let _ = tx.send(result);
        });

    // 异步等待结果
    rx.await.map_err(|_| "Dialog channel closed".to_string())?
}

fn get_default_save_dir() -> Result<PathBuf, String> {
    // 尝试获取图片目录
    let dir = dirs::picture_dir()
        .or_else(dirs::home_dir)
        .ok_or_else(|| "Could not find save directory".to_string())?;

    let screenshots_dir = dir.join("Screenshots");

    // 创建目录（如果不存在）
    if !screenshots_dir.exists() {
        std::fs::create_dir_all(&screenshots_dir)
            .map_err(|e| format!("Failed to create directory: {}", e))?;
    }

    Ok(screenshots_dir)
}
