use std::collections::HashMap;
use std::cell::RefCell;
use std::collections::BTreeMap;

// --- ICP HTTP interface types ---
use candid::{CandidType, Deserialize};
use candid::define_function;
define_function!(pub CallbackFunc : (Vec<u8>) -> (Vec<u8>));

#[derive(CandidType, Deserialize)]
pub struct HttpRequest {
    pub method: String,
    pub url: String,
    pub headers: Vec<HttpHeader>,
    pub body: Vec<u8>,
    pub certificate_version: Option<u16>,
}

#[derive(CandidType, Deserialize)]
pub struct HttpResponse {
    pub status_code: u16,
    pub headers: Vec<HttpHeader>,
    pub body: Vec<u8>,
    pub streaming_strategy: Option<StreamingStrategy>,
}

#[derive(CandidType, Deserialize)]
pub struct HttpHeader(pub String, pub String);

#[derive(CandidType, Deserialize)]
pub enum StreamingStrategy {
    Callback { callback: CallbackFunc, token: Vec<u8> },
}
// --- End ICP HTTP interface types ---

use ic_cdk::api::{set_certified_data, caller};
use ic_certified_map::{RbTree, AsHashTree};
use ic_stable_structures::{StableBTreeMap, memory_manager::{MemoryManager, VirtualMemory, MemoryId}, DefaultMemoryImpl};

type FilePath = String;
type FileContent = Vec<u8>;
type AssetStore = HashMap<FilePath, FileContent>;

// Helper function to create user-specific keys
fn user_key(path: &str) -> String {
    let caller_principal = caller().to_string();
    format!("{}:{}", caller_principal, path)
}

thread_local! {
    static MEMORY_MANAGER: RefCell<MemoryManager<DefaultMemoryImpl>> =
        RefCell::new(MemoryManager::init(DefaultMemoryImpl::default()));
    static ASSETS: RefCell<StableBTreeMap<String, Vec<u8>, VirtualMemory<DefaultMemoryImpl>>> =
        RefCell::new(StableBTreeMap::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(MemoryId::new(0)))
        ));
    static CERTIFIED_MAP: RefCell<RbTree<Vec<u8>, [u8; 32]>> = RefCell::new(RbTree::new());
    static IN_PROGRESS_UPLOADS: RefCell<BTreeMap<String, Vec<u8>>> = RefCell::new(BTreeMap::new());
}

#[ic_cdk::init]
fn init() {
    // No need to clear ASSETS; stable map persists across upgrades
    CERTIFIED_MAP.with(|map| {
        let root_hash = map.borrow().root_hash();
        set_certified_data(&root_hash);
    });
}

#[ic_cdk::update]
fn upload_asset(path: FilePath, content: FileContent) -> Result<String, String> {
    if path.is_empty() {
        return Err("Path cannot be empty".to_string());
    }
    if content.is_empty() {
        return Err("Content cannot be empty".to_string());
    }
    let user_path = user_key(&path);
    ASSETS.with(|assets| {
        assets.borrow_mut().insert(user_path.clone(), content.clone());
    });
    CERTIFIED_MAP.with(|map| {
        map.borrow_mut().insert(user_path.clone().into_bytes(), ic_certified_map::leaf_hash(&content));
        let root_hash = map.borrow().root_hash();
        set_certified_data(&root_hash);
    });
    Ok(format!("Asset uploaded successfully at path: {}", path))
}

#[ic_cdk::update]
fn delete_asset(path: FilePath) -> Result<String, String> {
    if path.is_empty() {
        return Err("Path cannot be empty".to_string());
    }
    let user_path = user_key(&path);
    let removed = ASSETS.with(|assets| assets.borrow_mut().remove(&user_path));
    CERTIFIED_MAP.with(|map| {
        map.borrow_mut().delete(&user_path.clone().into_bytes());
        let root_hash = map.borrow().root_hash();
        set_certified_data(&root_hash);
    });
    match removed {
        Some(_) => Ok(format!("Asset deleted: {}", path)),
        None => Err(format!("Asset not found: {}", path)),
    }
}

