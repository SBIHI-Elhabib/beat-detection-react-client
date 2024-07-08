import React, { useRef, useEffect, forwardRef, useImperativeHandle } from 'react';

const VideoGenerator = forwardRef(({ xmlString, audioUrl, duration, onTimeUpdate }, ref) => {
  const canvasRef = useRef(null);
  const audioRef = useRef(null);

  useImperativeHandle(ref, () => ({
    get currentTime() {
      return audioRef.current ? audioRef.current.currentTime : 0;
    },
    set currentTime(time) {
      if (audioRef.current) {
        audioRef.current.currentTime = time;
      }
    }
  }));

  useEffect(() => {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlString, 'application/xml');
    const cuts = xmlDoc.getElementsByTagName('cut');

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    const drawFrame = (currentTime) => {
      const beatIndex = Array.from(cuts).findIndex((cut) => parseFloat(cut.getAttribute('time')) > currentTime);
      const color = beatIndex % 2 === 0 ? 'blue' : 'red';
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    };

    const animate = () => {
      const audio = audioRef.current;
      drawFrame(audio.currentTime);
      onTimeUpdate(audio.currentTime);
      if (!audio.paused && !audio.ended && audio.currentTime < duration) {
        requestAnimationFrame(animate);
      } else if (audio.currentTime >= duration) {
        audio.pause();
        audio.currentTime = 0;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    };

    const handlePlay = () => {
      animate();
    };

    const handleEnded = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    };

    audioRef.current.addEventListener('play', handlePlay);
    audioRef.current.addEventListener('ended', handleEnded);

    return () => {
      audioRef.current.removeEventListener('play', handlePlay);
      audioRef.current.removeEventListener('ended', handleEnded);
    };
  }, [xmlString, duration, onTimeUpdate]);

  return (
    <div>
      <audio ref={audioRef} src={audioUrl} controls />
      <canvas ref={canvasRef} width="640" height="360" style={{ border: '1px solid black' }} />
    </div>
  );
});

export default VideoGenerator;