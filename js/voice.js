/** @typedef {{ start: () => void; stop: () => void; isListening: () => boolean; destroy: () => void }} VoiceController */

/**
 * @returns {typeof SpeechRecognition | null}
 */
function getSpeechRecognitionCtor() {
  const w = /** @type {typeof globalThis & { SpeechRecognition?: typeof SpeechRecognition; webkitSpeechRecognition?: typeof SpeechRecognition }} */ (
    globalThis
  );
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

export function isSpeechRecognitionSupported() {
  return Boolean(getSpeechRecognitionCtor());
}

/**
 * @param {string} text
 */
export function speakText(text) {
  const t = String(text || "").trim();
  if (!t || !globalThis.speechSynthesis) return;
  try {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(t);
    u.rate = 1;
    speechSynthesis.speak(u);
  } catch {
    /* ignore */
  }
}

/**
 * @param {{
 *   onListeningChange: (listening: boolean) => void;
 *   onTranscriptDisplay: (interim: string, finalSoFar: string) => void;
 *   onFinalUtterance?: (fullTranscript: string) => void;
 *   onSessionEnd: (finalTranscript: string) => void;
 *   onError: (message: string) => void;
 * }} handlers
 * @returns {VoiceController | null}
 */
export function createVoiceController(handlers) {
  const Ctor = getSpeechRecognitionCtor();
  if (!Ctor) return null;

  /** @type {SpeechRecognition | null} */
  let rec = null;
  let listening = false;
  let destroyed = false;
  /** @type {string} */
  let accumulatedFinal = "";
  /** @type {string} */
  let lastInterim = "";

  function setListening(v) {
    listening = v;
    handlers.onListeningChange(v);
  }

  function build() {
    accumulatedFinal = "";
    lastInterim = "";

    const r = new Ctor();
    r.lang = "tr-TR";
    r.interimResults = true;
    r.continuous = false;
    r.maxAlternatives = 1;

    r.onstart = () => {
      setListening(true);
    };

    r.onresult = (event) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const res = event.results[i];
        const piece = res[0]?.transcript ?? "";
        if (res.isFinal) {
          accumulatedFinal += piece;
          lastInterim = "";
        } else {
          lastInterim = piece;
        }
      }
      handlers.onTranscriptDisplay(lastInterim.trim(), accumulatedFinal.trim());

      const last = event.results[event.results.length - 1];
      if (last?.isFinal && handlers.onFinalUtterance) {
        const full =
          accumulatedFinal.trim() || String(last[0]?.transcript ?? "").trim();
        if (full) handlers.onFinalUtterance(full);
      }
    };

    r.onerror = (event) => {
      const err = event.error;
      if (err === "aborted") return;
      const human =
        err === "not-allowed"
          ? "Microphone permission denied"
          : err === "no-speech"
            ? "No speech detected"
            : err === "network"
              ? "Speech recognition network error"
              : `Speech error: ${err}`;
      handlers.onError(human);
    };

    r.onend = () => {
      setListening(false);
      const finalText = accumulatedFinal.trim() || lastInterim.trim();
      handlers.onSessionEnd(finalText);
    };

    return r;
  }

  return {
    start() {
      if (destroyed) return;
      try {
        if (rec) {
          try {
            rec.abort();
          } catch {
            /* ignore */
          }
        }
        rec = build();
        rec.start();
      } catch (e) {
        setListening(false);
        handlers.onError(e instanceof Error ? e.message : "Could not start recognition");
      }
    },
    stop() {
      if (!rec) return;
      try {
        rec.abort();
      } catch {
        /* ignore */
      }
      setListening(false);
    },
    isListening() {
      return listening;
    },
    destroy() {
      destroyed = true;
      if (rec) {
        try {
          rec.abort();
        } catch {
          /* ignore */
        }
        rec = null;
      }
      setListening(false);
    },
  };
}