#[ic_cdk::query]
fn get_asset_info(path: FilePath) -> Option<(u64, String)> {
    let user_path = user_key(&path);
    ASSETS.with(|assets| {
        let assets = assets.borrow();
        assets.get(&user_path).map(|content| {
            let size = content.len() as u64;
            let content_type = infer_content_type(&path);
            (size, content_type)
        })
    })
}

#[ic_cdk::query]
fn list_assets() -> Vec<String> {
    let caller_principal = caller().to_string();
    ASSETS.with(|assets| {
        let assets = assets.borrow();
        assets.keys()
            .filter(|k| k.starts_with(&format!("{}:", caller_principal)))
            .map(|k| {
                // Remove the user prefix to return just the path
                k.splitn(2, ':').nth(1).unwrap_or(&k).to_string()
            })
            .collect()
    })
}

#[ic_cdk::update]
fn start_upload(path: FilePath) -> Result<String, String> {
    if path.is_empty() {
        return Err("Path cannot be empty".to_string());
    }
    let user_path = user_key(&path);
    IN_PROGRESS_UPLOADS.with(|uploads| {
        uploads.borrow_mut().insert(user_path.clone(), Vec::new());
    });
    Ok(format!("Started upload for {}", path))
}

#[ic_cdk::update]
fn upload_chunk(path: FilePath, chunk: FileContent) -> Result<String, String> {
    if path.is_empty() {
        return Err("Path cannot be empty".to_string());
    }
    let user_path = user_key(&path);
    IN_PROGRESS_UPLOADS.with(|uploads| {
        let mut uploads = uploads.borrow_mut();
        if let Some(buf) = uploads.get_mut(&user_path) {
            buf.extend_from_slice(&chunk);
            Ok(format!("Chunk uploaded for {} ({} bytes)", path, chunk.len()))
        } else {
            Err("No upload session found for this path".to_string())
        }
    })
}

#[ic_cdk::update]
fn commit_upload(path: FilePath) -> Result<String, String> {
    if path.is_empty() {
        return Err("Path cannot be empty".to_string());
    }
    let user_path = user_key(&path);
    let content = IN_PROGRESS_UPLOADS.with(|uploads| uploads.borrow_mut().remove(&user_path));
    if let Some(content) = content {
        ASSETS.with(|assets| {
            assets.borrow_mut().insert(user_path.clone(), content.clone());
        });
        CERTIFIED_MAP.with(|map| {
            map.borrow_mut().insert(user_path.clone().into_bytes(), ic_certified_map::leaf_hash(&content));
            let root_hash = map.borrow().root_hash();
            set_certified_data(&root_hash);
        });
        Ok(format!("Upload committed for {}", path))
    } else {
        Err("No upload session found for this path".to_string())
    }
}

#[ic_cdk::update]
fn abort_upload(path: FilePath) -> Result<String, String> {
    if path.is_empty() {
        return Err("Path cannot be empty".to_string());
    }
    let user_path = user_key(&path);
    let removed = IN_PROGRESS_UPLOADS.with(|uploads| uploads.borrow_mut().remove(&user_path));
    if removed.is_some() {
        Ok(format!("Upload aborted for {}", path))
    } else {
        Err("No upload session found for this path".to_string())
    }
}

#[ic_cdk::update]
fn sync_asset_to_frontend(path: FilePath) -> Result<String, String> {
    if path.is_empty() {
        return Err("Path cannot be empty".to_string());
    }

    let user_path = user_key(&path);
    // Get the asset content from stable storage
    let content = ASSETS.with(|assets| {
        let assets = assets.borrow();
        assets.get(&user_path).map(|v| v.clone())
    });

    match content {
        Some(content) => {
            // Check if content is too large for single response
            if content.len() > 2_000_000 { // 2MB limit
                return Err("File too large for single sync. Use chunked download.".to_string());
            }
            // Return the content as base64 for the frontend to save
            let base64_content = base64_encode(&content);
            Ok(format!("SYNC_DATA:{}:{}", path, base64_content))
        },
        None => Err(format!("Asset not found: {}", path))
    }
}

