use crate::models::{
    now_unix, ChannelEvent, ChannelEventKind, ChannelNameChange, DeviceInfo, SlackChannel,
    SlackInfo,
};
use anyhow::{Context, Result};
use sled::Tree;
use std::collections::{HashMap, HashSet};
use std::path::PathBuf;

const SLACK_INFO_KEY: &[u8] = b"__slack_info";

#[derive(Clone)]
pub struct ChannelStore {
    db: Tree,
}

impl ChannelStore {
    pub fn open(db: Tree) -> Self {
        Self { db }
    }

    pub fn save_event(&self, mut event: ChannelEvent) -> Result<()> {
        if event.id.as_bytes() == SLACK_INFO_KEY {
            anyhow::bail!("reserved channel event id");
        }
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

    pub fn save_remote_events(&self, events: Vec<ChannelEvent>, sync_floor: u64) -> Result<()> {
        for mut event in events {
            if event.created_at < sync_floor {
                continue;
            }
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
            let (key, value) = item.context("failed to scan channel events")?;
            if key.as_ref() == SLACK_INFO_KEY {
                continue;
            }
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

    pub fn edit_text(
        &self,
        id: &str,
        author_id: &str,
        text: String,
    ) -> Result<Option<ChannelEvent>> {
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

    pub fn slack_info(&self) -> Result<SlackInfo> {
        let mut info = self.stored_slack_info()?;
        ensure_default_channels(&mut info);
        apply_message_counts(&mut info, &self.events()?);
        Ok(info)
    }

    pub fn save_remote_slack_info(&self, incoming: SlackInfo) -> Result<()> {
        if incoming.channels.is_empty() {
            return Ok(());
        }
        let mut local = self.stored_slack_info()?;
        ensure_default_channels(&mut local);
        merge_slack_info(&mut local, incoming);
        self.save_slack_info(local)
    }

    pub fn create_channel(&self, name: String, author: &DeviceInfo) -> Result<SlackInfo> {
        let mut info = self.stored_slack_info()?;
        ensure_default_channels(&mut info);
        let normalized = normalize_channel_name(&name)?;
        let existing_ids = info
            .channels
            .iter()
            .map(|channel| channel.id.as_str())
            .collect::<HashSet<_>>();
        let mut id = normalized.clone();
        if existing_ids.contains(id.as_str()) {
            id = format!("{}-{}", normalized, &uuid::Uuid::new_v4().to_string()[..8]);
        }
        let now = now_unix();
        info.channels.push(SlackChannel {
            id,
            name: normalized.clone(),
            title: title_from_name(&normalized),
            description: format!("Files and messages for #{normalized}."),
            created_by_id: author.id.clone(),
            created_by_name: author.name.clone(),
            created_at: now,
            updated_at: now,
            message_count: 0,
            last_name_changes: Vec::new(),
        });
        info.updated_at = now;
        self.save_slack_info(info)?;
        self.slack_info()
    }

    pub fn rename_channel(&self, id: &str, name: String, author: &DeviceInfo) -> Result<SlackInfo> {
        let mut info = self.stored_slack_info()?;
        ensure_default_channels(&mut info);
        let normalized = normalize_channel_name(&name)?;
        let now = now_unix();
        let Some(channel) = info.channels.iter_mut().find(|channel| channel.id == id) else {
            anyhow::bail!("channel was not found");
        };
        if channel.name == normalized {
            return self.slack_info();
        }
        let previous_name = channel.name.clone();
        channel.name = normalized.clone();
        channel.title = title_from_name(&normalized);
        channel.description = format!("Files and messages for #{normalized}.");
        channel.updated_at = now;
        channel.last_name_changes.insert(
            0,
            ChannelNameChange {
                previous_name,
                new_name: normalized,
                changed_by_id: author.id.clone(),
                changed_by_name: author.name.clone(),
                changed_at: now,
            },
        );
        channel.last_name_changes.truncate(5);
        info.updated_at = now;
        self.save_slack_info(info)?;
        self.slack_info()
    }

    fn stored_slack_info(&self) -> Result<SlackInfo> {
        self.db
            .get(SLACK_INFO_KEY)?
            .map(|value| serde_json::from_slice(&value).context("failed to decode slack info"))
            .transpose()
            .map(|info| info.unwrap_or_default())
    }

    fn save_slack_info(&self, mut info: SlackInfo) -> Result<()> {
        normalize_slack_info(&mut info);
        self.db.insert(SLACK_INFO_KEY, serde_json::to_vec(&info)?)?;
        self.db.flush()?;
        Ok(())
    }

    pub fn clear(&self) -> Result<()> {
        self.db.clear()?;
        self.db.flush()?;
        Ok(())
    }
}

fn ensure_default_channels(info: &mut SlackInfo) {
    let defaults = [
        (
            "general",
            "general",
            "General",
            "Open room for everyday team files.",
        ),
        (
            "media",
            "media-share",
            "Media Share",
            "Photos, screenshots, and design assets.",
        ),
        (
            "announcements",
            "announcements",
            "Announcements",
            "Important files everyone should receive.",
        ),
    ];
    for (id, name, title, description) in defaults {
        if info.channels.iter().any(|channel| channel.id == id) {
            continue;
        }
        info.channels.push(SlackChannel {
            id: id.to_string(),
            name: name.to_string(),
            title: title.to_string(),
            description: description.to_string(),
            created_by_id: "system".to_string(),
            created_by_name: "LocalSlack".to_string(),
            created_at: 0,
            updated_at: 0,
            message_count: 0,
            last_name_changes: Vec::new(),
        });
    }
}

fn apply_message_counts(info: &mut SlackInfo, events: &[ChannelEvent]) {
    let mut counts = HashMap::<String, u64>::new();
    for event in events.iter().filter(|event| event.deleted_at.is_none()) {
        *counts.entry(event.channel_id.clone()).or_default() += 1;
    }
    for channel in &mut info.channels {
        channel.message_count = counts.get(&channel.id).copied().unwrap_or(0);
    }
}

fn merge_slack_info(local: &mut SlackInfo, incoming: SlackInfo) {
    for incoming_channel in incoming.channels {
        if let Some(local_channel) = local
            .channels
            .iter_mut()
            .find(|channel| channel.id == incoming_channel.id)
        {
            if incoming_channel.updated_at >= local_channel.updated_at {
                let local_changes = local_channel.last_name_changes.clone();
                *local_channel = incoming_channel;
                local_channel.last_name_changes =
                    merge_name_changes(local_changes, local_channel.last_name_changes.clone());
            } else {
                local_channel.last_name_changes = merge_name_changes(
                    local_channel.last_name_changes.clone(),
                    incoming_channel.last_name_changes,
                );
            }
        } else {
            local.channels.push(incoming_channel);
        }
    }
    local.updated_at = local.updated_at.max(incoming.updated_at);
    normalize_slack_info(local);
}

fn merge_name_changes(
    local: Vec<ChannelNameChange>,
    incoming: Vec<ChannelNameChange>,
) -> Vec<ChannelNameChange> {
    let mut seen = HashSet::<String>::new();
    let mut merged = local
        .into_iter()
        .chain(incoming)
        .filter(|change| {
            let key = format!(
                "{}:{}:{}:{}",
                change.changed_at, change.changed_by_id, change.previous_name, change.new_name
            );
            seen.insert(key)
        })
        .collect::<Vec<_>>();
    merged.sort_by(|a, b| b.changed_at.cmp(&a.changed_at));
    merged.truncate(5);
    merged
}

fn normalize_slack_info(info: &mut SlackInfo) {
    let mut seen_ids = HashSet::<String>::new();
    info.channels
        .retain(|channel| seen_ids.insert(channel.id.clone()));
    // Resolve concurrent creates of the same channel name: keep the earlier one.
    info.channels
        .sort_by(|a, b| a.created_at.cmp(&b.created_at).then(a.id.cmp(&b.id)));
    let mut seen_names = HashSet::<String>::new();
    info.channels
        .retain(|channel| seen_names.insert(channel.name.clone()));
    info.channels.sort_by(|a, b| {
        a.created_at
            .cmp(&b.created_at)
            .then_with(|| a.name.cmp(&b.name))
            .then_with(|| a.id.cmp(&b.id))
    });
}

fn normalize_channel_name(name: &str) -> Result<String> {
    let normalized = name
        .trim()
        .trim_start_matches('#')
        .to_ascii_lowercase()
        .chars()
        .map(|ch| if ch.is_ascii_alphanumeric() { ch } else { '-' })
        .collect::<String>()
        .split('-')
        .filter(|part| !part.is_empty())
        .collect::<Vec<_>>()
        .join("-");
    if normalized.is_empty() {
        anyhow::bail!("channel name cannot be empty");
    }
    Ok(normalized)
}

fn title_from_name(name: &str) -> String {
    name.split('-')
        .filter(|part| !part.is_empty())
        .map(|part| {
            let mut chars = part.chars();
            match chars.next() {
                Some(first) => format!("{}{}", first.to_ascii_uppercase(), chars.as_str()),
                None => String::new(),
            }
        })
        .collect::<Vec<_>>()
        .join(" ")
}
