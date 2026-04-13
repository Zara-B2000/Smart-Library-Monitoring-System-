class FocusModel:
    """Simple focus classifier from light + noise levels."""

    def predict(self, light, noise):
        # Best focus zone: light 450-750 lux and noise <= 50 dB.
        light_score = max(0.0, 1.0 - abs(light - 600.0) / 500.0)
        noise_score = max(0.0, 1.0 - max(0.0, noise - 45.0) / 40.0)
        score = 0.55 * light_score + 0.45 * noise_score

        if score >= 0.75:
            label = "Focused"
            confidence = min(0.99, 0.6 + score * 0.4)
        elif score >= 0.5:
            label = "Partially Focused"
            confidence = min(0.95, 0.52 + score * 0.33)
        else:
            label = "Distracted"
            confidence = min(0.9, 0.5 + (1.0 - score) * 0.35)

        reasons = []
        if noise > 60:
            reasons.append("Noise level is too high")
        if light < 250:
            reasons.append("Lighting is too low")
        elif light > 900:
            reasons.append("Lighting is too bright")
        if not reasons:
            reasons.append("Light and noise are suitable for focus")

        return {
            "label": label,
            "confidence": round(confidence, 2),
            "score": round(score, 2),
            "reasons": reasons,
        }
