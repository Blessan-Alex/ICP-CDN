use candid::Principal;
use icp_cdn_client::{
    CdnClient, CYCLES_SMALL_UPLOAD
};

// Example: How to use the CDN client in another canister
#[ic_cdk::update]
async fn upload_user_avatar(user_id: String, avatar_bytes: Vec<u8>) -> Result<String, String> {
    // Create a CDN client instance
    let cdn_client = CdnClient::new(
        Principal::from_text("your-actual-cdn-canister-id")
            .expect("Invalid CDN canister ID")
    );
    
    // Upload the avatar
    let cid = cdn_client
        .upload_asset(
            avatar_bytes,
            "image/png".to_string(),
            CYCLES_SMALL_UPLOAD,
        )
        .await?;

    store_user_avatar_cid(user_id, cid.clone())?;
    Ok(cid)
}

#[ic_cdk::query]
async fn get_user_avatar(user_id: String) -> Result<Vec<u8>, String> {
    let cdn_client = CdnClient::new(
        Principal::from_text("your-actual-cdn-canister-id")
            .expect("Invalid CDN canister ID")
    );
    
    let cid = get_user_avatar_cid(user_id)?;
    cdn_client.get_asset(cid).await
}

#[ic_cdk::update]
async fn upload_simple_document(content: Vec<u8>) -> Result<String, String> {
    let cdn_client = CdnClient::default();
    
    // Check user's account before uploading
    let user_account = cdn_client.get_user_account().await?;
    println!("User balance: {} cycles", user_account.cycles_balance);
    
    // Upload the document
    let cid = cdn_client
        .upload_asset(
            content,
            "text/plain".to_string(),
            CYCLES_SMALL_UPLOAD,
        )
        .await?;

    Ok(cid)
}

#[ic_cdk::update]
async fn upload_multiple_files(files: Vec<(Vec<u8>, String)>) -> Result<Vec<String>, String> {
    let cdn_client = CdnClient::default();
    let mut cids = Vec::new();
    
    for (content, content_type) in files {
        let cid = cdn_client
            .upload_asset(
                content,
                content_type,
                CYCLES_SMALL_UPLOAD,
            )
            .await?;
        
        cids.push(cid);
    }
    
    Ok(cids)
}

#[ic_cdk::update]
async fn smart_upload(content: Vec<u8>, content_type: String) -> Result<String, String> {
    let cdn_client = CdnClient::default();
    
    // Generate CID first to check if already exists
    let cid = cdn_client.generate_cid(&content, &content_type);
    
    // Check if already cached
    if cdn_client.is_cached(cid.clone()).await? {
        println!("Content already cached with CID: {}", cid);
        return Ok(cid);
    }
    
    // Estimate cost before uploading
    let estimated_cost = cdn_client.estimate_upload_cost(content.len() as u64).await?;
    println!("Estimated upload cost: {} cycles", estimated_cost);
    
    // Upload with estimated cost
    let result = cdn_client
        .upload_asset(
            content,
            content_type,
            estimated_cost,
        )
        .await?;

    Ok(result)
}

// Helper functions
fn store_user_avatar_cid(_user_id: String, _cid: String) -> Result<(), String> {
    // In a real implementation, this would store the CID in your canister's state
    Ok(())
}

fn get_user_avatar_cid(_user_id: String) -> Result<String, String> {
    // In a real implementation, this would retrieve the CID from your canister's state
    Ok("example-cid".to_string())
}

// Main function for the example
fn main() {
    println!("ICP CDN Client Library - Basic Usage Example");
    println!("This example shows how to use the CDN client in another canister.");
    println!("To use these functions, include this code in your canister's lib.rs");
}
