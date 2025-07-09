use std::collections::HashMap;
use std::cell::RefCell;

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

use ic_cdk::api::set_certified_data;
use ic_certified_map::{RbTree, AsHashTree};

type FilePath = String;
type FileContent = Vec<u8>;
type AssetStore = HashMap<FilePath, FileContent>;

thread_local! {
    static ASSETS: RefCell<AssetStore> = RefCell::default();
    static CERTIFIED_MAP: RefCell<RbTree<Vec<u8>, [u8; 32]>> = RefCell::new(RbTree::new());
}

#[ic_cdk::init]
fn init() {
    // Initialize the asset store
    ASSETS.with(|assets| {
        *assets.borrow_mut() = HashMap::new();
    });
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
    ASSETS.with(|assets| {
        assets.borrow_mut().insert(path.clone(), content.clone());
    });
    CERTIFIED_MAP.with(|map| {
        map.borrow_mut().insert(path.clone().into_bytes(), ic_certified_map::leaf_hash(&content));
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
    let removed = ASSETS.with(|assets| assets.borrow_mut().remove(&path));
    CERTIFIED_MAP.with(|map| {
        map.borrow_mut().delete(&path.clone().into_bytes());
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
    ASSETS.with(|assets| {
        let assets = assets.borrow();
        assets.get(&path).map(|content| {
            let size = content.len() as u64;
            let content_type = infer_content_type(&path);
            (size, content_type)
        })
    })
}

#[ic_cdk::query]
fn list_assets() -> Vec<String> {
    ASSETS.with(|assets| {
        let assets = assets.borrow();
        assets.keys().cloned().collect()
    })
}

// HTTP request handler for serving assets
#[ic_cdk::query]
fn http_request(req: HttpRequest) -> HttpResponse {
    let path = req.url.clone();
    // Handle root path
    if path == "/" || path.is_empty() {
        return HttpResponse {
            status_code: 200,
            headers: vec![
                HttpHeader("Content-Type".to_string(), "text/html".to_string()),
                HttpHeader("Access-Control-Allow-Origin".to_string(), "*".to_string()),
            ],
            body: generate_index_page().into_bytes(),
            streaming_strategy: None,
        };
    }
    ASSETS.with(|assets| {
        let assets = assets.borrow();
        if let Some(asset_content) = assets.get(&path) {
            let content_type = infer_content_type(&path);
            let headers = vec![
                HttpHeader("Content-Type".to_string(), content_type),
                HttpHeader("Access-Control-Allow-Origin".to_string(), "*".to_string()),
                HttpHeader("Cache-Control".to_string(), "public, max-age=31536000".to_string()),
            ];
            HttpResponse {
                status_code: 200,
                headers,
                body: asset_content.clone(),
                streaming_strategy: None,
            }
        } else {
            HttpResponse {
                status_code: 404,
                headers: vec![
                    HttpHeader("Content-Type".to_string(), "text/plain".to_string()),
                    HttpHeader("Access-Control-Allow-Origin".to_string(), "*".to_string()),
                ],
                body: format!("Asset not found: {}", path).into_bytes(),
                streaming_strategy: None,
            }
        }
    })
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
    let assets = ASSETS.with(|assets| {
        let assets = assets.borrow();
        assets.keys().cloned().collect::<Vec<String>>()
    });
    
    let assets_list = if assets.is_empty() {
        "<p>No assets uploaded yet.</p>".to_string()
    } else {
        assets.iter()
            .map(|path| format!("<li><a href=\"{}\">{}</a></li>", path, path))
            .collect::<Vec<String>>()
            .join("\n")
    };
    
    format!(
        r#"<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ICP CDN - Content Delivery Network</title>
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
        .upload-section {{
            background: #f8f9fa;
            padding: 20px;
            border-radius: 5px;
            margin-bottom: 30px;
        }}
        .assets-section h3 {{
            color: #555;
            margin-bottom: 15px;
        }}
        ul {{
            list-style: none;
            padding: 0;
        }}
        li {{
            padding: 8px 0;
            border-bottom: 1px solid #eee;
        }}
        a {{
            color: #007bff;
            text-decoration: none;
        }}
        a:hover {{
            text-decoration: underline;
        }}
        .status {{
            padding: 10px;
            border-radius: 5px;
            margin: 10px 0;
        }}
        .success {{
            background: #d4edda;
            color: #155724;
            border: 1px solid #c3e6cb;
        }}
        .error {{
            background: #f8d7da;
            color: #721c24;
            border: 1px solid #f5c6cb;
        }}
    </style>
</head>
<body>
    <div class="container">
        <h1>🌐 ICP CDN - Decentralized Content Delivery Network</h1>
        
        <div class="upload-section">
            <h3>📤 Upload Assets</h3>
            <p>This is a decentralized CDN running on the Internet Computer. Upload your assets and they'll be served globally with automatic caching.</p>
            <p><strong>Status:</strong> Ready for uploads</p>
        </div>
        
        <div class="assets-section">
            <h3>📁 Stored Assets ({})</h3>
            <ul>
                {}
            </ul>
        </div>
        
        <div style="text-align: center; margin-top: 30px; color: #666;">
            <p>Powered by Internet Computer Protocol (ICP)</p>
        </div>
    </div>
</body>
</html>"#,
        assets.len(),
        assets_list
    )
}

// Keep the original greet function for compatibility
#[ic_cdk::query]
fn greet(name: String) -> String {
    format!("Hello, {}! Welcome to ICP CDN!", name)
}
