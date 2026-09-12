use tauri::Manager;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_global_shortcut::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .setup(|app| {
            // Show window on startup
            let window = app.get_webview_window("main").unwrap();
            window.show().unwrap();
            
            // Set up global shortcut (Ctrl+Shift+X to show/hide)
            let app_handle = app.handle().clone();
            app.global_shortcut()
                .on_shortcut("Ctrl+Shift+X", move || {
                    if let Some(window) = app_handle.get_webview_window("main") {
                        if window.is_visible().unwrap_or(false) {
                            window.hide().unwrap();
                        } else {
                            window.show().unwrap();
                            window.set_focus().unwrap();
                        }
                    }
                })
                .unwrap();
            
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // Add custom commands here
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}