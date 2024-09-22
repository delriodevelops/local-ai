import React, { useEffect, useState } from 'react';

const TTSButton = ({ message, isStreaming }) => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [chunks, setChunks] = useState([]);
  const [currentChunk, setCurrentChunk] = useState(0); // Inicializa en 0 para empezar desde el principio
  const [paused, setPaused] = useState(false);

  const synth = window.speechSynthesis;

  function readAloud(index = 0) {
    if (index < chunks.length) {
      const utterance = new SpeechSynthesisUtterance();
      setCurrentChunk(index);
      synth.cancel(); // Asegura que cualquier lectura anterior se detenga
      setIsSpeaking(true);
      setPaused(false); // Si empieza a leer, no está pausado
      utterance.text = chunks[index];

      utterance.onend = () => {
        if (index + 1 < chunks.length) {
          readAloud(index + 1); // Leer siguiente chunk si hay más
        } else {
          setIsSpeaking(false); // Termina cuando no hay más chunks
          setCurrentChunk(0); // Reinicia para leer desde el principio en la siguiente reproducción
        }
      };

      synth.speak(utterance);
    }
  }

  const handleButtonClick = () => {
    if (isSpeaking) {
      if (paused) {
        // Reanudar la lectura desde el último chunk leído
        readAloud(currentChunk);
      } else {
        synth.cancel(); // Pausar lectura
        setPaused(true);
        setIsSpeaking(false); // Actualizar estado de hablando
      }
    } else {
      // Iniciar o reanudar la lectura
      readAloud(currentChunk === chunks.length ? 0 : currentChunk); // Si se terminó, vuelve a empezar
    }
  };

  useEffect(() => {
    const regex = /[,.\n-]+/g;

    if (!isStreaming) {
      const processedChunks = message.content.split(regex).reduce((arr, item, index, array) => {
        item = item.trim().split(' ').filter(Boolean).join(' '); // Elimina espacios extra

        if (index < array.length - 1) {
          const delimiter = message.content.match(regex)[index];
          item += delimiter;

          if (delimiter === '.' && (item.length > 100 || item.length < 5)) item += '\n';
        }

        if (item.length > 170) {
          const words = item.split(' ');
          const maxChunkSize = 50;

          for (let i = 0; i < words.length / maxChunkSize; i++) {
            const chunk = words.slice(i * maxChunkSize, (i + 1) * maxChunkSize).join(' ');
            arr.push(chunk);
          }
        } else {
          arr.push(item);
        }

        return arr;
      }, []);

      setChunks(processedChunks.filter(Boolean)); // Actualiza los chunks filtrando vacíos
    }
  }, [isStreaming, message.content]);

  return (
    <button
      disabled={!!isStreaming}
      className='disabled:cursor-not-allowed disabled:hover:bg-neutral-700 disabled:text-neutral-400 text-2xl p-2 hover:bg-neutral-600 rounded-full cursor-pointer flex items-center w-fit h-fit self-start'
      onClick={handleButtonClick}
    >
      {
        !isSpeaking && !paused
          ? <ion-icon name="volume-high-outline"></ion-icon> // Icono para empezar a hablar
          : paused
          ? <ion-icon name="play-outline"></ion-icon> // Icono de reanudar cuando está pausado
          : <ion-icon name="pause-outline"></ion-icon> // Icono de pausa cuando está hablando
      }
    </button>
  );
}

export default TTSButton;
