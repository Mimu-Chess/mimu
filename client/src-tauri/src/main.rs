#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::{
    path::PathBuf,
    process::{Child, Command},
    sync::Mutex,
};

use tauri::{AppHandle, Manager};

struct ServerState(Mutex<Option<Child>>);

fn node_binary_path(resource_dir: &PathBuf) -> PathBuf {
    if cfg!(target_os = "windows") {
        resource_dir.join("bin").join("node-x86_64-pc-windows-msvc.exe")
    } else {
        resource_dir.join("bin").join("node-x86_64-unknown-linux-gnu")
    }
}

fn start_server(app: &AppHandle) -> Result<Option<Child>, String> {
    if cfg!(debug_assertions) {
        return Ok(None);
    }

    let resource_dir = app.path().resource_dir().map_err(|err| err.to_string())?;
    let node_path = node_binary_path(&resource_dir);
    let server_dir = resource_dir.join("server");
    let server_entry = server_dir.join("dist").join("index.js");

    if !node_path.exists() {
        return Err(format!("Bundled node runtime not found at {}", node_path.display()));
    }
    if !server_entry.exists() {
        return Err(format!("Bundled server entry not found at {}", server_entry.display()));
    }

    let child = Command::new(node_path)
        .arg(server_entry)
        .current_dir(server_dir)
        .spawn()
        .map_err(|err| format!("Failed to start bundled server: {err}"))?;

    Ok(Some(child))
}

fn stop_server(app: &AppHandle) {
    if let Some(mut child) = app.state::<ServerState>().0.lock().unwrap().take() {
        let _ = child.kill();
        let _ = child.wait();
    }
}

fn main() {
    let app = tauri::Builder::default()
        .manage(ServerState(Mutex::new(None)))
        .setup(|app| {
            let child = start_server(&app.handle())?;
            *app.state::<ServerState>().0.lock().unwrap() = child;
            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while building Mimu Chess desktop");

    app.run(|app_handle, event| {
        if matches!(event, tauri::RunEvent::Exit) {
            stop_server(app_handle);
        }
    });
}
