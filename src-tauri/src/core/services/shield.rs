#[derive(Debug, Clone, PartialEq, Eq)]
pub enum CorruptionReason {
    ZeroBytes,
    AbnormalShrink {
        current_bytes: u64,
        previous_bytes: u64,
        loss_percentage: u8,
    },
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum ShieldVerdict {
    Safe,
    Corrupted { reason: CorruptionReason },
}

#[derive(Debug, Clone)]
pub struct ShieldService {
    /// Maximum allowed drop in file size as a percentage (default 80%)
    pub max_shrink_percentage: u8,
}

impl Default for ShieldService {
    fn default() -> Self {
        Self {
            max_shrink_percentage: 80,
        }
    }
}

impl ShieldService {
    pub fn new(max_shrink_percentage: u8) -> Self {
        Self {
            max_shrink_percentage,
        }
    }

    /// Evaluates whether a save file or directory state is healthy and safe to snapshot and sync.
    ///
    /// - Returns `Corrupted(ZeroBytes)` if `current_bytes == 0`.
    /// - Returns `Corrupted(AbnormalShrink)` if size shrank by more than `max_shrink_percentage`.
    /// - Returns `Safe` otherwise.
    pub fn evaluate(&self, current_bytes: u64, previous_bytes: Option<u64>) -> ShieldVerdict {
        // 1. Zero-byte check
        if current_bytes == 0 {
            return ShieldVerdict::Corrupted {
                reason: CorruptionReason::ZeroBytes,
            };
        }

        // 2. Check for abnormal size drop if we have a previous baseline
        if let Some(prev) = previous_bytes {
            // Only evaluate shrinkage if previous size was meaningfully non-zero
            if prev > 0 && current_bytes < prev {
                let bytes_lost = prev - current_bytes;
                let loss_pct = ((bytes_lost as f64 / prev as f64) * 100.0).round() as u8;

                if loss_pct >= self.max_shrink_percentage {
                    return ShieldVerdict::Corrupted {
                        reason: CorruptionReason::AbnormalShrink {
                            current_bytes,
                            previous_bytes: prev,
                            loss_percentage: loss_pct,
                        },
                    };
                }
            }
        }

        ShieldVerdict::Safe
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn flags_zero_byte_saves_as_corrupted() {
        let shield = ShieldService::default();
        let verdict = shield.evaluate(0, None);

        assert_eq!(
            verdict,
            ShieldVerdict::Corrupted {
                reason: CorruptionReason::ZeroBytes,
            }
        );
    }

    #[test]
    fn flags_zero_byte_even_with_previous_baseline() {
        let shield = ShieldService::default();
        let verdict = shield.evaluate(0, Some(1024 * 1024));

        assert_eq!(
            verdict,
            ShieldVerdict::Corrupted {
                reason: CorruptionReason::ZeroBytes,
            }
        );
    }

    #[test]
    fn flags_abnormal_shrink_over_eighty_percent() {
        let shield = ShieldService::default();
        // 1000 bytes down to 100 bytes is a 90% loss
        let verdict = shield.evaluate(100, Some(1000));

        assert_eq!(
            verdict,
            ShieldVerdict::Corrupted {
                reason: CorruptionReason::AbnormalShrink {
                    current_bytes: 100,
                    previous_bytes: 1000,
                    loss_percentage: 90,
                },
            }
        );
    }

    #[test]
    fn allows_normal_size_reductions() {
        let shield = ShieldService::default();
        // 1000 bytes down to 700 bytes is 30% loss (safe)
        let verdict = shield.evaluate(700, Some(1000));

        assert_eq!(verdict, ShieldVerdict::Safe);
    }

    #[test]
    fn allows_growth_or_first_time_saves() {
        let shield = ShieldService::default();
        assert_eq!(shield.evaluate(5000, None), ShieldVerdict::Safe);
        assert_eq!(shield.evaluate(6000, Some(5000)), ShieldVerdict::Safe);
    }
}
