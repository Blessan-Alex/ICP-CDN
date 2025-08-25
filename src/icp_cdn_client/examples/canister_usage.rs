// Example: How other canisters can use the dCDN
// This shows how OpenChat, Caffeine, or any other canister can integrate with the dCDN

use icp_cdn_client::{CdnCanisterClient, UserTier};
use candid::Principal;

// Example: OpenChat canister integration
pub struct OpenChatCdnIntegration {
    cdn_client: CdnCanisterClient,
}

impl OpenChatCdnIntegration {
    pub fn new(cdn_canister_id: Principal) -> Self {
        Self {
            cdn_client: CdnCanisterClient::new(cdn_canister_id),
        }
    }

    /// Upload a chat image
    pub async fn upload_chat_image(&self, image_bytes: Vec<u8>) -> Result<String, String> {
        // Estimate cost first
        let estimated_cost = self.cdn_client.estimate_upload_cost(image_bytes.len() as u64).await
            .map_err(|e| format!("Failed to estimate cost: {}", e))?;
        
        // Upload with cycles payment
        let result = self.cdn_client.upload_content(
            image_bytes,
            "image/jpeg".to_string(),
            estimated_cost
        ).await;
        
        match result {
            Ok(cid) => Ok(cid),
            Err(e) => Err(format!("Upload failed: {}", e)),
        }
    }

    /// Get a chat image
    pub async fn get_chat_image(&self, cid: String) -> Result<Vec<u8>, String> {
        let result = self.cdn_client.get_content_with_fallback(cid).await;
        
        match result {
            Ok(content) => Ok(content),
            Err(e) => Err(format!("Content retrieval failed: {}", e)),
        }
    }

    /// Upload multiple chat images in bulk
    pub async fn upload_chat_images_bulk(&self, images: Vec<Vec<u8>>) -> Result<Vec<String>, String> {
        // Convert images to (content, content_type) pairs
        let files: Vec<(Vec<u8>, String)> = images.into_iter()
            .map(|img| (img, "image/jpeg".to_string()))
            .collect();
        
        // Estimate total cost
        let total_size: u64 = files.iter().map(|(content, _)| content.len() as u64).sum();
        let estimated_cost = self.cdn_client.estimate_upload_cost(total_size).await
            .map_err(|e| format!("Failed to estimate cost: {}", e))?;
        
        // Bulk upload
        let result = self.cdn_client.bulk_upload(files, estimated_cost).await;
        
        match result {
            Ok(cids) => Ok(cids),
            Err(e) => Err(format!("Bulk upload failed: {}", e)),
        }
    }
}

// Example: Caffeine canister integration
pub struct CaffeineCdnIntegration {
    cdn_client: CdnCanisterClient,
}

impl CaffeineCdnIntegration {
    pub fn new(cdn_canister_id: Principal) -> Self {
        Self {
            cdn_client: CdnCanisterClient::new(cdn_canister_id),
        }
    }

    /// Upload a video file
    pub async fn upload_video(&self, video_bytes: Vec<u8>) -> Result<String, String> {
        // Estimate cost for video upload
        let estimated_cost = self.cdn_client.estimate_upload_cost(video_bytes.len() as u64).await
            .map_err(|e| format!("Failed to estimate cost: {}", e))?;
        
        // Upload video
        let result = self.cdn_client.upload_content(
            video_bytes,
            "video/mp4".to_string(),
            estimated_cost
        ).await;
        
        match result {
            Ok(cid) => Ok(cid),
            Err(e) => Err(format!("Video upload failed: {}", e)),
        }
    }

    /// Stream a video file
    pub async fn stream_video(&self, cid: String) -> Result<Vec<u8>, String> {
        let result = self.cdn_client.get_content_with_fallback(cid).await;
        
        match result {
            Ok(content) => Ok(content),
            Err(e) => Err(format!("Video streaming failed: {}", e)),
        }
    }

    /// Get account information and upgrade tier if needed
    pub async fn check_and_upgrade_tier(&self) -> Result<(), String> {
        let account = self.cdn_client.get_account_info().await
            .map_err(|e| format!("Failed to get account info: {}", e))?;
        
        // Check if we need to upgrade tier for better performance
        if account.tier == UserTier::Free {
            // In a real implementation, you would call upgrade_tier here
            println!("Consider upgrading from Free tier for better performance");
        }
        
        Ok(())
    }
}

// Example: Social media app integration
pub struct SocialMediaCdnIntegration {
    cdn_client: CdnCanisterClient,
}

impl SocialMediaCdnIntegration {
    pub fn new(cdn_canister_id: Principal) -> Self {
        Self {
            cdn_client: CdnCanisterClient::new(cdn_canister_id),
        }
    }

    /// Upload a post with multiple media files
    pub async fn upload_post_content(&self, text_content: String, media_files: Vec<Vec<u8>>) -> Result<(String, Vec<String>), String> {
        // Upload text content
        let text_bytes = text_content.into_bytes();
        let text_cost = self.cdn_client.estimate_upload_cost(text_bytes.len() as u64).await
            .map_err(|e| format!("Failed to estimate text cost: {}", e))?;
        
        let text_cid = self.cdn_client.upload_content(
            text_bytes,
            "text/plain".to_string(),
            text_cost
        ).await?;
        
        // Upload media files
        let media_files_with_types: Vec<(Vec<u8>, String)> = media_files.into_iter()
            .map(|file| (file, "image/jpeg".to_string()))
            .collect();
        
        let media_cost = self.cdn_client.estimate_upload_cost(
            media_files_with_types.iter().map(|(content, _)| content.len() as u64).sum()
        ).await.map_err(|e| format!("Failed to estimate media cost: {}", e))?;
        
        let media_cids = self.cdn_client.bulk_upload(media_files_with_types, media_cost).await?;
        
        Ok((text_cid, media_cids))
    }

    /// Get post content
    pub async fn get_post_content(&self, text_cid: String, media_cids: Vec<String>) -> Result<(String, Vec<Vec<u8>>), String> {
        // Get text content
        let text_bytes = self.cdn_client.get_content_with_fallback(text_cid).await?;
        let text_content = String::from_utf8(text_bytes)
            .map_err(|e| format!("Failed to decode text content: {}", e))?;
        
        // Get media content
        let mut media_contents = Vec::new();
        for cid in media_cids {
            let content = self.cdn_client.get_content_with_fallback(cid).await?;
            media_contents.push(content);
        }
        
        Ok((text_content, media_contents))
    }
}

// Example usage in a canister
#[ic_cdk::update]
async fn example_upload_image(image_bytes: Vec<u8>) -> Result<String, String> {
    let cdn_canister_id = Principal::from_text("your-cdn-canister-id").unwrap();
    let openchat_cdn = OpenChatCdnIntegration::new(cdn_canister_id);
    
    openchat_cdn.upload_chat_image(image_bytes).await
}

#[ic_cdk::query]
async fn example_get_image(cid: String) -> Result<Vec<u8>, String> {
    let cdn_canister_id = Principal::from_text("your-cdn-canister-id").unwrap();
    let openchat_cdn = OpenChatCdnIntegration::new(cdn_canister_id);
    
    openchat_cdn.get_chat_image(cid).await
}

// Main function for the example
fn main() {
    println!("CDN Canister Integration Example");
    println!("This example shows how other canisters can integrate with the dCDN");
    println!("To use this in a real canister, implement the integration functions above");
}
