import React from 'react'
// import Widget from './components/Widget';
import WidgetTwilio from './components/WidgetTwilio'
import { WidgetParams } from '.'
import Widget from './components/Widget'

const App: React.FC<WidgetParams> = widgetParams => {
  if (widgetParams.mode === 'vapi') {
    return (
      <div className="App">
        <Widget {...widgetParams} />
      </div>
    )
  }

  if (widgetParams.mode === 'twilio') {
    return (
      <div className="App">
        <WidgetTwilio {...widgetParams} />
      </div>
    )
  }

  return <></>
}

export default App
