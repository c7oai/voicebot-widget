import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { Spinner } from './Spinner'
import { MuteIconOff, MuteIconOn, PhoneCallIcon, PhoneIcon, VolumeIcon } from './Icons'
import axios from 'axios'
import { Call, Device } from '@twilio/voice-sdk'
import { VolumeVisualizer } from './VolumeVisualizer'

interface WidgetProps {
  phoneNumber: string
}

const Widget: React.FC<WidgetProps> = ({ phoneNumber }) => {
  // State declarations
  const [isMuted, setIsMuted] = useState(false)
  const [volumeLevel, setVolumeLevel] = useState(2)
  const [isOnCall, setIsOnCall] = useState(false)
  const [timer, setTimer] = useState(0)
  const [userVoiceVolume, setUserVoiceVolume] = useState(0)
  const [aiVoiceVolume, setAiVoiceVolume] = useState(0)
  const [didAiStartSpeaking, setDidAiStartSpeaking] = useState(false)
  const [token, setToken] = useState<string | null>(null)
  const [device, setDevice] = useState<Device | null>(null)

  const [initialized, setInitialized] = useState(false)

  const isWaiting = isOnCall && !didAiStartSpeaking

  // Initialize Vapi
  const getToken = useCallback(async () => {
    try {
      const response = await axios.get('https://twiliotoken-jbjduy4apa-uc.a.run.app/token')
      setToken(response.data.token)
      return response.data.token
    } catch (error) {
      console.error('Error getting token:', error)
    }
  }, [])

  const initializeDevice = useCallback((tokenParam: string) => {
    const newDevice = new Device(tokenParam, {
      logLevel: 1,
      codecPreferences: [Call.Codec.Opus, Call.Codec.PCMU],
    })
    setDevice(newDevice)
    newDevice.register()

    const registered = () => {
      console.log('Twilio.Device Ready to make and receive calls!')
    }
    newDevice.on('registered', registered)

    const onError = (err: any) => {
      console.log('Twilio.Device Error: ' + err.message)
    }
    newDevice.on('error', onError)

    const deviceChange = () => {
      console.log('Audio devices changed.')
    }
    newDevice.audio?.on('deviceChange', deviceChange)

    setInitialized(true)
  }, [])

  useEffect(() => {
    ;(async () => {
      const newToken = await getToken()
      initializeDevice(newToken)
    })()
  }, [getToken, initializeDevice])

  useEffect(() => {
    return () => {
      device?.audio?.removeAllListeners()
      device?.removeAllListeners()
    }
  }, [device])

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

  // Function to toggle call
  const [call, setCall] = useState<Call | undefined>()
  const toggleCall = async () => {
    if (!initialized) {
      return
    }

    setIsOnCall(prev => !prev)

    if (isOnCall) {
      setIsMuted(false)

      // STOP CALL
      device?.disconnectAll()
      call?.removeAllListeners()

      setDidAiStartSpeaking(false)
      setTimer(0)
    } else {
      // START CALL
      const params = {
        // get the phone number to call from the DOM
        To: phoneNumber,
      }

      if (device) {
        console.log(`Attempting to call ${params.To} ...`)

        // Twilio.Device.connect() returns a Call object
        const newCall = await device.connect({ params })

        // add listeners to the Call
        // "accepted" means the call has finished connecting and the state is now "open"
        newCall.on('accept', () => {
          setDidAiStartSpeaking(true)
        })
        newCall.on('disconnect', () => {})
        newCall.on('cancel', () => {})

        newCall.on('volume', function (inputVolume, outputVolume) {
          setUserVoiceVolume(inputVolume)
          setAiVoiceVolume(outputVolume)
        })

        setCall(newCall)
      } else {
        console.log('Unable to make call. No Device')
      }
    }
  }

  // Function to toggle mute
  const toggleMute = () => {
    if (!isOnCall || isWaiting) {
      return
    }

    if (isMuted) {
      // vapi.setMuted(false);
    } else {
      // vapi.setMuted(true);
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
          marginBottom: 40,
        }}>
        <VolumeVisualizer volume={aiVoiceVolume} maxAdditionalHeight={400} />
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
              transition: 'all 0.01s',
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
