import React, { useState, useRef, useEffect } from 'react';

const AudioTrimmer = ({ audioUrl, onTrimmed, maxDuration = Infinity, showDuration = false }) => {
  const [duration, setDuration] = useState(0);
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef(null);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.addEventListener('loadedmetadata', () => {
        setDuration(audioRef.current.duration);
        setEndTime(audioRef.current.duration);
      });
      audioRef.current.addEventListener('timeupdate', () => {
        setCurrentTime(audioRef.current.currentTime);
      });
    }
  }, [audioUrl]);

  const handleTimeChange = (e) => {
    const newTime = Number(e.target.value);
    if (e.target.id === 'startTime') {
      setStartTime(Math.min(newTime, endTime - 1));
    } else {
      setEndTime(Math.max(newTime, startTime + 1));
    }
  };

  const handlePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.currentTime = startTime;
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  useEffect(() => {
    if (isPlaying && audioRef.current && audioRef.current.currentTime >= endTime) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  }, [currentTime, endTime, isPlaying]);

  const [currentDuration, setCurrentDuration] = useState(0);

  const handleTrim = () => {
    const duration = endTime - startTime;
    if (duration > maxDuration) {
      // Adjust endTime to not exceed maxDuration
      onTrimmed(startTime, startTime + maxDuration);
    } else {
      onTrimmed(startTime, endTime);
    }
  };

  const formatTime = (time) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const progressPercentage = ((currentTime - startTime) / (endTime - startTime)) * 100;

  useEffect(() => {
    setCurrentDuration(endTime - startTime);
  }, [startTime, endTime]);

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto' }}>
      <audio ref={audioRef} src={audioUrl} style={{ display: 'none' }} />
      <div style={{ position: 'relative', marginBottom: '20px', height: '40px' }}>
        <input
          id="startTime"
          type="range"
          min={0}
          max={duration}
          step={0.1}
          value={startTime}
          onChange={handleTimeChange}
          style={{
            position: 'absolute',
            top: 0,
            width: '100%',
            zIndex: 2,
          }}
        />
        <input
          id="endTime"
          type="range"
          min={0}
          max={duration}
          step={0.1}
          value={endTime}
          onChange={handleTimeChange}
          style={{
            position: 'absolute',
            bottom: 0,
            width: '100%',
            zIndex: 2,
          }}
        />
        <div style={{
          position: 'absolute',
          left: `${(startTime / duration) * 100}%`,
          right: `${100 - (endTime / duration) * 100}%`,
          top: '50%',
          height: '4px',
          transform: 'translateY(-50%)',
          backgroundColor: '#ddd',
        }}>
          <div style={{
            position: 'absolute',
            left: 0,
            width: `${progressPercentage}%`,
            height: '100%',
            backgroundColor: '#4CAF50',
          }}></div>
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>{formatTime(startTime)}</span>
        <button onClick={handlePlayPause} style={{ padding: '10px 20px' }}>
          {isPlaying ? 'Pause' : 'Play'}
        </button>
        <span>{formatTime(endTime)}</span>
      </div>
      <div style={{ marginTop: '20px', textAlign: 'center' }}>
        <button onClick={handleTrim} style={{ padding: '10px 20px' }}>Use Trimmed Audio</button>
      </div>
      {showDuration && <p>Current Duration: {currentDuration.toFixed(2)} seconds</p>}
    </div>
  );
};

export default AudioTrimmer;