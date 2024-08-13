import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import Vapi from '@vapi-ai/web'
import { Spinner } from './Spinner'
import { MuteIconOff, MuteIconOn, PhoneCallIcon, PhoneIcon, VolumeIcon } from './Icons'
import { VolumeVisualizer } from './VolumeVisualizer'
import { useTypewriterEffect } from './TypeWriter'

interface WidgetProps {
  apiKey: string
  assistantId: string
}

const Widget: React.FC<WidgetProps> = ({ apiKey, assistantId }) => {
  // State declarations
  const [isMuted, setIsMuted] = useState(false)
  const [volumeLevel, setVolumeLevel] = useState(2)
  const [isOnCall, setIsOnCall] = useState(false)
  const [timer, setTimer] = useState(0)
  const [userVoiceVolume, setUserVoiceVolume] = useState(0)
  const [aiVoiceVolume, setAiVoiceVolume] = useState(0)
  const [didAiStartSpeaking, setDidAiStartSpeaking] = useState(false)

  const [initialized, setInitialized] = useState(true)

  const [currentMessage, setCurrentMessage] = useState('')
  const typedText = useTypewriterEffect(currentMessage, 10)

  const isWaiting = isOnCall && !didAiStartSpeaking

  // Refs for audio context
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const dataArrayRef = useRef<Uint8Array | null>(null)

  // Initialize Vapi
  const vapi = useMemo(() => new Vapi(apiKey), [apiKey])

  // Helper function to format time
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  // Effect for timer
  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isOnCall && didAiStartSpeaking) {
      interval = setInterval(() => {
        setTimer(prevTimer => prevTimer + 1)
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [isOnCall, didAiStartSpeaking])

  // Function to set up audio
  const setupAudio = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
      const source = audioContextRef.current.createMediaStreamSource(stream)
      analyserRef.current = audioContextRef.current.createAnalyser()
      analyserRef.current.fftSize = 256
      source.connect(analyserRef.current)

      const bufferLength = analyserRef.current.frequencyBinCount
      dataArrayRef.current = new Uint8Array(bufferLength)
    } catch (error) {
      console.error('Error accessing microphone:', error)
    }
  }

  // Function to get voice volume
  const getVoiceVolume = () => {
    if (analyserRef.current && dataArrayRef.current) {
      analyserRef.current.getByteFrequencyData(dataArrayRef.current)
      const average =
        dataArrayRef.current.reduce((acc, val) => acc + val, 0) / dataArrayRef.current.length
      return average / 255 // Normalize to 0-1 range
    }
    return 0
  }

  // Effect for voice volume
  useEffect(() => {
    let animationFrame: number = 0

    const updateVoiceVolume = () => {
      if (isOnCall && !isMuted && didAiStartSpeaking) {
        const volume = getVoiceVolume()
        setUserVoiceVolume(volume)
      } else {
        setUserVoiceVolume(0)
      }
      animationFrame = requestAnimationFrame(updateVoiceVolume)
    }

    if (isOnCall && !isMuted && didAiStartSpeaking) {
      setupAudio().then(() => {
        updateVoiceVolume()
      })
    } else {
      cancelAnimationFrame(animationFrame)
      setUserVoiceVolume(0)
    }

    return () => {
      cancelAnimationFrame(animationFrame)
      if (audioContextRef.current) {
        if (audioContextRef.current.state !== 'closed') {
          audioContextRef.current.close()
        }
      }
    }
  }, [isOnCall, isMuted, didAiStartSpeaking])

  // Function to toggle call
  const toggleCall = () => {
    setIsOnCall(prev => !prev)

    if (isOnCall) {
      vapi.setMuted(false)
      setIsMuted(false)
      vapi.stop()

      setAiVoiceVolume(0)
      setDidAiStartSpeaking(false)
      setCurrentMessage('')
      setTimer(0)
    } else {
      vapi.start(assistantId)
    }
  }

  // Effect for AI voice volume
  useEffect(() => {
    if (!isOnCall) {
      return
    }

    const volumeLevelListener = (volume: number) => {
      setAiVoiceVolume(volume)
      if (volume > 0) {
        setDidAiStartSpeaking(true)
      }
    }

    const messageListener = (message: any) => {
      console.log('message', message)
      if (
        message.type === 'transcript' &&
        message.role === 'assistant' &&
        message.transcriptType === 'final'
      ) {
        setCurrentMessage(message.transcript)
      }
    }

    vapi.on('volume-level', volumeLevelListener)
    vapi.on('message', messageListener)

    return () => {
      setAiVoiceVolume(0)
      setDidAiStartSpeaking(false)
      setCurrentMessage('')
      vapi.removeListener('volume-level', volumeLevelListener)
      vapi.removeListener('message', messageListener)
    }
  }, [isOnCall, vapi])

  // Function to toggle mute
  const toggleMute = () => {
    if (!isOnCall || isWaiting) {
      return
    }

    if (isMuted) {
      vapi.setMuted(false)
    } else {
      vapi.setMuted(true)
    }

    setIsMuted(prev => !prev)
  }

  // Function to change volume
  const changeVolume = () => setVolumeLevel(prev => (prev + 1) % 4)

  // Render component
  return (
    <div
      style={{
        width: '1024px',
        height: '640px',
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

      <div
        style={{
          position: 'absolute',
          top: 40,
          color: 'white',
          fontSize: '24px',
          fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
          textAlign: 'center',
          width: '100%',
          boxSizing: 'border-box',
          paddingLeft: 60,
          paddingRight: 60,
          opacity: 0.5,
        }}>
        {typedText}
      </div>

      <div
        style={{
          marginBottom: 40,
        }}>
        <VolumeVisualizer volume={aiVoiceVolume} maxAdditionalHeight={150} />
      </div>

      {/* Bottom control */}
      <div
        style={{
          position: 'absolute',
          bottom: 40,
          display: 'flex',
          alignItems: 'center',
          width: '100%',
          paddingLeft: '30px',
          paddingRight: '30px',
          boxSizing: 'border-box',
        }}>
        {/* Call button with double ring */}
        <div
          style={{
            width: 100,
            height: 100,
            borderRadius: '50%',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            position: 'relative',
            opacity: initialized ? 1 : 0.25,
          }}>
          <div
            onClick={toggleCall}
            style={{
              position: 'absolute',
              width: 100,
              height: 100,
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
            onMouseDown={event => {
              // Apply a darker filter when clicked
              event.currentTarget.style.filter = 'brightness(0.8)'
            }}
            onMouseUp={event => {
              // Remove the darker filter when released
              event.currentTarget.style.filter = ''
            }}
            onMouseEnter={event => {
              // Apply a slightly dark filter on hover
              event.currentTarget.style.filter = 'brightness(0.9)'
            }}
            onMouseLeave={event => {
              // Remove the hover effect
              event.currentTarget.style.filter = ''
            }}>
            {isOnCall && didAiStartSpeaking ? PhoneCallIcon : isWaiting ? <Spinner /> : PhoneIcon}
          </div>
          {/* Person ring */}
          <div
            style={{
              position: 'absolute',
              width: `${100 + userVoiceVolume * 400}px`,
              height: `${100 + userVoiceVolume * 400}px`,
              borderRadius: '50%',
              border: '2px solid black',
              background: 'black',
              opacity: isOnCall && didAiStartSpeaking ? 0.1 : 0,
              // transition: 'all 0.01s',
            }}
          />
        </div>
        {/* Timer display */}
        <div
          style={{
            fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
            color: 'white',
            flex: 1,
            fontSize: '24px',
            textAlign: 'center',
            paddingLeft: 45,
            opacity: 0.5,
          }}>
          {formatTime(timer)}
        </div>
        {/* Control buttons */}
        <div
          style={{
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
            }}>
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
            }}>
            {VolumeIcon(volumeLevel)}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Widget
