import React from 'react'
import App from './App'
import { createRoot } from 'react-dom/client'

export interface WidgetParams {
  elementId: string
  mode: 'vapi' | 'twilio'
  apiKey: string
  assistantId: string
  phoneNumber: string
}

const renderWidget = (widgetParams: WidgetParams) => {
  const rootElement = document.getElementById(widgetParams.elementId)
  if (rootElement) {
    const root = createRoot(rootElement)
    root.render(<App {...widgetParams} />)
  }
}

// Expose the renderWidget function to the global window object
;(window as any).renderWidget = renderWidget
