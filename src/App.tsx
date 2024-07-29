import React from 'react';
import Widget from './components/Widget';

interface AppProps {
  publicApiKey: string;
  assistantId: string;
}

const App: React.FC<AppProps> = ({ publicApiKey, assistantId }) => (
  <div className="App">
    <Widget publicApiKey={publicApiKey} assistantId={assistantId} />
  </div>
);

export default App;
