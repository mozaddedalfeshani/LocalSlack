use crate::models::DeviceInfo;
use anyhow::{Context, Result};
use sled::Db;

#[derive(Clone)]
pub struct FavoritesStore {
    db: Db,
}

impl FavoritesStore {
    pub fn open(db: Db) -> Self {
        Self { db }
    }

    pub fn add_favorite(&self, mut device: DeviceInfo) -> Result<()> {
        device.is_favorite = true;
        self.db
            .insert(device.id.as_bytes(), serde_json::to_vec(&device)?)?;
        self.db.flush()?;
        Ok(())
    }

    pub fn remove_favorite(&self, device_id: &str) -> Result<()> {
        self.db.remove(device_id.as_bytes())?;
        self.db.flush()?;
        Ok(())
    }

    pub fn get_favorites(&self) -> Result<Vec<DeviceInfo>> {
        let mut devices = Vec::new();
        for item in self.db.iter() {
            let (_, value) = item.context("failed to scan favorites")?;
            devices
                .push(serde_json::from_slice(&value).context("failed to decode favorite device")?);
        }
        devices.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));
        Ok(devices)
    }

    pub fn is_favorite(&self, device_id: &str) -> Result<bool> {
        Ok(self.db.contains_key(device_id.as_bytes())?)
    }
}
