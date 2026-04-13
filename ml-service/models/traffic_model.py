from collections import deque


class TrafficModel:
    """
    Traffic model with PIR confirmation.
    Traffic is treated as meaningful only when PIR reports "yes"
    multiple times in a rolling window.
    """

    def __init__(self, window_size=5, min_hits=3):
        self.window_size = window_size
        self.min_hits = min_hits
        self.pir_window = deque(maxlen=window_size)

    def predict(self, pir_triggered, network_speed, latency, occupancy_count, traffic_level_sensor):
        self.pir_window.append(1 if pir_triggered else 0)
        pir_hits = sum(self.pir_window)
        pir_confirmed = pir_hits >= self.min_hits

        traffic_sensor_score = max(0.0, min(1.0, traffic_level_sensor / 100.0))
        occupancy_score = max(0.0, min(1.0, occupancy_count / 80.0))
        latency_score = max(0.0, min(1.0, latency / 120.0))
        speed_penalty = max(0.0, min(1.0, (250.0 - network_speed) / 250.0))

        raw_score = (
            0.40 * traffic_sensor_score
            + 0.25 * occupancy_score
            + 0.20 * latency_score
            + 0.15 * speed_penalty
        )

        # PIR confirmation gates the final traffic impact.
        pir_gate = 1.0 if pir_confirmed else 0.35
        final_score = raw_score * pir_gate

        if final_score >= 0.7:
            label = "High Traffic"
        elif final_score >= 0.4:
            label = "Moderate Traffic"
        else:
            label = "Low Traffic"

        confidence = min(0.98, 0.45 + final_score * 0.5 + (0.1 if pir_confirmed else 0.0))
        reasons = []
        if pir_confirmed:
            reasons.append(f"PIR confirmed with {pir_hits}/{self.window_size} recent triggers")
        else:
            reasons.append(f"PIR not yet confirmed ({pir_hits}/{self.window_size} recent triggers)")
        if latency > 60:
            reasons.append("High network latency observed")
        if network_speed < 100:
            reasons.append("Low network speed observed")

        return {
            "label": label,
            "confidence": round(confidence, 2),
            "score": round(final_score, 2),
            "pir_hits": pir_hits,
            "pir_window": self.window_size,
            "reasons": reasons,
        }
