use tauri::Manager;
use tauri_plugin_global_shortcut::{GlobalShortcutExt, ShortcutState};

#[cfg(feature = "backend-manager")]
mod backend_manager;

#[cfg(feature = "backend-manager")]
use backend_manager::BackendManager;

fn main() {
    #[cfg(feature = "backend-manager")]
    let backend = BackendManager::new("127.0.0.1".to_string(), 8000);

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(|app, _shortcut, event| {
                    if event.state == ShortcutState::Pressed {
                        if let Some(window) = app.get_webview_window("main") {
                            if window.is_visible().unwrap_or(false) {
                                window.hide().unwrap();
                            } else {
                                window.show().unwrap();
                                window.set_focus().unwrap();
                            }
                        }
                    }
                })
                .build(),
        )
        .plugin(tauri_plugin_updater::Builder::new().build())
        .setup(|app| {
            if let Some(window) = app.get_webview_window("main") {
                window.show()?;
            }

            if let Err(error) = app.global_shortcut().register("Ctrl+Shift+X") {
                eprintln!("Unable to register Ctrl+Shift+X: {error}");
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            #[cfg(feature = "backend-manager")]
            backend_start,
            #[cfg(feature = "backend-manager")]
            backend_stop,
            #[cfg(feature = "backend-manager")]
            backend_status,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(feature = "backend-manager")]
#[tauri::command]
async fn backend_start() -> Result<backend_manager::StartupInfo, String> {
    backend
        .start()
        .map_err(|e| e.to_string())
}

#[cfg(feature = "backend-manager")]
#[tauri::command]
async fn backend_stop() -> Result<(), String> {
    backend.stop().map_err(|e| e.to_string())
}

#[cfg(feature = "backend-manager")]
#[tauri::command]
async fn backend_status() -> Result<bool, String> {
    Ok(backend.is_healthy())
}