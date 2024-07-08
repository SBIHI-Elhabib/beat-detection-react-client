import React, { useRef, useEffect, useCallback } from 'react';

    const Timeline = ({ beats, onSelectBeat, currentTime, color = 'blue', tempoName, isSelected }) => {
        const timelineRef = useRef(null);
      
        const handleClick = useCallback((e) => {
          if (!timelineRef.current) return;
      
          const rect = timelineRef.current.getBoundingClientRect();
          const clickPosition = e.clientX - rect.left;
          const clickTime = (clickPosition / rect.width) * beats[beats.length - 1];
      
          onSelectBeat(clickTime);
        }, [beats, onSelectBeat]);
      
        useEffect(() => {
          if (!timelineRef.current || !isSelected) return;
      
          const rect = timelineRef.current.getBoundingClientRect();
          const pos = (currentTime / beats[beats.length - 1]) * rect.width;
      
          const line = document.getElementById(`timelineLine-${tempoName}`);
          if (line) {
            line.style.left = `${pos}px`;
          }
        }, [currentTime, beats, tempoName, isSelected]);
      
        return (
          <div>
            <div
              ref={timelineRef}
              style={{
                position: 'relative',
                height: '50px',
                width: '80%',
                cursor: 'pointer',
                borderBottom: '1px solid #ccc',
              }}
              onClick={handleClick}
            >
              {beats.map((beat, index) => {
                const nextBeatTime = index < beats.length - 1 ? beats[index + 1] : beats[index] + 1;
                const widthPercent = ((nextBeatTime - beat) / beats[beats.length - 1]) * 100;
      
                return (
                  <div
                    key={index}
                    style={{
                      position: 'absolute',
                      left: `${(beat / beats[beats.length - 1]) * 100}%`,
                      width: `${widthPercent}%`,
                      height: '25px',
                      backgroundColor: color,
                      opacity: index % 2 === 0 ? 0.7 : 0.5,
                      borderRadius: '4px',
                    }}
                  />
                );
              })}
              {isSelected && (
                <div
                  id={`timelineLine-${tempoName}`}
                  style={{
                    position: 'absolute',
                    top: '0',
                    width: '2px',
                    height: '50px',
                    backgroundColor: 'black',
                    zIndex: '10',
                  }}
                />
              )}
            </div>
            
          </div>
        );
      };
      
      export default React.memo(Timeline);