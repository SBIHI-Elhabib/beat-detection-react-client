import React from 'react';
import BeatDetection from './component/BeatDetection';

function App() {
    const handleXmlGenerated = (xmlString, audioUrl) => {
        console.log('XML Generated:', xmlString);
        console.log('Audio URL:', audioUrl);
    };

    return (
        <div className="App">
            <h1>Beat Detection</h1>
            <BeatDetection onXmlGenerated={handleXmlGenerated} />
        </div>
    );
}

export default App;
