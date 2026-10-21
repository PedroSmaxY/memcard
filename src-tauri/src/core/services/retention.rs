use crate::core::domain::Snapshot;

#[derive(Debug, Clone)]
pub struct RetentionPolicy {
    pub max_snapshots: usize,
}

impl Default for RetentionPolicy {
    fn default() -> Self {
        Self { max_snapshots: 20 }
    }
}

impl RetentionPolicy {
    pub fn new(max_snapshots: usize) -> Self {
        Self { max_snapshots }
    }

    /// Determines which snapshots should be pruned, strictly preserving pinned ones.
    /// Assumes snapshots are provided in descending chronological order (newest first).
    pub fn evaluate_pruning<'a>(&self, snapshots: &'a [Snapshot]) -> Vec<&'a Snapshot> {
        let mut unpinned: Vec<&'a Snapshot> = snapshots.iter().filter(|s| !s.is_pinned).collect();

        // If unpinned snapshots exceed the max capacity, return the excess oldest items
        if unpinned.len() > self.max_snapshots {
            unpinned.split_off(self.max_snapshots)
        } else {
            Vec::new()
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::Utc;
    use uuid::Uuid;

    fn create_test_snapshot(is_pinned: bool) -> Snapshot {
        Snapshot {
            id: Uuid::new_v4(),
            game_id: Uuid::new_v4(),
            hash: "testhash".to_string(),
            timestamp: Utc::now(),
            size_bytes: 1024,
            is_pinned,
            label: None,
        }
    }

    #[test]
    fn does_not_prune_under_capacity() {
        let policy = RetentionPolicy::new(5);
        let snapshots = vec![
            create_test_snapshot(false),
            create_test_snapshot(false),
            create_test_snapshot(false),
        ];

        let to_prune = policy.evaluate_pruning(&snapshots);
        assert!(to_prune.is_empty());
    }

    #[test]
    fn prunes_oldest_unpinned_when_exceeding_capacity() {
        let policy = RetentionPolicy::new(2);
        let s1 = create_test_snapshot(false);
        let s2 = create_test_snapshot(false);
        let s3 = create_test_snapshot(false);
        let snapshots = vec![s1, s2, s3];

        let to_prune = policy.evaluate_pruning(&snapshots);
        assert_eq!(to_prune.len(), 1);
        assert_eq!(to_prune[0].id, snapshots[2].id);
    }

    #[test]
    fn never_prunes_pinned_snapshots() {
        let policy = RetentionPolicy::new(1);
        let s1 = create_test_snapshot(false);
        let s2_pinned = create_test_snapshot(true);
        let s3 = create_test_snapshot(false);
        let snapshots = vec![s1, s2_pinned, s3];

        let to_prune = policy.evaluate_pruning(&snapshots);
        assert_eq!(to_prune.len(), 1);
        assert_eq!(to_prune[0].id, snapshots[2].id);
    }
}
