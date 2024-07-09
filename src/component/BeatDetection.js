import React, { useState, useRef, useEffect, useCallback } from 'react';
import axios from 'axios';
import VideoGenerator from './VideoGenerator';
import Timeline from './Timeline';
import AudioTrimmer from './AudioTrimmer';

const BeatDetection = ({ onXmlGenerated }) => {
  const [duration, setDuration] = useState(0);
  const [audioUrl, setAudioUrl] = useState(null);
  const [trimmedAudioUrl, setTrimmedAudioUrl] = useState(null);
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [isYoutube, setIsYoutube] = useState(true);
  const [showVideo, setShowVideo] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [tempoBeats, setTempoBeats] = useState({
    normal: [],
    fast: [],
    slow: []
  });
  const [tempoXmls, setTempoXmls] = useState({
    normal: '',
    fast: '',
    slow: ''
  });
  const [selectedTempo, setSelectedTempo] = useState(null);
  const [showTrimmer, setShowTrimmer] = useState(false);

  const audioContextRef = useRef(null);
  const audioBufferRef = useRef(null);
  const videoRef = useRef(null);

  useEffect(() => {
    audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  const resetState = useCallback(() => {
    setDuration(0);
    setTrimmedAudioUrl(null);
    setShowVideo(false);
    setCurrentTime(0);
    setTempoBeats({ normal: [], fast: [], slow: [] });
    setTempoXmls({ normal: '', fast: '', slow: '' });
    setSelectedTempo(null);
    setShowTrimmer(false);
    audioBufferRef.current = null;
  }, []);

  const loadAudio = useCallback(async (url) => {
    try {
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      audioBufferRef.current = await audioContextRef.current.decodeAudioData(arrayBuffer);
    } catch (error) {
      console.error('Error loading audio:', error);
    }
  }, []);

  const detectBeats = useCallback((audioBuffer, duration, sensitivity, minTimeBetweenBeats) => {
    const rawData = audioBuffer.getChannelData(0);
    const sampleRate = audioBuffer.sampleRate;
    const bufferSize = 1024;
    const minTimeSamples = minTimeBetweenBeats * sampleRate;
    const maxTimeSamples = 3 * sampleRate; // 3 seconds maximum between cuts

    const maxSamples = duration * sampleRate;
    let lastBeatTime = -Infinity;
    const beats = [];

    for (let i = 0; i < rawData.length && i < maxSamples; i += bufferSize) {
      let sum = 0;
      for (let j = 0; i + j < rawData.length && j < bufferSize; j++) {
        sum += Math.abs(rawData[i + j]);
      }

      const average = sum / bufferSize;

      if (average > sensitivity && i - lastBeatTime > minTimeSamples) {
        const currentTime = i / sampleRate;
        beats.push(currentTime);
        lastBeatTime = i;
      } else if (i - lastBeatTime > maxTimeSamples) {
        // Force a cut if more than 3 seconds have passed
        const currentTime = i / sampleRate;
        beats.push(currentTime);
        lastBeatTime = i;
      }
    }

    return beats;
  }, []);

  const generateXml = useCallback((beats) => {
    let xmlString = '<?xml version="1.0" encoding="UTF-8"?>\n<cuts>\n';
    let color = 'blue';

    beats.forEach((beat, index) => {
      xmlString += `  <cut id="${index + 1}" time="${beat.toFixed(2)}" color="${color}" />\n`;
      color = color === 'blue' ? 'red' : 'blue';
    });

    xmlString += '</cuts>';
    return xmlString;
  }, []);

  const trimAudioBuffer = useCallback((audioBuffer, duration, startTime = 0) => {
    const sampleRate = audioBuffer.sampleRate;
    const startSample = Math.floor(startTime * sampleRate);
    const endSample = Math.floor((startTime + duration) * sampleRate);

    const trimmedBuffer = audioContextRef.current.createBuffer(
      audioBuffer.numberOfChannels,
      endSample - startSample,
      sampleRate
    );

    for (let i = 0; i < audioBuffer.numberOfChannels; i++) {
      const channelData = audioBuffer.getChannelData(i).subarray(startSample, endSample);
      trimmedBuffer.copyToChannel(channelData, i);
    }

    return trimmedBuffer;
  }, []);

  const audioBufferToWav = useCallback((buffer) => {
    const numOfChan = buffer.numberOfChannels,
      length = buffer.length * numOfChan * 2 + 44,
      bufferArray = new ArrayBuffer(length),
      view = new DataView(bufferArray),
      channels = [],
      sampleRate = buffer.sampleRate;

    let offset = 0,
      pos = 0;

    const setUint16 = (data) => {
      view.setUint16(pos, data, true);
      pos += 2;
    };

    const setUint32 = (data) => {
      view.setUint32(pos, data, true);
      pos += 4;
    };

    setUint32(0x46464952); // "RIFF"
    setUint32(length - 8); // file length - 8
    setUint32(0x45564157); // "WAVE"

    setUint32(0x20746d66); // "fmt " chunk
    setUint32(16); // length = 16
    setUint16(1); // PCM (uncompressed)
    setUint16(numOfChan);
    setUint32(sampleRate);
    setUint32(sampleRate * 2 * numOfChan); // avg. bytes/sec
    setUint16(numOfChan * 2); // block-align
    setUint16(16); // 16-bit (hardcoded in this demo)

    setUint32(0x61746164); // "data" - chunk
    setUint32(length - pos - 4); // chunk length

    for (let i = 0; i < buffer.numberOfChannels; i++) {
      channels.push(buffer.getChannelData(i));
    }

    while (pos < length) {
      for (let i = 0; i < numOfChan; i++) {
        let sample = Math.max(-1, Math.min(1, channels[i][offset])); // clamp
        sample = (0.5 + sample * 32767) | 0; // scale to 16-bit signed int
        view.setInt16(pos, sample, true); // write 16-bit sample
        pos += 2;
      }
      offset++; // next source sample
    }

    return bufferArray;
  }, []);

  const handleYoutubeUrlChange = useCallback((event) => {
    setYoutubeUrl(event.target.value);
    resetState();
  }, [resetState]);

  const handleFetchYoutubeAudio = useCallback(async () => {
    setLoading(true);
    resetState();
    try {
      const response = await axios.get('https://youtub-server.onrender.com/stream', {
        params: { url: youtubeUrl },
        responseType: 'blob',
      });

      const audioBlob = new Blob([response.data], { type: 'audio/mpeg' });
      const audioUrl = URL.createObjectURL(audioBlob);
      setAudioUrl(audioUrl);
    } catch (error) {
      console.error('Failed to fetch audio:', error);
    } finally {
      setLoading(false);
    }
  }, [youtubeUrl, resetState]);

  const handleFileChange = useCallback((event) => {
    resetState();
    const file = event.target.files[0];
    const url = URL.createObjectURL(file);
    setAudioUrl(url);
    setIsYoutube(false);
  }, [resetState]);

  const processAudio = useCallback(async (selectedDuration, startTime = 0) => {
    if (!audioBufferRef.current) {
      await loadAudio(audioUrl);
    }

    const trimmedBuffer = trimAudioBuffer(audioBufferRef.current, selectedDuration, startTime);
    audioBufferRef.current = trimmedBuffer;

    const normalBeats = detectBeats(trimmedBuffer, selectedDuration, 0.5, 1.5);
    const fastBeats = detectBeats(trimmedBuffer, selectedDuration, 0.4, 1);
    const slowBeats = detectBeats(trimmedBuffer, selectedDuration, 0.55, 2);

    setTempoBeats({
      normal: normalBeats,
      fast: fastBeats,
      slow: slowBeats
    });

    const normalXml = generateXml(normalBeats);
    const fastXml = generateXml(fastBeats);
    const slowXml = generateXml(slowBeats);

    setTempoXmls({
      normal: normalXml,
      fast: fastXml,
      slow: slowXml
    });

    onXmlGenerated(normalXml, audioUrl);

    const wavBuffer = audioBufferToWav(trimmedBuffer);
    const blob = new Blob([wavBuffer], { type: 'audio/wav' });
    const trimmedUrl = URL.createObjectURL(blob);
    setTrimmedAudioUrl(trimmedUrl);
  }, [audioUrl, detectBeats, generateXml, loadAudio, onXmlGenerated, trimAudioBuffer, audioBufferToWav]);

  const handleDurationChange = useCallback(async (event) => {
    const selectedDuration = Number(event.target.value);
    setDuration(selectedDuration);
    await processAudio(selectedDuration);
  }, [processAudio]);

  const handleSelectBeat = useCallback((time, tempo) => {
    setShowVideo(true);
    setSelectedTempo(tempo);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
    }
  }, []);

  const handleTimeUpdate = useCallback((time) => {
    setCurrentTime(time);
  }, []);

  const handleTrimmed = useCallback(async (start, end) => {
    const trimmedDuration = end - start;
    setDuration(trimmedDuration);
    await processAudio(trimmedDuration, start);
  }, [processAudio]);

  return (
    <div>
      <div>
        <input
          type="radio"
          name="audioSource"
          value="youtube"
          checked={isYoutube}
          onChange={() => {
            setIsYoutube(true);
            resetState();
          }}
        />{' '}
        YouTube URL
        <input
          type="radio"
          name="audioSource"
          value="local"
          checked={!isYoutube}
          onChange={() => {
            setIsYoutube(false);
            resetState();
          }}
        />{' '}
        Local File
      </div>
      {isYoutube ? (
        <div>
          <input
            type="text"
            placeholder="Enter YouTube video URL"
            value={youtubeUrl}
            onChange={handleYoutubeUrlChange}
          />
          <button onClick={handleFetchYoutubeAudio}>Fetch Audio</button>
        </div>
      ) : (
        <input type="file" accept="audio/*" onChange={handleFileChange} />
      )}
      {loading && <p>Wait...</p>}
      {audioUrl && (
        <div>
          <select onChange={handleDurationChange} value={duration}>
            <option value={0}>Select duration</option>
            <option value={30}>30 seconds</option>
            <option value={45}>45 seconds</option>
            <option value={60}>1 minute</option>
          </select>
          <label>
            <input
              type="checkbox"
              checked={showTrimmer}
              onChange={(e) => setShowTrimmer(e.target.checked)}
            />
            Trim audio
          </label>
        </div>
      )}
      {showTrimmer && audioUrl && (
        <AudioTrimmer
          audioUrl={audioUrl}
          onTrimmed={handleTrimmed}
          showDuration={true}
        />
      )}
      {tempoBeats.normal.length > 0 && (
        <>
          <h3>Normal Tempo</h3>
          <Timeline 
            beats={tempoBeats.normal} 
            onSelectBeat={(time) => handleSelectBeat(time, 'normal')} 
            currentTime={currentTime} 
            color="green"
            tempoName="normal"
            isSelected={selectedTempo === 'normal'}
          />
          <h3>Fast Tempo</h3>
          <Timeline 
            beats={tempoBeats.fast} 
            onSelectBeat={(time) => handleSelectBeat(time, 'fast')} 
            currentTime={currentTime} 
            color="red"
            tempoName="fast"
            isSelected={selectedTempo === 'fast'}
          />
          <h3>Slow Tempo</h3>
          <Timeline 
            beats={tempoBeats.slow} 
            onSelectBeat={(time) => handleSelectBeat(time, 'slow')} 
            currentTime={currentTime} 
            color="blue"
            tempoName="slow"
            isSelected={selectedTempo === 'slow'}
          />
        </>
      )}
      {showVideo && selectedTempo && trimmedAudioUrl && (
        <VideoGenerator 
          xmlString={tempoXmls[selectedTempo]} 
          audioUrl={trimmedAudioUrl} 
          duration={duration} 
          onTimeUpdate={handleTimeUpdate}
          ref={videoRef}
        />
      )}
    </div>
  );
};

export default React.memo(BeatDetection);