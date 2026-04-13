class ComfortModel:
    """Simple comfort classifier from temperature + humidity."""

    def predict(self, temperature, humidity):
        temp_score = max(0.0, 1.0 - abs(temperature - 24.0) / 10.0)
        humidity_score = max(0.0, 1.0 - abs(humidity - 50.0) / 30.0)
        score = 0.6 * temp_score + 0.4 * humidity_score

        if score >= 0.75:
            label = "Comfortable"
            confidence = min(0.99, 0.6 + score * 0.4)
        elif score >= 0.5:
            label = "Slightly Uncomfortable"
            confidence = min(0.95, 0.5 + score * 0.35)
        else:
            label = "Uncomfortable"
            confidence = min(0.9, 0.5 + (1.0 - score) * 0.35)

        reasons = []
        if temperature > 30:
            reasons.append("Temperature too high")
        elif temperature < 19:
            reasons.append("Temperature too low")
        if humidity > 70:
            reasons.append("Humidity too high")
        elif humidity < 30:
            reasons.append("Humidity too low")
        if not reasons:
            reasons.append("Temperature and humidity are in preferred range")

        return {
            "label": label,
            "confidence": round(confidence, 2),
            "score": round(score, 2),
            "reasons": reasons,
        }
