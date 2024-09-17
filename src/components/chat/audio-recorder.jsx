import React, { useEffect, useLayoutEffect } from 'react';
import { useState, useRef } from 'react';

const AudioRecorder = ({ onTranscriptSpeech, onIsRecording, disabled = false }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeechRecognitionAvailable, setIsSpeechRecognitionAvailable] = useState(true);
  const recognitionRef = useRef(null);

  const startRecording = () => {
    const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    recognition.lang = 'es-ES';
    recognition.interimResults = false;

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      onTranscriptSpeech(transcript);
    };

    recognition.onend = () => {
      // Eliminar cualquier reinicio automático del reconocimiento de voz
      if (isRecording) {
        stopRecording();
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsRecording(true);
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
      setIsRecording(false);
      recognitionRef.current.stop();
      recognitionRef.current = null;  // Limpiar la referencia
    }
  };

  const handleButtonClick = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  useLayoutEffect(() => {
    setIsSpeechRecognitionAvailable(!!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window));
  }, []);

  useEffect(() => {
    onIsRecording(isRecording);
  }, [isRecording]);

  if (isSpeechRecognitionAvailable) {
    return (
      <button
        disabled={disabled}
        onClick={handleButtonClick}
        type="button"
        className={`disabled:text-neutral-500 disabled:cursor-not-allowed text-3xl flex items-center justify-center cursor-pointer ${isRecording ? 'text-red-500' : 'text-white'}`}
      >
        {isRecording ? <ion-icon name="mic-circle"></ion-icon> : <ion-icon name="mic"></ion-icon>}
      </button>
    );
  }

  return null;
};

export default AudioRecorder;
