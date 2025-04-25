import { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useWhiteboard, WHITEBOARD_TOOLS, DEFAULT_WHITEBOARD_SETTINGS } from '../context/WhiteboardContext';
import {
  saveCanvasToDataURL,
  loadCanvasFromDataURL,
  startDrawing,
  draw,
  finalizeDrawing,
  clearCanvas,
  saveToHistory,
  undo,
  redo
} from '../utils/whiteboard';
import './Whiteboard.css';

const Whiteboard = () => {
  console.log('Whiteboard component rendering');
  
  // Refs
  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  // Context
  const { user } = useAuth();
  console.log('User state:', user);
  
  const { 
    saveWhiteboard, 
    loadWhiteboard, 
    currentWhiteboard, 
    isLoading: contextLoading,
    error: contextError,
    whiteboards
  } = useWhiteboard();
  
  console.log('Whiteboard context state:', {
    currentWhiteboard,
    contextLoading,
    contextError
  });

  // State
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState(null);
  const [tool, setTool] = useState(DEFAULT_WHITEBOARD_SETTINGS.tool);
  const [color, setColor] = useState(DEFAULT_WHITEBOARD_SETTINGS.color);
  const [strokeSize, setStrokeSize] = useState(DEFAULT_WHITEBOARD_SETTINGS.strokeSize);
  const [history, setHistory] = useState([]);
  const [currentHistoryIndex, setCurrentHistoryIndex] = useState(-1);
  const [currentImageData, setCurrentImageData] = useState(null);
  const [error, setError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [autoSaveTimer, setAutoSaveTimer] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedWhiteboard, setSelectedWhiteboard] = useState(null);
  const [showWhiteboardModal, setShowWhiteboardModal] = useState(false);
  const [localWhiteboards, setLocalWhiteboards] = useState([]);

  // Move resizeCanvas to component scope
  const resizeCanvas = useCallback(() => {
    if (!canvasRef.current || !containerRef.current) return;
    
    const canvas = canvasRef.current;
    const container = containerRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    
    // Store current content before resize
    const currentDataURL = canvas.toDataURL();
    
    // Get container dimensions
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    
    // Calculate aspect ratio
    const aspectRatio = canvas.width / canvas.height;
    let newWidth = containerWidth;
    let newHeight = containerHeight;
    
    // Maintain aspect ratio
    if (containerWidth / containerHeight > aspectRatio) {
      newWidth = containerHeight * aspectRatio;
    } else {
      newHeight = containerWidth / aspectRatio;
    }
    
    // Only resize if dimensions actually changed
    if (canvas.width !== newWidth || canvas.height !== newHeight) {
      // Resize canvas
      canvas.width = newWidth;
      canvas.height = newHeight;
      
      // Create temporary image to restore content
      const img = new Image();
      img.onload = () => {
        // Clear canvas and restore content
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        // Update current image data
        setCurrentImageData(ctx.getImageData(0, 0, canvas.width, canvas.height));
      };
      img.src = currentDataURL;
    }
  }, []);

  // Add resize observer for container
  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver(() => {
      resizeCanvas();
    });

    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, [resizeCanvas]);

  // Save to local storage
  const saveToLocalStorage = () => {
    if (!isInitialized || !canvasRef.current) return;
    
    try {
      const canvas = canvasRef.current;
      const content = canvas.toDataURL('image/png');
      const draftData = {
        content,
        timestamp: new Date().toISOString(),
        tool,
        color,
        strokeSize,
        history: history.map(data => data.data),
        currentHistoryIndex
      };
      localStorage.setItem('whiteboard_draft', JSON.stringify(draftData));
      console.log('Auto-saved to local storage');
    } catch (error) {
      console.error('Error saving to local storage:', error);
    }
  };

  // Load from local storage
  const loadFromLocalStorage = async (canvas) => {
    try {
      const savedDraft = localStorage.getItem('whiteboard_draft');
      if (savedDraft) {
        const { content, timestamp, tool: savedTool, color: savedColor, 
                strokeSize: savedStrokeSize, history: savedHistory, 
                currentHistoryIndex: savedHistoryIndex } = JSON.parse(savedDraft);
        
        // Only load if the draft is less than 1 hour old
        const draftAge = (new Date() - new Date(timestamp)) / (1000 * 60 * 60);
        if (draftAge < 1) {
          await loadCanvasFromDataURL(canvas, content);
          setCurrentImageData(canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height));
          
          // Restore tool state
          if (savedTool) setTool(savedTool);
          if (savedColor) setColor(savedColor);
          if (savedStrokeSize) setStrokeSize(savedStrokeSize);
          
          // Restore history
          if (savedHistory && savedHistory.length > 0) {
            const restoredHistory = savedHistory.map(data => {
              const imageData = new ImageData(
                new Uint8ClampedArray(data),
                canvas.width,
                canvas.height
              );
              return imageData;
            });
            setHistory(restoredHistory);
            setCurrentHistoryIndex(savedHistoryIndex);
          }
          
          console.log('Loaded from local storage');
          return true;
        } else {
          console.log('Draft too old, clearing local storage');
          localStorage.removeItem('whiteboard_draft');
        }
      }
      return false;
    } catch (error) {
      console.error('Error loading from local storage:', error);
      return false;
    }
  };

  // Initialize canvas and load saved content
  useEffect(() => {
    let mounted = true;
    let retryTimeout;

    const initializeCanvas = async () => {
      if (!mounted) return;

      console.log('Initializing canvas...');
      const canvas = canvasRef.current;
      const container = containerRef.current;

      if (!canvas || !container) {
        console.log('Canvas or container not ready, retrying...');
        retryTimeout = setTimeout(initializeCanvas, 100);
        return;
      }

      try {
        console.log('Canvas and container ready, proceeding with initialization');
        const ctx = canvas.getContext('2d', { willReadFrequently: true });

        // Set initial canvas size
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;

        // Load saved content if available
        if (currentWhiteboard && currentWhiteboard.content) {
          console.log('Loading existing whiteboard content');
          await loadCanvasFromDataURL(canvas, currentWhiteboard.content);
          setCurrentImageData(ctx.getImageData(0, 0, canvas.width, canvas.height));
        } else {
          console.log('Loading from local storage or starting with blank canvas');
          const loadedFromLocal = await loadFromLocalStorage(canvas);
          if (!loadedFromLocal) {
            // Set white background for new canvas
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            setCurrentImageData(ctx.getImageData(0, 0, canvas.width, canvas.height));
          }
        }

        // Save initial state to history
        if (canvas.width > 0 && canvas.height > 0) {
          saveToHistory(canvas, history, setHistory, currentHistoryIndex, setCurrentHistoryIndex);
        }

        if (mounted) {
          setIsInitialized(true);
        }
      } catch (error) {
        console.error('Error in initialization:', error);
        if (mounted) {
          setError('Failed to initialize canvas: ' + error.message);
          setIsInitialized(true);
        }
      }
    };

    if (!contextLoading) {
      initializeCanvas();
    }

    return () => {
      mounted = false;
      if (retryTimeout) {
        clearTimeout(retryTimeout);
      }
    };
  }, [currentWhiteboard, contextLoading]);

  // Auto-save effect
  useEffect(() => {
    if (!isInitialized) return;

    // Clear any existing timer
    if (autoSaveTimer) {
      clearTimeout(autoSaveTimer);
    }

    // Set up new auto-save timer
    const timer = setTimeout(() => {
      saveToLocalStorage();
    }, 30000); // Auto-save every 30 seconds

    setAutoSaveTimer(timer);

    return () => {
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [isInitialized, currentImageData, tool, color, strokeSize, history, currentHistoryIndex]);

  const getCanvasCoordinates = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  };

  const handleStart = (e) => {
    if (!isInitialized) return;
    
    const canvas = canvasRef.current;
    const coords = getCanvasCoordinates(e);
    
    setIsDrawing(true);
    setStartPoint(coords);
    
    // Start drawing only for pen and eraser
    if (tool === WHITEBOARD_TOOLS.PEN || tool === WHITEBOARD_TOOLS.ERASER) {
      const ctx = canvas.getContext('2d');
      ctx.beginPath();
      ctx.moveTo(coords.x, coords.y);
      ctx.lineTo(coords.x, coords.y);
      ctx.strokeStyle = tool === WHITEBOARD_TOOLS.ERASER ? '#FFFFFF' : color;
      ctx.lineWidth = strokeSize;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();
    }
  };

  const handleMove = (e) => {
    if (!isDrawing || !isInitialized) return;
    
    const canvas = canvasRef.current;
    const coords = getCanvasCoordinates(e);
    const ctx = canvas.getContext('2d');
    
    if (tool === WHITEBOARD_TOOLS.PEN || tool === WHITEBOARD_TOOLS.ERASER) {
      ctx.beginPath();
      ctx.moveTo(startPoint.x, startPoint.y);
      ctx.lineTo(coords.x, coords.y);
      ctx.strokeStyle = tool === WHITEBOARD_TOOLS.ERASER ? '#FFFFFF' : color;
      ctx.lineWidth = strokeSize;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();
      
      setStartPoint(coords);
    } else if (tool === WHITEBOARD_TOOLS.RECTANGLE || tool === WHITEBOARD_TOOLS.CIRCLE) {
      // Clear canvas and restore previous state
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (currentImageData) {
        ctx.putImageData(currentImageData, 0, 0);
      }
      
      // Draw the shape
      ctx.beginPath();
      if (tool === WHITEBOARD_TOOLS.RECTANGLE) {
        const width = coords.x - startPoint.x;
        const height = coords.y - startPoint.y;
        ctx.rect(startPoint.x, startPoint.y, width, height);
      } else {
        const radius = Math.sqrt(
          Math.pow(coords.x - startPoint.x, 2) + 
          Math.pow(coords.y - startPoint.y, 2)
        );
        ctx.arc(startPoint.x, startPoint.y, radius, 0, 2 * Math.PI);
      }
      ctx.strokeStyle = color;
      ctx.lineWidth = strokeSize;
      ctx.stroke();
    }
  };

  const handleEnd = (e) => {
    if (!isDrawing || !isInitialized) return;
    
    const canvas = canvasRef.current;
    const coords = getCanvasCoordinates(e);
    const ctx = canvas.getContext('2d');
    
    if (tool === WHITEBOARD_TOOLS.RECTANGLE || tool === WHITEBOARD_TOOLS.CIRCLE) {
      // Clear canvas and restore previous state
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (currentImageData) {
        ctx.putImageData(currentImageData, 0, 0);
      }
      
      // Draw the final shape
      ctx.beginPath();
      if (tool === WHITEBOARD_TOOLS.RECTANGLE) {
        const width = coords.x - startPoint.x;
        const height = coords.y - startPoint.y;
        ctx.rect(startPoint.x, startPoint.y, width, height);
      } else {
        const radius = Math.sqrt(
          Math.pow(coords.x - startPoint.x, 2) + 
          Math.pow(coords.y - startPoint.y, 2)
        );
        ctx.arc(startPoint.x, startPoint.y, radius, 0, 2 * Math.PI);
      }
      ctx.strokeStyle = color;
      ctx.lineWidth = strokeSize;
      ctx.stroke();
      
      // Update current image data
      setCurrentImageData(ctx.getImageData(0, 0, canvas.width, canvas.height));
    }
    
    saveToHistory(canvas, history, setHistory, currentHistoryIndex, setCurrentHistoryIndex);
    setIsDrawing(false);
    setStartPoint(null);
  };

  // Add touch event handlers
  const handleTouchStart = (e) => {
    e.preventDefault();
    handleStart(e.touches[0]);
  };

  const handleTouchMove = (e) => {
    e.preventDefault();
    handleMove(e.touches[0]);
  };

  const handleTouchEnd = (e) => {
    e.preventDefault();
    handleEnd(e.changedTouches[0]);
  };

  // Tool handlers
  const handleToolChange = (newTool) => {
    if (canvasRef.current) {
      setCurrentImageData(canvasRef.current.getContext('2d').getImageData(0, 0, canvasRef.current.width, canvasRef.current.height));
    }
    
    setTool(newTool);
    if (newTool === WHITEBOARD_TOOLS.ERASER) {
      setColor('#FFFFFF');
    } else if (tool === WHITEBOARD_TOOLS.ERASER) {
      setColor(DEFAULT_WHITEBOARD_SETTINGS.color);
    }
  };

  const handleClear = () => {
    if (!isInitialized) return;
    clearCanvas(canvasRef.current);
    setCurrentImageData(null);
    saveToHistory(canvasRef.current, history, setHistory, currentHistoryIndex, setCurrentHistoryIndex);
  };

  // Save whiteboard
  const handleSave = async () => {
    if (!user || !isInitialized) {
      console.error('No user found or canvas not initialized');
      setError('You must be logged in to save');
      return;
    }

    try {
      console.log('Starting save process...');
      setIsSaving(true);
      setError(null);

      const canvas = canvasRef.current;
      if (!canvas) {
        console.error('Canvas reference not found');
        throw new Error('Canvas not found');
      }

      console.log('Converting canvas to data URL...');
      const content = canvas.toDataURL('image/png');
      if (!content) {
        console.error('Failed to convert canvas to data URL');
        throw new Error('Failed to convert canvas to data URL');
      }

      console.log('Preparing whiteboard data...');
      const whiteboardData = {
        title: 'My Whiteboard',
        content,
        userId: user.uid,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      console.log('Attempting to save to Firestore...');
      const whiteboardId = await saveWhiteboard(user.uid, whiteboardData);
      console.log('Whiteboard saved successfully with ID:', whiteboardId);

      // Clear local storage after successful save
      localStorage.removeItem('whiteboard_draft');
    } catch (error) {
      console.error('Error saving whiteboard:', error);
      setError('Failed to save whiteboard: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    const fetchWhiteboards = async () => {
      if (user) {
        try {
          setLoading(true);
          // Use the context's whiteboards
          setLocalWhiteboards(whiteboards || []);
          setLoading(false);
        } catch (error) {
          console.error('Failed to load whiteboards:', error);
          setLoading(false);
          
          // Show a user-friendly error message
          if (error.message && error.message.includes('Missing or insufficient permissions')) {
            // This is likely a permissions issue - create a default whiteboard for the user
            try {
              console.log('Creating default whiteboard for user');
              const defaultWhiteboard = {
                title: 'My First Whiteboard',
                content: '',
                userId: user.uid,
                createdAt: new Date(),
                updatedAt: new Date()
              };
              
              // Use the context function instead of direct Firestore call
              const newWhiteboardId = await saveWhiteboard(user.uid, defaultWhiteboard);
              const newWhiteboard = {
                id: newWhiteboardId,
                ...defaultWhiteboard
              };
              
              setLocalWhiteboards([newWhiteboard]);
              setSelectedWhiteboard(newWhiteboard);
              setShowWhiteboardModal(false);
            } catch (createError) {
              console.error('Failed to create default whiteboard:', createError);
              // Show a more specific error message
              setError('Unable to access or create whiteboards. Please check your permissions or try again later.');
            }
          } else {
            setError('Failed to load whiteboards. Please try again later.');
          }
        }
      }
    };

    fetchWhiteboards();
  }, [user, whiteboards, saveWhiteboard]);

  if (contextLoading) {
    console.log('Showing loading state due to context loading');
    return (
      <div className="whiteboard-container">
        <div className="loading">Loading whiteboard...</div>
      </div>
    );
  }

  if (!user) {
    console.log('Showing login required message');
    return (
      <div className="whiteboard-container">
        <div className="error-message">Please log in to use the whiteboard</div>
      </div>
    );
  }

  if (error || contextError) {
    console.log('Showing error message:', error || contextError);
    return (
      <div className="whiteboard-container">
        <div className="error-message">{error || contextError}</div>
      </div>
    );
  }

  console.log('Rendering whiteboard interface');
  return (
    <div className="whiteboard-container">
      <div className="whiteboard-toolbar">
        <div className="tool-group">
          <button
            className={`tool-button ${tool === WHITEBOARD_TOOLS.PEN ? 'active' : ''}`}
            onClick={() => handleToolChange(WHITEBOARD_TOOLS.PEN)}
          >
            Pen
          </button>
          <button
            className={`tool-button ${tool === WHITEBOARD_TOOLS.ERASER ? 'active' : ''}`}
            onClick={() => handleToolChange(WHITEBOARD_TOOLS.ERASER)}
          >
            Eraser
          </button>
          <button
            className={`tool-button ${tool === WHITEBOARD_TOOLS.RECTANGLE ? 'active' : ''}`}
            onClick={() => handleToolChange(WHITEBOARD_TOOLS.RECTANGLE)}
          >
            Rectangle
          </button>
          <button
            className={`tool-button ${tool === WHITEBOARD_TOOLS.CIRCLE ? 'active' : ''}`}
            onClick={() => handleToolChange(WHITEBOARD_TOOLS.CIRCLE)}
          >
            Circle
          </button>
        </div>

        <div className="tool-group">
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="color-picker"
            disabled={tool === WHITEBOARD_TOOLS.ERASER}
          />
          <input
            type="range"
            min="1"
            max="20"
            value={strokeSize}
            onChange={(e) => setStrokeSize(parseInt(e.target.value))}
            className="stroke-size"
          />
        </div>

        <div className="tool-group">
          <button
            className="tool-button"
            onClick={() => undo(canvasRef.current, history, currentHistoryIndex, setCurrentHistoryIndex)}
            disabled={currentHistoryIndex <= 0}
          >
            Undo
          </button>
          <button
            className="tool-button"
            onClick={() => redo(canvasRef.current, history, currentHistoryIndex, setCurrentHistoryIndex)}
            disabled={currentHistoryIndex >= history.length - 1}
          >
            Redo
          </button>
          <button className="tool-button" onClick={handleClear}>
            Clear
          </button>
          <button
            className="save-button"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      <div ref={containerRef} className="whiteboard-canvas-container">
        <canvas
          ref={canvasRef}
          onMouseDown={handleStart}
          onMouseMove={handleMove}
          onMouseUp={handleEnd}
          onMouseOut={handleEnd}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className="whiteboard-canvas"
        />
      </div>
    </div>
  );
};

export default Whiteboard; 