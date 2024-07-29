import React, { useState, useEffect, useMemo, useRef } from 'react';
import Vapi from "@vapi-ai/web";
import { Spinner } from './Spinner';

const PhoneIcon = (
  <svg stroke="white" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" height="40px" width="40px" xmlns="http://www.w3.org/2000/svg"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
);

const PhoneCallIcon = (
  <svg stroke="white" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" height="40px" width="40px" xmlns="http://www.w3.org/2000/svg"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path><path d="M14.05 2a9 9 0 0 1 8 7.94"></path><path d="M14.05 6A5 5 0 0 1 18 10"></path></svg>
);

const MuteIconOn = (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="1" y1="1" x2="23" y2="23"></line>
    <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"></path>
    <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"></path>
    <line x1="12" y1="19" x2="12" y2="23"></line>
    <line x1="8" y1="23" x2="16" y2="23"></line>
  </svg>
);

const MuteIconOff = (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
    <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
    <line x1="12" y1="19" x2="12" y2="23"></line>
    <line x1="8" y1="23" x2="16" y2="23"></line>
  </svg>
);

const VolumeIcon = (level: number) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
    {level > 0 && <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>}
    {level > 1 && <path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>}
  </svg>
);

interface WidgetProps {
  publicApiKey: string;
  assistantId: string;
}

