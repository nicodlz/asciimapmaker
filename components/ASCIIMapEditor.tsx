'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';

const ASCIIMapEditor: React.FC = () => {
  const [width, setWidth] = useState<number>(50);
  const [height, setHeight] = useState<number>(50);
  const [selectedChar, setSelectedChar] = useState<string>('A');
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [zoom, setZoom] = useState<number>(1);
  const [brushSize, setBrushSize] = useState<number>(1);
  
  // Store the map as a 2D array
  const [mapData, setMapData] = useState<string[][]>([]);
  
  // Refs for viewport and virtualization
  const gridContainerRef = useRef<HTMLDivElement>(null);
  const isImportingRef = useRef<boolean>(false);
  const [viewportInfo, setViewportInfo] = useState({
    visibleStartRow: 0,
    visibleEndRow: 50,
    visibleStartCol: 0,
    visibleEndCol: 50,
  });

  // Initialize the map on first load only
  useEffect(() => {
    const initialMap: string[][] = [];
    for (let y = 0; y < height; y++) {
      const row: string[] = [];
      for (let x = 0; x < width; x++) {
        row.push(' ');
      }
      initialMap.push(row);
    }
    setMapData(initialMap);
  }, []);

  // Handle dimension changes (only for manual size changes, not imports)
  useEffect(() => {
    if (!isImportingRef.current) {
      resizeMap(width, height);
    } else {
      isImportingRef.current = false;
    }
  }, [width, height]);

  // Setup virtual scrolling and viewport calculation
  useEffect(() => {
    if (!gridContainerRef.current) return;
    
    const calculateVisibleCells = () => {
      const container = gridContainerRef.current;
      if (!container) return;

      const scrollTop = container.scrollTop;
      const scrollLeft = container.scrollLeft;
      const containerWidth = container.clientWidth;
      const containerHeight = container.clientHeight;
      
      const cellSize = 30 * zoom;
      
      const visibleStartRow = Math.max(0, Math.floor(scrollTop / cellSize) - 2);
      const visibleEndRow = Math.min(height - 1, Math.ceil((scrollTop + containerHeight) / cellSize) + 2);
      
      const visibleStartCol = Math.max(0, Math.floor(scrollLeft / cellSize) - 2);
      const visibleEndCol = Math.min(width - 1, Math.ceil((scrollLeft + containerWidth) / cellSize) + 2);
      
      setViewportInfo({
        visibleStartRow,
        visibleEndRow,
        visibleStartCol,
        visibleEndCol,
      });
    };
    
    calculateVisibleCells();
    
    const handleScroll = () => {
      requestAnimationFrame(calculateVisibleCells);
    };
    
    const container = gridContainerRef.current;
    container.addEventListener('scroll', handleScroll);
    
    return () => {
      container.removeEventListener('scroll', handleScroll);
    };
  }, [zoom, width, height]);

  // Resize the map while preserving existing content
  const resizeMap = useCallback((newWidth: number, newHeight: number) => {
    setMapData(prevMap => {
      const newMap: string[][] = [];
      
      // Copy existing content and extend with spaces as needed
      for (let y = 0; y < newHeight; y++) {
        const row: string[] = [];
        for (let x = 0; x < newWidth; x++) {
          // If within bounds of existing map, copy the character, otherwise use space
          if (y < prevMap.length && x < prevMap[y].length) {
            row.push(prevMap[y][x]);
          } else {
            row.push(' ');
          }
        }
        newMap.push(row);
      }
      
      return newMap;
    });
  }, []);

  // Update a cell in the map
  const updateCell = useCallback((x: number, y: number) => {
    setMapData(prevMap => {
      const newMap = [...prevMap];
      
      // Calculate start and end positions for the brush
      const startX = Math.max(0, x - Math.floor(brushSize / 2));
      const startY = Math.max(0, y - Math.floor(brushSize / 2));
      const endX = Math.min(width - 1, x + Math.floor(brushSize / 2));
      const endY = Math.min(height - 1, y + Math.floor(brushSize / 2));
      
      // Update all cells within the brush area
      for (let brushY = startY; brushY <= endY; brushY++) {
        if (newMap[brushY]) {
          // Create a new row array to ensure referential integrity
          newMap[brushY] = [...newMap[brushY]];
          
          for (let brushX = startX; brushX <= endX; brushX++) {
            if (brushX >= 0 && brushX < width) {
              newMap[brushY][brushX] = selectedChar;
            }
          }
        }
      }
      
      return newMap;
    });
  }, [width, height, selectedChar, brushSize]);

  // Handle drawing with mouse
  const handleMouseDown = useCallback((x: number, y: number) => {
    updateCell(x, y);
    setIsDrawing(true);
  }, [updateCell]);

  const handleMouseEnter = useCallback((x: number, y: number) => {
    if (isDrawing) {
      updateCell(x, y);
    }
  }, [isDrawing, updateCell]);

  const handleMouseUp = useCallback(() => {
    setIsDrawing(false);
  }, []);

  // Export the map as text
  const exportMap = useCallback(() => {
    const result = mapData.map(row => row.join('')).join('\n');
    
    const blob = new Blob([result], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ascii_map.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [mapData]);

  // Import a map
  const importMap = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const lines = content.split('\n');
      
      const newHeight = lines.length;
      const newWidth = Math.max(...lines.map(line => line.length));
      
      // Set ref to indicate we're importing (to skip resize effect)
      isImportingRef.current = true;
      
      // Create a new map from the imported data
      const newMap: string[][] = [];
      for (let y = 0; y < newHeight; y++) {
        const line = lines[y] || '';
        const row: string[] = [];
        for (let x = 0; x < newWidth; x++) {
          row.push(x < line.length ? line[x] : ' ');
        }
        newMap.push(row);
      }
      
      // Do a batch update to minimize rerenders
      setMapData(newMap);
      setHeight(newHeight);
      setWidth(newWidth);
    };
    reader.readAsText(file);
    
    // Reset the input to allow reimporting the same file
    event.target.value = '';
  }, []);

  // Handle selected character change
  const handleCharChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value) {
      setSelectedChar(value.charAt(value.length - 1));
    }
  }, []);

  // Handle manual dimension changes
  const handleWidthChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newWidth = Math.max(1, parseInt(e.target.value) || 1);
    setWidth(newWidth);
  }, []);

  const handleHeightChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newHeight = Math.max(1, parseInt(e.target.value) || 1);
    setHeight(newHeight);
  }, []);

  // Zoom control
  const handleZoomChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setZoom(parseFloat(e.target.value));
  }, []);

  // Handle brush size changes
  const handleBrushSizeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setBrushSize(parseInt(e.target.value));
  }, []);

  // Memoized styles for better performance
  const gridContainerStyle = useMemo<React.CSSProperties>(() => ({
    border: '2px solid #999',
    borderRadius: '8px',
    padding: '4px',
    overflow: 'auto',
    height: 'calc(100% - 60px)',
    width: '99%',
    backgroundColor: '#f5f5f5',
    boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
    position: 'relative',
  }), []);

  const gridStyle = useMemo<React.CSSProperties>(() => {
    const cellSize = 30 * zoom;
    return {
      display: 'grid',
      gridTemplateColumns: `repeat(${width}, ${cellSize}px)`,
      gridAutoRows: `${cellSize}px`,
      gap: `${1 * zoom}px`,
      backgroundColor: '#ddd',
      padding: `${1 * zoom}px`,
      borderRadius: '4px',
      userSelect: 'none',
      width: `${width * (cellSize + 1 * zoom) + 2 * zoom}px`,
      height: `${height * (cellSize + 1 * zoom) + 2 * zoom}px`,
      position: 'relative',
    };
  }, [width, height, zoom]);

  // Function to generate color based on character ASCII value
  const getCharColor = useCallback((char: string) => {
    if (char === ' ') return '#fff'; // White for spaces
    
    const asciiCode = char.charCodeAt(0);
    const hue = (asciiCode * 137.508) % 360; // Golden ratio distribution for nice color spread
    const saturation = 80 + (asciiCode % 20); // 80-100% saturation
    const lightness = 75 - (asciiCode % 15); // 60-75% lightness for readability
    
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  }, []);

  // Function to render only visible cells (virtualized)
  const renderVisibleCells = useMemo(() => {
    const cellSize = 30 * zoom;
    const cells = [];
    
    for (let y = viewportInfo.visibleStartRow; y <= viewportInfo.visibleEndRow; y++) {
      for (let x = viewportInfo.visibleStartCol; x <= viewportInfo.visibleEndCol; x++) {
        if (y < mapData.length && x < mapData[y].length) {
          const char = mapData[y][x];
          const isSpace = char === ' ';
          const backgroundColor = getCharColor(char);
          
          cells.push(
            <div
              key={`${x}-${y}`}
              style={{
                backgroundColor,
                color: isSpace ? '#000' : '#000',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                position: 'absolute',
                width: `${cellSize}px`,
                height: `${cellSize}px`,
                top: `${y * (cellSize + 1 * zoom) + 1 * zoom}px`,
                left: `${x * (cellSize + 1 * zoom) + 1 * zoom}px`,
                cursor: 'pointer',
                fontSize: `${16 * zoom}px`,
                fontFamily: '"Space Mono", monospace',
                fontWeight: 400,
                userSelect: 'none',
              }}
              onMouseDown={() => handleMouseDown(x, y)}
              onMouseEnter={() => handleMouseEnter(x, y)}
              onMouseUp={handleMouseUp}
            >
              {char}
            </div>
          );
        }
      }
    }
    
    return cells;
  }, [
    mapData, 
    zoom, 
    viewportInfo.visibleStartRow, 
    viewportInfo.visibleEndRow, 
    viewportInfo.visibleStartCol, 
    viewportInfo.visibleEndCol, 
    handleMouseDown, 
    handleMouseEnter, 
    handleMouseUp,
    getCharColor
  ]);

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      width: '100%',
      height: '99vh',
      userSelect: 'none'
    }}>
      <h1 style={{
        textAlign: 'center',
        width: '100%',
        margin: '0 0 10px 0',
        fontSize: '24px',
        fontWeight: 'bold',
        color: '#333'
      }}>
        ASCII Map Editor
      </h1>
      
      <div style={{ 
        display: 'flex', 
        flexWrap: 'wrap', 
        gap: '10px', 
        marginBottom: '5px',
        justifyContent: 'center',
        userSelect: 'none'
      }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <label htmlFor="width" style={{ marginRight: '8px' }}>Width:</label>
          <input
            id="width"
            type="number"
            min="1"
            value={width}
            onChange={handleWidthChange}
            style={{ 
              width: '60px', 
              padding: '4px 8px', 
              border: '1px solid #ccc', 
              borderRadius: '4px' 
            }}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <label htmlFor="height" style={{ marginRight: '8px' }}>Height:</label>
          <input
            id="height"
            type="number"
            min="1"
            value={height}
            onChange={handleHeightChange}
            style={{ 
              width: '60px', 
              padding: '4px 8px', 
              border: '1px solid #ccc', 
              borderRadius: '4px' 
            }}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <label htmlFor="zoom" style={{ marginRight: '8px' }}>Zoom:</label>
          <input
            id="zoom"
            type="range"
            min="0.2"
            max="3"
            step="0.1"
            value={zoom}
            onChange={handleZoomChange}
            style={{ 
              width: '100px'
            }}
          />
          <span style={{ marginLeft: '4px', minWidth: '30px' }}>{zoom.toFixed(1)}x</span>
        </div>
        <button 
          onClick={exportMap}
          style={{ 
            backgroundColor: '#4caf50', 
            color: 'white', 
            border: 'none', 
            padding: '8px 16px', 
            borderRadius: '4px', 
            cursor: 'pointer' 
          }}
        >
          Export
        </button>
        <div>
          <label 
            htmlFor="import" 
            style={{ 
              backgroundColor: '#2196f3', 
              color: 'white', 
              padding: '8px 16px', 
              borderRadius: '4px', 
              cursor: 'pointer',
              display: 'inline-block'
            }}
          >
            Import
            <input
              id="import"
              type="file"
              accept=".txt"
              onChange={importMap}
              style={{ display: 'none' }}
            />
          </label>
        </div>
      </div>

      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        marginBottom: '5px', 
        gap: '20px' 
      }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <label htmlFor="charInput" style={{ marginRight: '8px' }}>Character:</label>
          <input
            id="charInput"
            type="text"
            maxLength={1}
            value={selectedChar}
            onChange={handleCharChange}
            style={{ 
              width: '50px', 
              height: '50px',
              padding: '4px', 
              fontSize: '24px', 
              textAlign: 'center',
              border: '1px solid #ccc',
              borderRadius: '4px'
            }}
          />
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <label htmlFor="brushSize" style={{ marginRight: '8px' }}>Brush Size:</label>
          <input
            id="brushSize"
            type="range"
            min="1"
            max="5"
            step="1"
            value={brushSize}
            onChange={handleBrushSizeChange}
            style={{ 
              width: '100px'
            }}
          />
          <span style={{ marginLeft: '4px', minWidth: '30px' }}>{brushSize}×{brushSize}</span>
        </div>
      </div>

      <div 
        ref={gridContainerRef}
        style={gridContainerStyle}
        onMouseLeave={handleMouseUp}
      >
        <div style={gridStyle}>
          {renderVisibleCells}
        </div>
      </div>
    </div>
  );
};

export default ASCIIMapEditor; 