#[ic_cdk::query]
fn get_asset_chunk(path: FilePath, chunk_index: u32) -> Result<Vec<u8>, String> {
    if path.is_empty() {
        return Err("Path cannot be empty".to_string());
    }

    let user_path = user_key(&path);
    let chunk_size = 1_000_000; // 1MB chunks for download
    
    let content = ASSETS.with(|assets| {
        let assets = assets.borrow();
        assets.get(&user_path).map(|v| v.clone())
    });

    match content {
        Some(content) => {
            let start = (chunk_index as usize) * chunk_size;
            if start >= content.len() {
                return Err("Chunk index out of bounds".to_string());
            }
            let end = std::cmp::min(start + chunk_size, content.len());
            Ok(content[start..end].to_vec())
        },
        None => Err(format!("Asset not found: {}", path))
    }
}

#[ic_cdk::query]
fn get_asset_chunk_count(path: FilePath) -> Result<u32, String> {
    if path.is_empty() {
        return Err("Path cannot be empty".to_string());
    }

    let user_path = user_key(&path);
    let chunk_size = 1_000_000; // 1MB chunks for download
    
    let content = ASSETS.with(|assets| {
        let assets = assets.borrow();
        assets.get(&user_path).map(|v| v.len())
    });

    match content {
        Some(size) => {
            let chunk_count = (size + chunk_size - 1) / chunk_size; // Ceiling division
            Ok(chunk_count as u32)
        },
        None => Err(format!("Asset not found: {}", path))
    }
}

// Helper function to parse query parameters from a URL string
fn get_query_param(url: &str, param: &str) -> Option<String> {
    // Find the '?' in the URL
    let query_start = url.find('?')?;
    let query = &url[query_start + 1..];
    for pair in query.split('&') {
        let mut parts = pair.splitn(2, '=');
        if let (Some(key), Some(value)) = (parts.next(), parts.next()) {
            if key == param {
                // Decode percent-encoding if needed
                return Some(percent_decode(value));
            }
        }
    }
    None
}

// Simple percent-decoding for URL values (handles %XX)
fn percent_decode(input: &str) -> String {
    let mut result = String::new();
    let mut chars = input.chars();
    while let Some(c) = chars.next() {
        if c == '%' {
            let hi = chars.next();
            let lo = chars.next();
            if let (Some(hi), Some(lo)) = (hi, lo) {
                if let (Some(hi), Some(lo)) = (hi.to_digit(16), lo.to_digit(16)) {
                    result.push((hi * 16 + lo) as u8 as char);
                    continue;
                }
            }
            // If percent-encoding is invalid, just add '%'
            result.push('%');
        } else if c == '+' {
            result.push(' ');
        } else {
            result.push(c);
        }
    }
    result
}

#[ic_cdk::query]
fn http_request(req: HttpRequest) -> HttpResponse {
    // Backend canister only serves the index page
    // Assets are served by the separate asset canister
    HttpResponse {
        status_code: 200,
        headers: vec![
            HttpHeader("Content-Type".to_string(), "text/html".to_string()),
            HttpHeader("Access-Control-Allow-Origin".to_string(), "*".to_string()),
        ],
        body: generate_index_page().into_bytes(),
        streaming_strategy: None,
    }
}

fn infer_content_type(path: &str) -> String {
    if let Some(extension) = path.split('.').last() {
        match extension.to_lowercase().as_str() {
            "html" | "htm" => "text/html",
            "css" => "text/css",
            "js" => "application/javascript",
            "json" => "application/json",
            "png" => "image/png",
            "jpg" | "jpeg" => "image/jpeg",
            "gif" => "image/gif",
            "svg" => "image/svg+xml",
            "ico" => "image/x-icon",
            "woff" => "font/woff",
            "woff2" => "font/woff2",
            "ttf" => "font/ttf",
            "eot" => "application/vnd.ms-fontobject",
            "pdf" => "application/pdf",
            "txt" => "text/plain",
            "xml" => "application/xml",
            _ => "application/octet-stream",
        }.to_string()
    } else {
        "application/octet-stream".to_string()
    }
}