const Widget: React.FC<WidgetProps> = ({ publicApiKey, assistantId }) => {
  // State declarations
  const [isMuted, setIsMuted] = useState(false);
  const [volumeLevel, setVolumeLevel] = useState(2);
  const [isOnCall, setIsOnCall] = useState(false);
  const [timer, setTimer] = useState(0);
  const [userVoiceVolume, setUserVoiceVolume] = useState(0);
  const [aiVoiceVolume, setAiVoiceVolume] = useState(0);
  const [didAiStartSpeaking, setDidAiStartSpeaking] = useState(false);

  const isWaiting = isOnCall && !didAiStartSpeaking

  // Refs for audio context
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);

  // Initialize Vapi
  const vapi = useMemo(() => new Vapi(publicApiKey), [publicApiKey]);

  // Helper function to format time
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Effect for timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isOnCall && didAiStartSpeaking) {
      interval = setInterval(() => {
        setTimer((prevTimer) => prevTimer + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isOnCall, didAiStartSpeaking]);

  // Function to set up audio
  const setupAudio = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      source.connect(analyserRef.current);

      const bufferLength = analyserRef.current.frequencyBinCount;
      dataArrayRef.current = new Uint8Array(bufferLength);
    } catch (error) {
      console.error('Error accessing microphone:', error);
    }
  };

  // Function to get voice volume
  const getVoiceVolume = () => {
    if (analyserRef.current && dataArrayRef.current) {
      analyserRef.current.getByteFrequencyData(dataArrayRef.current);
      const average = dataArrayRef.current.reduce((acc, val) => acc + val, 0) / dataArrayRef.current.length;
      return average / 255; // Normalize to 0-1 range
    }
    return 0;
  };

  // Effect for voice volume
  useEffect(() => {
    let animationFrame: number = 0;

    const updateVoiceVolume = () => {
      if (isOnCall && !isMuted && didAiStartSpeaking) {
        const volume = getVoiceVolume();
        setUserVoiceVolume(volume);
      } else {
        setUserVoiceVolume(0);
      }
      animationFrame = requestAnimationFrame(updateVoiceVolume);
    };

    if (isOnCall && !isMuted && didAiStartSpeaking) {
      setupAudio().then(() => {
        updateVoiceVolume();
      });
    } else {
      cancelAnimationFrame(animationFrame);
      setUserVoiceVolume(0);
    }

    return () => {
      cancelAnimationFrame(animationFrame);
      if (audioContextRef.current) {
        if (audioContextRef.current.state !== 'closed') {
          audioContextRef.current.close();
        }
      }
    };
  }, [isOnCall, isMuted, didAiStartSpeaking]);

  // Function to toggle call
  const toggleCall = () => {
    setIsOnCall((prev) => !prev);

    if (isOnCall) {
      vapi.setMuted(false);
      setIsMuted(false)
      vapi.stop();

      setDidAiStartSpeaking(false);
      setTimer(0);
    } else {
      vapi.start(assistantId);
    }
  };

  // Effect for AI voice volume
  useEffect(() => {
    if (!isOnCall) {
      return;
    }

    const volumeLevelListener = (volume: number) => {
      setAiVoiceVolume(volume);
      if (volume > 0) {
        setDidAiStartSpeaking(true);
      }
    };

    vapi.on("volume-level", volumeLevelListener);

    return () => {
      setAiVoiceVolume(0);
      setDidAiStartSpeaking(false);
      vapi.removeListener('volume-level', volumeLevelListener);
    };
  }, [isOnCall, vapi]);

  // Function to toggle mute
  const toggleMute = () => {
    if (!isOnCall || isWaiting) {
      return
    }

    if (isMuted) { 
      vapi.setMuted(false);
    } else {
      vapi.setMuted(true);
    }

    setIsMuted((prev) => !prev)
  };

  // Function to change volume
  const changeVolume = () => setVolumeLevel((prev) => (prev + 1) % 4);

  // Render component
  return (
    <div style={{
      width: '300px',
      height: '400px',
      background: 'linear-gradient(135deg, #3f3f4f, #4a4a5e)',
      borderRadius: '20px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'space-around',
      padding: '20px',
      boxShadow: '0 10px 20px rgba(0,0,0,0.2)',
      userSelect: 'none',
      overflow: 'hidden',
      position: 'relative',
      boxSizing: 'border-box',
    }}>
      <style>
      {`@keyframes rotate-background {
          0%{background-position:10% 0%}
          50%{background-position:91% 100%}
          100%{background-position:10% 0%}
        }`}
      </style>
      {/* Call button with double ring */}
      <div
        style={{
          width: '120px',
          height: '120px',
          borderRadius: '50%',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          position: 'relative',
        }}>
        <div
          onClick={toggleCall}
          style={{
            position: 'absolute',
            width: '120px',
            height: '120px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #7fffd4, #4169e1)',
            backgroundSize: '130% 130%',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            cursor: 'pointer',
            boxShadow: '0px 3px 15px rgba(0,0,0,0.05)',
            animation: 'rotate-background 5s linear infinite',
            zIndex: 3,
            transition: 'filter 0.3s ease',
          }}
          onMouseDown={(event) => {
            // Apply a darker filter when clicked
            event.currentTarget.style.filter = 'brightness(0.8)';
          }}
          onMouseUp={(event) => {
            // Remove the darker filter when released
            event.currentTarget.style.filter = '';
          }}
          onMouseEnter={(event) => {
            // Apply a slightly dark filter on hover
            event.currentTarget.style.filter = 'brightness(0.9)';
          }}
          onMouseLeave={(event) => {
            // Remove the hover effect
            event.currentTarget.style.filter = '';
          }}
        >
          {isOnCall && didAiStartSpeaking
            ? PhoneCallIcon
            : isWaiting
            ? <Spinner />
            : PhoneIcon
          }
        </div>
        {/* AI ring (blue) */}
        <div style={{
          position: 'absolute',
          width: `${120 + (aiVoiceVolume * 50)}px`,
          height: `${120 + (aiVoiceVolume * 50)}px`,
          borderRadius: '50%',
          border: '2px solid black',
          background: 'black',
          opacity: isOnCall && didAiStartSpeaking ? 0.1 : 0,
          transition: 'all 0.1s',
        }}></div>
        {/* Person ring (green) */}
        <div style={{
          position: 'absolute',
          width: `${120 + (userVoiceVolume * 400)}px`,
          height: `${120 + (userVoiceVolume * 400)}px`,
          borderRadius: '50%',
          border: '2px solid black',
          background: 'black',
          opacity: isOnCall && didAiStartSpeaking ? 0.1 : 0,
          // transition: 'all 0.01s',
        }}></div>
      </div>
      {/* Timer display */}
      <div style={{ color: 'white', fontSize: '24px', fontFamily: 'sans-serif' }}>{formatTime(timer)}</div>
      {/* Control buttons */}
      <div style={{
        display: 'flex',
        gap: '10px',
        padding: '10px',
        borderRadius: '9999px',
        background: 'rgba(255,255,255,0.05)',
      }}>
        {/* Mute button */}
        <div
          onClick={toggleMute}
          style={{
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.1)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            cursor: 'pointer',
          }}
        >
          {isMuted ? MuteIconOn : MuteIconOff}
        </div>
        {/* Volume button */}
        <div
          onClick={changeVolume}
          style={{
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.1)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            cursor: 'pointer',
          }}
        >
          {VolumeIcon(volumeLevel)}
        </div>
      </div>
    </div>
  );
};

export default Widget;
