use crate::models::{now_unix, ChannelEvent, ChannelEventKind};
use anyhow::{Context, Result};
use sled::Tree;
use std::path::PathBuf;

#[derive(Clone)]
pub struct ChannelStore {
    db: Tree,
}

impl ChannelStore {
    pub fn open(db: Tree) -> Self {
        Self { db }
    }

    pub fn save_event(&self, mut event: ChannelEvent) -> Result<()> {
        let key = event.id.as_bytes();
        if let Some(existing) = self.db.get(key)? {
            let current: ChannelEvent =
                serde_json::from_slice(&existing).context("failed to decode channel event")?;
            if current.kind == ChannelEventKind::Asset && event.kind == ChannelEventKind::Asset {
                event.available_count = event.available_count.max(current.available_count);
                if current.file_path.is_some() {
                    event.file_path = current.file_path;
                }
            }
            if current.updated_at > event.updated_at {
                return Ok(());
            }
        }
        self.db.insert(key, serde_json::to_vec(&event)?)?;
        self.db.flush()?;
        Ok(())
    }

    pub fn save_events(&self, events: Vec<ChannelEvent>) -> Result<()> {
        for event in events {
            self.save_event(event)?;
        }
        Ok(())
    }

    pub fn save_remote_events(&self, events: Vec<ChannelEvent>) -> Result<()> {
        for mut event in events {
            let key = event.id.as_bytes();
            if let Some(existing) = self.db.get(key)? {
                let current: ChannelEvent =
                    serde_json::from_slice(&existing).context("failed to decode channel event")?;
                event.available_count = event.available_count.max(current.available_count);
                if event.deleted_at.is_some()
                    && current.kind == ChannelEventKind::Asset
                    && current.deleted_at.is_none()
                {
                    if let Some(path) = current.file_path.as_ref() {
                        let _ = std::fs::remove_file(PathBuf::from(path));
                    }
                }
                event.file_path = current.file_path;
            } else {
                event.file_path = None;
            }
            self.save_event(event)?;
        }
        Ok(())
    }

    pub fn event(&self, id: &str) -> Result<Option<ChannelEvent>> {
        self.db
            .get(id.as_bytes())?
            .map(|value| serde_json::from_slice(&value).context("failed to decode channel event"))
            .transpose()
    }

    pub fn events(&self) -> Result<Vec<ChannelEvent>> {
        let mut events = Vec::new();
        for item in self.db.iter() {
            let (_, value) = item.context("failed to scan channel events")?;
            events.push(
                serde_json::from_slice::<ChannelEvent>(&value)
                    .context("failed to decode channel event")?,
            );
        }
        events.sort_by(|a, b| a.created_at.cmp(&b.created_at).then(a.id.cmp(&b.id)));
        Ok(events)
    }

    pub fn events_since(&self, since: u64) -> Result<Vec<ChannelEvent>> {
        Ok(self
            .events()?
            .into_iter()
            .filter(|event| event.updated_at > since)
            .collect())
    }

    pub fn mark_deleted(&self, id: &str, author_id: &str) -> Result<Option<ChannelEvent>> {
        let Some(value) = self.db.get(id.as_bytes())? else {
            return Ok(None);
        };
        let mut event: ChannelEvent =
            serde_json::from_slice(&value).context("failed to decode channel event")?;
        if event.author_id != author_id {
            anyhow::bail!("only the author can delete this channel item");
        }
        let now = now_unix();
        event.deleted_at = Some(now);
        event.updated_at = now;
        if event.kind == ChannelEventKind::Asset {
            if let Some(path) = event.file_path.as_ref() {
                let _ = std::fs::remove_file(PathBuf::from(path));
            }
        }
        self.save_event(event.clone())?;
        Ok(Some(event))
    }

    pub fn edit_text(&self, id: &str, author_id: &str, text: String) -> Result<Option<ChannelEvent>> {
        let Some(value) = self.db.get(id.as_bytes())? else {
            return Ok(None);
        };
        let mut event: ChannelEvent =
            serde_json::from_slice(&value).context("failed to decode channel event")?;
        if event.author_id != author_id {
            anyhow::bail!("only the author can edit this message");
        }
        if event.kind != ChannelEventKind::Text {
            anyhow::bail!("only text messages can be edited");
        }
        if event.deleted_at.is_some() {
            anyhow::bail!("deleted messages cannot be edited");
        }
        event.text = Some(text);
        event.updated_at = now_unix();
        self.save_event(event.clone())?;
        Ok(Some(event))
    }

    pub fn cleanup_expired(&self, retention_months: u32) -> Result<usize> {
        let months = retention_months.max(1) as u64;
        let cutoff = now_unix().saturating_sub(months * 30 * 24 * 60 * 60);
        let mut removed = 0;
        for event in self.events()? {
            let deleted_expired = event.deleted_at.map(|ts| ts <= cutoff).unwrap_or(false);
            if event.created_at > cutoff && !deleted_expired {
                continue;
            }
            if event.kind == ChannelEventKind::Asset {
                if let Some(path) = event.file_path.as_ref() {
                    let _ = std::fs::remove_file(PathBuf::from(path));
                }
            }
            self.db.remove(event.id.as_bytes())?;
            removed += 1;
        }
        if removed > 0 {
            self.db.flush()?;
        }
        Ok(removed)
    }
}
