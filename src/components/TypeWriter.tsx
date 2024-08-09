import { useEffect, useRef, useState } from 'react'

export const useTypewriterEffect = (fullText: string, typingSpeed: number = 100) => {
  const [displayedText, setDisplayedText] = useState('')
  const currentTextRef = useRef('')

  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null
    let charIndex = 0

    const animateText = () => {
      setDisplayedText(prev => {
        if (!fullText.startsWith(prev)) {
          // If the new text doesn't start with the current text,
          // clear everything and start over
          charIndex = 0
          currentTextRef.current = ''
          return ''
        }

        if (prev === fullText) {
          if (intervalId) {
            clearInterval(intervalId)
          }
          return prev
        }

        charIndex++
        const newText = fullText.slice(0, charIndex)
        currentTextRef.current = newText
        return newText
      })
    }

    // Clear text immediately if it doesn't match the new fullText
    if (!fullText.startsWith(currentTextRef.current)) {
      setDisplayedText('')
      currentTextRef.current = ''
      charIndex = 0
    } else {
      charIndex = currentTextRef.current.length
    }

    intervalId = setInterval(animateText, typingSpeed)

    return () => {
      if (intervalId) {
        clearInterval(intervalId)
      }
    }
  }, [fullText, typingSpeed])

  return displayedText
}