fn generate_index_page() -> String {
    format!(
        r#"<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ICP CDN - Backend API</title>
    <style>
        body {{
            font-family: Arial, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
        }}
        .container {{
            background: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }}
        h1 {{
            color: #333;
            text-align: center;
            margin-bottom: 30px;
        }}
        .info-section {{
            background: #f8f9fa;
            padding: 20px;
            border-radius: 5px;
            margin-bottom: 30px;
        }}
        .architecture {{
            background: #e3f2fd;
            padding: 20px;
            border-radius: 5px;
            margin-bottom: 30px;
        }}
        .endpoints {{
            background: #fff3e0;
            padding: 20px;
            border-radius: 5px;
        }}
        code {{
            background: #f5f5f5;
            padding: 2px 4px;
            border-radius: 3px;
            font-family: monospace;
        }}
        .endpoint {{
            margin: 10px 0;
            padding: 10px;
            background: #f9f9f9;
            border-left: 4px solid #007bff;
        }}
    </style>
</head>
<body>
    <div class="container">
        <h1>🌐 ICP CDN - Backend API</h1>
        
        <div class="info-section">
            <h3>📋 About This Service</h3>
            <p>This is the backend API for the ICP CDN (Content Delivery Network). It handles user authentication, file uploads, and data management.</p>
            <p><strong>Status:</strong> ✅ Backend API is running</p>
        </div>
        
        <div class="architecture">
            <h3>🏗️ Architecture</h3>
            <p><strong>Backend Canister:</strong> This canister - handles user data, authentication, and file management</p>
            <p><strong>Asset Canister:</strong> Separate canister that serves static files publicly</p>
            <p><strong>Frontend:</strong> React application with Internet Identity authentication</p>
        </div>
        
        <div class="endpoints">
            <h3>🔗 API Endpoints</h3>
            <div class="endpoint">
                <strong>upload_asset(path, content)</strong> - Upload a file to user's storage
            </div>
            <div class="endpoint">
                <strong>list_assets()</strong> - List user's uploaded files
            </div>
            <div class="endpoint">
                <strong>delete_asset(path)</strong> - Delete a user's file
            </div>
            <div class="endpoint">
                <strong>sync_asset_to_frontend(path)</strong> - Get file data for frontend sync
            </div>
        </div>
        
        <div style="text-align: center; margin-top: 30px; color: #666;">
            <p>Powered by Internet Computer Protocol (ICP)</p>
            <p><a href="http://127.0.0.1:4943/?canisterId=ucwa4-rx777-77774-qaada-cai" target="_blank">🌐 Access Frontend</a></p>
        </div>
    </div>
</body>
</html>"#
    )
}

// Add base64 encoding function
fn base64_encode(data: &[u8]) -> String {
    let mut result = String::new();
    let alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    
    let mut i = 0;
    while i < data.len() {
        let mut chunk = [0u8; 3];
        let chunk_size = std::cmp::min(3, data.len() - i);
        chunk[..chunk_size].copy_from_slice(&data[i..i + chunk_size]);
        
        let b1 = chunk[0];
        let b2 = if chunk_size > 1 { chunk[1] } else { 0 };
        let b3 = if chunk_size > 2 { chunk[2] } else { 0 };
        
        let c1 = (b1 >> 2) as usize;
        let c2 = (((b1 & 0x03) << 4) | (b2 >> 4)) as usize;
        let c3 = if chunk_size > 1 { (((b2 & 0x0f) << 2) | (b3 >> 6)) as usize } else { 64 };
        let c4 = if chunk_size > 2 { (b3 & 0x3f) as usize } else { 64 };
        
        result.push(alphabet.chars().nth(c1).unwrap());
        result.push(alphabet.chars().nth(c2).unwrap());
        result.push(if c3 == 64 { '=' } else { alphabet.chars().nth(c3).unwrap() });
        result.push(if c4 == 64 { '=' } else { alphabet.chars().nth(c4).unwrap() });
        
        i += 3;
    }
    
    result
}

// Keep the original greet function for compatibility
#[ic_cdk::query]
fn greet(name: String) -> String {
    format!("Hello, {}! Welcome to ICP CDN!", name)
}
