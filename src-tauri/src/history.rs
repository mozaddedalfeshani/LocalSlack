use crate::models::{now_unix, HistoryEntry, TransferDirection};
use anyhow::{Context, Result};
use sled::Tree;

#[derive(Clone)]
pub struct HistoryStore {
    db: Tree,
}

impl HistoryStore {
    pub fn open(db: Tree) -> Self {
        Self { db }
    }

    pub fn save_history_entry(&self, entry: HistoryEntry) -> Result<()> {
        let key = format!("{:020}:{}", entry.timestamp, entry.id);
        self.db
            .insert(key.as_bytes(), serde_json::to_vec(&entry)?)?;
        self.db.flush()?;
        Ok(())
    }

    pub fn get_history(&self, filter: &str) -> Result<Vec<HistoryEntry>> {
        let now = now_unix();
        let week_start = now.saturating_sub(7 * 24 * 60 * 60);
        let today_start = now.saturating_sub(now % 86_400);
        let mut entries = Vec::new();
        for item in self.db.iter() {
            let (_, value) = item.context("failed to scan history")?;
            let entry: HistoryEntry =
                serde_json::from_slice(&value).context("failed to decode history entry")?;
            let keep = match filter {
                "sent" => entry.direction == TransferDirection::Sent,
                "received" => entry.direction == TransferDirection::Received,
                "today" => entry.timestamp >= today_start,
                "week" | "thisWeek" => entry.timestamp >= week_start,
                _ => true,
            };
            if keep {
                entries.push(entry);
            }
        }
        entries.sort_by(|a, b| b.timestamp.cmp(&a.timestamp));
        Ok(entries)
    }

    pub fn clear_history(&self) -> Result<()> {
        self.db.clear()?;
        self.db.flush()?;
        Ok(())
    }

    pub fn delete_entry(&self, id: &str) -> Result<()> {
        let keys: Vec<_> = self
            .db
            .iter()
            .filter_map(|item| item.ok())
            .filter_map(|(key, value)| {
                serde_json::from_slice::<HistoryEntry>(&value)
                    .ok()
                    .filter(|entry| entry.id == id)
                    .map(|_| key)
            })
            .collect();
        for key in keys {
            self.db.remove(key)?;
        }
        self.db.flush()?;
        Ok(())
    }
}
