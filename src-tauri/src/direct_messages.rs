use crate::models::{DirectMessageEvent, DirectMessageKind};
use anyhow::{Context, Result};
use sled::Tree;
use std::path::PathBuf;

#[derive(Clone)]
pub struct DirectMessageStore {
    db: Tree,
}

impl DirectMessageStore {
    pub fn open(db: Tree) -> Self {
        Self { db }
    }

    pub fn save_event(&self, event: DirectMessageEvent) -> Result<()> {
        let key = event.id.clone();
        let key = key.as_bytes();
        if let Some(existing) = self.db.get(key)? {
            let current: DirectMessageEvent =
                serde_json::from_slice(&existing).context("failed to decode direct message")?;
            if current.updated_at > event.updated_at {
                return Ok(());
            }
            if current.kind == DirectMessageKind::Asset
                && event.kind == DirectMessageKind::Asset
                && event.file_path.is_none()
                && current.file_path.is_some()
            {
                let mut merged = event;
                merged.file_path = current.file_path;
                self.db.insert(key, serde_json::to_vec(&merged)?)?;
                self.db.flush()?;
                return Ok(());
            }
        }
        self.db.insert(key, serde_json::to_vec(&event)?)?;
        self.db.flush()?;
        Ok(())
    }

    pub fn save_remote_event(&self, mut event: DirectMessageEvent, sync_floor: u64) -> Result<()> {
        if event.created_at < sync_floor {
            return Ok(());
        }
        if let Some(existing) = self.db.get(event.id.as_bytes())? {
            let current: DirectMessageEvent =
                serde_json::from_slice(&existing).context("failed to decode direct message")?;
            if event.deleted_at.is_some()
                && current.kind == DirectMessageKind::Asset
                && current.deleted_at.is_none()
            {
                if let Some(path) = current.file_path.as_ref() {
                    let _ = std::fs::remove_file(PathBuf::from(path));
                }
            }
            if event.file_path.is_none() {
                event.file_path = current.file_path;
            }
        } else if event.kind == DirectMessageKind::Asset {
            event.file_path = None;
        }
        self.save_event(event)
    }

    pub fn thread(&self, peer_id: &str) -> Result<Vec<DirectMessageEvent>> {
        let mut events = Vec::new();
        for item in self.db.iter() {
            let (_, value) = item.context("failed to scan direct messages")?;
            let event: DirectMessageEvent =
                serde_json::from_slice(&value).context("failed to decode direct message")?;
            if event.peer_id == peer_id {
                events.push(event);
            }
        }
        events.sort_by(|a, b| a.created_at.cmp(&b.created_at).then(a.id.cmp(&b.id)));
        Ok(events)
    }

    pub fn clear(&self) -> Result<()> {
        self.db.clear()?;
        self.db.flush()?;
        Ok(())
    }
}
