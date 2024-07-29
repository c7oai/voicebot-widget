import React from 'react';
import App from './App';
import { createRoot } from 'react-dom/client';

interface WidgetParams {
  elementId: string;
  publicApiKey: string;
  assistantId: string;
}

const renderWidget = ({ elementId, publicApiKey, assistantId }: WidgetParams) => {
  const rootElement = document.getElementById(elementId);
  if (rootElement) {
    const root = createRoot(rootElement);
    root.render(<App publicApiKey={publicApiKey} assistantId={assistantId} />);
  }
};

// Expose the renderWidget function to the global window object
(window as any).renderWidget = renderWidget;
