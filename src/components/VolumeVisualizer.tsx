import { useEffect, useState } from 'react'

interface VolumeVisualizerProps {
  volume: number // 0 to 1
  maxAdditionalHeight: number
}

const baseHeight = 64

export const VolumeVisualizer: React.FC<VolumeVisualizerProps> = ({
  volume,
  maxAdditionalHeight,
}) => {
  const [heights, setHeights] = useState<number[]>([0, 0, 0, 0])

  useEffect(() => {
    // Generate random heights based on the volume
    setHeights(prevHeights => {
      const newHeights = prevHeights.map(() => {
        return baseHeight + Math.random() * maxAdditionalHeight * volume
      })

      return newHeights
    })
  }, [volume, maxAdditionalHeight])

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '96px',
        gap: '8px',
      }}>
      {heights.map((height, index) => (
        <div
          key={index}
          style={{
            width: baseHeight,
            height: `${height}px`,
            backgroundColor: 'white',
            borderRadius: '9999px',
            transition: 'all 100ms ease-in-out',
          }}
        />
      ))}
    </div>
  )
}
