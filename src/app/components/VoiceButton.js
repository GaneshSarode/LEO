'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Mic } from 'lucide-react';

const pulseKeyframes = `
@keyframes voicePulse {
  0% {
    box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.6);
  }
  50% {
    box-shadow: 0 0 0 10px rgba(239, 68, 68, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(239, 68, 68, 0);
  }
}
`;

export default function VoiceButton({ onTranscript, style }) {
  const [isListening, setIsListening] = useState(false);
  const [supported, setSupported] = useState(false);
  const recognitionRef = useRef(null);
  const styleInjectedRef = useRef(false);

  useEffect(() => {
    const SpeechRecognition =
      typeof window !== 'undefined' &&
      (window.SpeechRecognition || window.webkitSpeechRecognition);

    setSupported(!!SpeechRecognition);

    if (!styleInjectedRef.current && typeof document !== 'undefined') {
      const styleEl = document.createElement('style');
      styleEl.textContent = pulseKeyframes;
      document.head.appendChild(styleEl);
      styleInjectedRef.current = true;
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (_) {
          /* ignore */
        }
        recognitionRef.current = null;
      }
    };
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (_) {
        /* ignore */
      }
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, []);

  const startListening = useCallback(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.continuous = false;

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      if (onTranscript && transcript) {
        onTranscript(transcript);
      }
      stopListening();
    };

    recognition.onerror = () => {
      stopListening();
    };

    recognition.onend = () => {
      setIsListening(false);
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;
    setIsListening(true);

    try {
      recognition.start();
    } catch (_) {
      stopListening();
    }
  }, [onTranscript, stopListening]);

  const handleClick = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  if (!supported) {
    return null;
  }

  const buttonStyle = {
    width: 40,
    height: 40,
    borderRadius: '50%',
    border: isListening ? 'none' : '1px solid var(--border)',
    background: isListening ? 'var(--accent-danger)' : 'var(--bg-elevated)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
    outline: 'none',
    transition: 'background 0.2s ease, box-shadow 0.2s ease',
    animation: isListening ? 'voicePulse 1.4s ease-in-out infinite' : 'none',
    position: 'relative',
    flexShrink: 0,
    ...style,
  };

  return (
    <button
      onClick={handleClick}
      style={buttonStyle}
      title={isListening ? 'Stop listening' : 'Start voice input'}
      aria-label={isListening ? 'Stop voice recognition' : 'Start voice recognition'}
    >
      <Mic
        size={18}
        color={isListening ? '#ffffff' : 'var(--text-secondary)'}
        strokeWidth={2}
      />
    </button>
  );
}
