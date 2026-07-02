let currentSpeech: SpeechSynthesisUtterance | null = null;

export function speakText(
  text: string,
  enabled: boolean,
  onCaptionChange?: (caption: string) => void
) {
  if (onCaptionChange) {
    onCaptionChange(text);
  }

  if (!enabled) {
    return;
  }

  try {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel(); // Cancel any ongoing speech
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      
      currentSpeech = utterance;
      window.speechSynthesis.speak(utterance);
    }
  } catch (err) {
    console.error("Speech synthesis failed", err);
  }
}

export function stopSpeech() {
  try {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  } catch (err) {
    console.error("Failed to stop speech", err);
  }
}
