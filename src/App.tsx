import React from 'react';
// import Widget from './components/Widget';
import WidgetTwilio from './components/WidgetTwilio';

interface AppProps {
  publicApiKey: string;
  assistantId: string;
}

const App: React.FC<AppProps> = ({ publicApiKey, assistantId }) => (
  <div className="App">
    {/* <Widget publicApiKey={publicApiKey} assistantId={assistantId} /> */}
    <WidgetTwilio />
  </div>
);

export default App;
