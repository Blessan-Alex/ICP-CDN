use std::collections::HashMap;
use std::cell::RefCell;
use candid::{CandidType, Deserialize};
use ic_cdk::api::caller;

#[derive(CandidType, Deserialize, Clone)]
pub struct IpfsFile {
    pub name: String,
    pub cid: String,
    pub size: u64,
    pub content_type: String,
    pub uploaded_at: u64,
}

thread_local! {
    static USER_FILES: RefCell<HashMap<String, Vec<IpfsFile>>> = RefCell::new(HashMap::new());
}

fn get_user_key() -> String {
    caller().to_string()
}

#[ic_cdk::update]
fn add_ipfs_file(name: String, cid: String, size: u64, content_type: String) -> Result<String, String> {
    if name.is_empty() || cid.is_empty() {
        return Err("Filename and CID cannot be empty".to_string());
    }
    let file = IpfsFile {
        name,
        cid,
        size,
        content_type,
        uploaded_at: ic_cdk::api::time(),
    };
    let user_key = get_user_key();
    USER_FILES.with(|files| {
        let mut files = files.borrow_mut();
        let user_files = files.entry(user_key).or_insert_with(Vec::new);
        user_files.push(file);
    });
    Ok("File metadata added".to_string())
}

#[ic_cdk::query]
fn list_ipfs_files() -> Vec<IpfsFile> {
    let user_key = get_user_key();
    USER_FILES.with(|files| {
        let files = files.borrow();
        files.get(&user_key).cloned().unwrap_or_default()
    })
}

#[ic_cdk::update]
fn delete_ipfs_file(cid: String) -> Result<String, String> {
    if cid.is_empty() {
        return Err("CID cannot be empty".to_string());
    }
    let user_key = get_user_key();
    let removed = USER_FILES.with(|files| {
        let mut files = files.borrow_mut();
        if let Some(user_files) = files.get_mut(&user_key) {
            let initial_len = user_files.len();
            user_files.retain(|file| file.cid != cid);
            initial_len != user_files.len()
        } else {
            false
        }
    });
    if removed {
        Ok("File deleted".to_string())
    } else {
        Err("File not found".to_string())
    }
}

#[ic_cdk::query]
fn greet(name: String) -> String {
    format!("Hello, {}!", name)
}
