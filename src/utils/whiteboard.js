import {
  getWhiteboards,
  getWhiteboard,
  createWhiteboard,
  updateWhiteboard,
  deleteWhiteboard,
  shareWhiteboard,
  unshareWhiteboard
} from '../firebase/firestore';
import { collection, doc, updateDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import { WHITEBOARD_TOOLS } from '../context/WhiteboardContext';

// Constants
export const DEFAULT_WHITEBOARD_SETTINGS = {
  color: '#000000',
  strokeSize: 5,
  tool: WHITEBOARD_TOOLS.PEN
};

// Whiteboard operations
export const loadWhiteboards = async (userId) => {
  try {
    return await getWhiteboards(userId);
  } catch (error) {
    console.error('Error loading whiteboards:', error);
    throw error;
  }
};

export const loadWhiteboard = async (whiteboardId) => {
  try {
    return await getWhiteboard(whiteboardId);
  } catch (error) {
    console.error('Error loading whiteboard:', error);
    throw error;
  }
};

export const saveWhiteboard = async (userId, whiteboardData) => {
  try {
    const whiteboardRef = collection(db, 'whiteboards');
    
    if (whiteboardData.id) {
      // Update existing whiteboard
      const docRef = doc(db, 'whiteboards', whiteboardData.id);
      await updateDoc(docRef, {
        ...whiteboardData,
        updatedAt: serverTimestamp()
      });
      return whiteboardData.id;
    } else {
      // Create new whiteboard
      const docRef = await addDoc(whiteboardRef, {
        userId,
        title: whiteboardData.title || 'Untitled Whiteboard',
        content: whiteboardData.content || '',
        sharedWith: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return docRef.id;
    }
  } catch (error) {
    console.error('Error saving whiteboard:', error);
    throw error;
  }
};

export const removeWhiteboard = async (whiteboardId) => {
  try {
    await deleteWhiteboard(whiteboardId);
  } catch (error) {
    console.error('Error deleting whiteboard:', error);
    throw error;
  }
};

export const shareWithUser = async (whiteboardId, userId) => {
  try {
    await shareWhiteboard(whiteboardId, userId);
  } catch (error) {
    console.error('Error sharing whiteboard:', error);
    throw error;
  }
};

export const unshareWithUser = async (whiteboardId, userId) => {
  try {
    await unshareWhiteboard(whiteboardId, userId);
  } catch (error) {
    console.error('Error unsharing whiteboard:', error);
    throw error;
  }
};

// Canvas operations
export const saveCanvasToDataURL = (canvas) => {
  return canvas.toDataURL('image/png');
};

export const loadCanvasFromDataURL = (canvas, dataURL) => {
  const ctx = canvas.getContext('2d');
  const img = new Image();
  img.onload = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);
  };
  img.src = dataURL;
};

// Drawing operations
export const startDrawing = (canvas, tool, point, color, strokeSize) => {
  const ctx = canvas.getContext('2d');
  ctx.strokeStyle = tool === WHITEBOARD_TOOLS.ERASER ? '#FFFFFF' : color;
  ctx.lineWidth = strokeSize;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(point.x, point.y);
};

export const draw = (canvas, tool, startPoint, currentPoint, color, strokeSize, currentImageData) => {
  const ctx = canvas.getContext('2d');
  
  // Save the current state before drawing
  ctx.save();
  
  // Clear the canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // Restore the previous image data if it exists
  if (currentImageData) {
    ctx.putImageData(currentImageData, 0, 0);
  }
  
  // Set drawing properties
  ctx.strokeStyle = tool === WHITEBOARD_TOOLS.ERASER ? '#FFFFFF' : color;
  ctx.lineWidth = strokeSize;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  
  if (tool === WHITEBOARD_TOOLS.PEN || tool === WHITEBOARD_TOOLS.ERASER) {
    // For pen and eraser, continue the path
    ctx.beginPath();
    ctx.moveTo(startPoint.x, startPoint.y);
    ctx.lineTo(currentPoint.x, currentPoint.y);
    ctx.stroke();
  } else if (tool === WHITEBOARD_TOOLS.RECTANGLE) {
    // For rectangle, draw the shape
    const width = currentPoint.x - startPoint.x;
    const height = currentPoint.y - startPoint.y;
    ctx.strokeRect(startPoint.x, startPoint.y, width, height);
  } else if (tool === WHITEBOARD_TOOLS.CIRCLE) {
    // For circle, draw the shape
    const radius = Math.sqrt(
      Math.pow(currentPoint.x - startPoint.x, 2) +
      Math.pow(currentPoint.y - startPoint.y, 2)
    );
    ctx.beginPath();
    ctx.arc(startPoint.x, startPoint.y, radius, 0, 2 * Math.PI);
    ctx.stroke();
  }
  
  // Restore the context state
  ctx.restore();
};

export const finalizeDrawing = (canvas, tool, startPoint, endPoint, color, strokeSize) => {
  const ctx = canvas.getContext('2d');
  
  // Save the current state before drawing
  ctx.save();
  
  // Set drawing properties
  ctx.strokeStyle = tool === WHITEBOARD_TOOLS.ERASER ? '#FFFFFF' : color;
  ctx.lineWidth = strokeSize;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  
  if (tool === WHITEBOARD_TOOLS.RECTANGLE) {
    // For rectangle, draw the final shape
    const width = endPoint.x - startPoint.x;
    const height = endPoint.y - startPoint.y;
    ctx.strokeRect(startPoint.x, startPoint.y, width, height);
  } else if (tool === WHITEBOARD_TOOLS.CIRCLE) {
    // For circle, draw the final shape
    const radius = Math.sqrt(
      Math.pow(endPoint.x - startPoint.x, 2) +
      Math.pow(endPoint.y - startPoint.y, 2)
    );
    ctx.beginPath();
    ctx.arc(startPoint.x, startPoint.y, radius, 0, 2 * Math.PI);
    ctx.stroke();
  }
  
  // Restore the context state
  ctx.restore();
};

export const clearCanvas = (canvas) => {
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
};

// Text operations
export const addText = (canvas, text, position, color, fontSize) => {
  const ctx = canvas.getContext('2d');
  ctx.font = `${fontSize}px Arial`;
  ctx.fillStyle = color;
  ctx.textBaseline = 'top';
  ctx.fillText(text, position.x, position.y);
};

// History operations
export const saveToHistory = (canvas, history, setHistory, currentIndex, setCurrentIndex) => {
  const imageData = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height);
  const newHistory = history.slice(0, currentIndex + 1);
  newHistory.push(imageData);
  setHistory(newHistory);
  setCurrentIndex(newHistory.length - 1);
};

export const undo = (canvas, history, currentIndex, setCurrentIndex) => {
  if (currentIndex > 0) {
    const newIndex = currentIndex - 1;
    setCurrentIndex(newIndex);
    canvas.getContext('2d').putImageData(history[newIndex], 0, 0);
  }
};

export const redo = (canvas, history, currentIndex, setCurrentIndex) => {
  if (currentIndex < history.length - 1) {
    const newIndex = currentIndex + 1;
    setCurrentIndex(newIndex);
    canvas.getContext('2d').putImageData(history[newIndex], 0, 0);
  }
}; 