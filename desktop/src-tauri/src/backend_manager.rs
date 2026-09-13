use std::process::{Command, Child};
use std::sync::{Arc, Mutex};
use std::time::Duration;
use std::io::{self, Write};
use tauri::{AppHandle, Emitter};

/// Manages the X-Copilot backend process lifecycle.
pub struct BackendManager {
    process: Arc<Mutex<Option<Child>>>,
    #[allow(dead_code)]
    port: u16,
    #[allow(dead_code)]
    host: String,
}

impl BackendManager {
    pub fn new(host: String, port: u16) -> Self {
        Self {
            process: Arc::new(Mutex::new(None)),
            port,
            host,
        }
    }

    /// Start the backend process (`xcopilot serve`).
    pub fn start(&self) -> io::Result<StartupInfo> {
        let mut process_guard = self.process.lock().unwrap();

        if let Some(ref mut child) = *process_guard {
            if child.try_wait().unwrap().is_none() {
                return Ok(StartupInfo {
                    pid: child.id(),
                    status: "already_running".to_string(),
                });
            }
        }

        let mut cmd = Command::new("xcopilot");
        cmd.args(["serve", "--host", &self.host, "--port", &self.port.to_string()]);

        #[cfg(target_os = "windows")]
        {
            cmd.arg("--reload");
        }

        let child = cmd.spawn()?;
        let pid = child.id();

        *process_guard = Some(child);

        Ok(StartupInfo {
            pid,
            status: "started".to_string(),
        })
    }

    /// Stop the backend process.
    pub fn stop(&self) -> io::Result<()> {
        let mut process_guard = self.process.lock().unwrap();

        if let Some(ref mut child) = *process_guard {
            #[cfg(target_os = "windows")]
            {
                let _ = Command::new("taskkill")
                    .args(["/T", "/F", "/PID", &child.id().to_string()])
                    .output();
            }

            child.kill()?;
            child.wait()?;
        }

        *process_guard = None;
        Ok(())
    }

    /// Check if the backend process is running and healthy.
    pub fn is_healthy(&self) -> bool {
        let process_guard = self.process.lock().unwrap();

        match process_guard.as_ref() {
            Some(child) => child.try_wait().unwrap().is_none(),
            None => false,
        }
    }

    /// Get the current process PID if running.
    pub fn pid(&self) -> Option<u32> {
        let process_guard = self.process.lock().unwrap();
        process_guard.as_ref().map(|child| child.id())
    }
}

/// Startup result returned to the frontend.
#[derive(serde::Serialize)]
pub struct StartupInfo {
    pub pid: u32,
    pub status: String,
}

/// Register Tauri commands for backend management.
pub fn register_commands() {
    // Commands are registered via the invoke_handler in main.rs.
}