import React, { useState, useEffect, useRef } from 'react';
import { usePlayground } from '../../context/PlaygroundContext';
import { useAuth } from '../../context/AuthContext';
import CodeEditor from './Editor';
import './Playground.css';

const Playground = () => {
  const { user } = useAuth();
  const { saveCode, loadPlayground, playgrounds } = usePlayground();
  const [html, setHtml] = useState('<div class="container">\n  <h1>Hello World</h1>\n  <p>Start coding!</p>\n</div>');
  const [css, setCss] = useState('.container {\n  padding: 20px;\n  text-align: center;\n}\n\nh1 {\n  color: #333;\n}\n\np {\n  color: #666;\n}');
  const [js, setJs] = useState('// Add your JavaScript here\nconsole.log("Hello from JavaScript!");\ndocument.querySelector("h1").addEventListener("click", () => {\n  alert("Hello from JavaScript!");\n});');
  const [fileName, setFileName] = useState('Untitled Playground');
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('html'); // Track active editor tab
  const iframeRef = useRef(null);

  useEffect(() => {
    updateOutput();
  }, [html, css, js]);

  const updateOutput = () => {
    if (!iframeRef.current) return;

    const iframe = iframeRef.current;
    const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;

    // Create a new document
    iframeDoc.open();
    iframeDoc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
          <style>
            ${css}
            body {
              margin: 0;
              padding: 0;
              font-family: Arial, sans-serif;
              overflow-x: hidden;
              -webkit-overflow-scrolling: touch;
            }
            .container {
              width: 100%;
              max-width: 100%;
              box-sizing: border-box;
            }
            @media (max-width: 768px) {
              body {
                font-size: 16px;
              }
              .container {
                padding: 10px;
              }
            }
          </style>
        </head>
        <body>
          ${html}
          <script>
            try {
              ${js}
            } catch (error) {
              console.error('JavaScript Error:', error);
            }
          </script>
        </body>
      </html>
    `);
    iframeDoc.close();

    // Add error handling
    iframe.onload = () => {
      try {
        iframe.contentWindow.console.log = (...args) => {
          console.log(...args);
        };
        iframe.contentWindow.console.error = (...args) => {
          console.error(...args);
        };
      } catch (error) {
        console.error('Error setting up console:', error);
      }
    };
  };

  const handleSave = async () => {
    try {
      if (!user) {
        setError('Please sign in to save your playground');
        return;
      }

      const codeData = {
        html,
        css,
        js
      };
      await saveCode(fileName, codeData);
      setError('');
      alert('Playground saved successfully!');
    } catch (error) {
      console.error('Error saving playground:', error);
      setError(error.message || 'Failed to save playground');
    }
  };

  const handleLoad = async (playgroundId) => {
    try {
      if (!user) {
        setError('Please sign in to load playgrounds');
        return;
      }

      const playground = await loadPlayground(playgroundId);
      setHtml(playground.html);
      setCss(playground.css);
      setJs(playground.js);
      setFileName(playground.fileName);
      setError('');
    } catch (error) {
      console.error('Error loading playground:', error);
      setError(error.message || 'Failed to load playground');
    }
  };

  // Render the active editor based on the selected tab
  const renderActiveEditor = () => {
    switch (activeTab) {
      case 'html':
        return (
          <CodeEditor
            language="html"
            value={html}
            onChange={setHtml}
            title="HTML"
          />
        );
      case 'css':
        return (
          <CodeEditor
            language="css"
            value={css}
            onChange={setCss}
            title="CSS"
          />
        );
      case 'js':
        return (
          <CodeEditor
            language="javascript"
            value={js}
            onChange={setJs}
            title="JavaScript"
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="playground-container">
      <div className="playground-header">
        <input
          type="text"
          value={fileName}
          onChange={(e) => setFileName(e.target.value)}
          className="playground-title"
          placeholder="Enter playground name"
        />
        <div className="playground-controls">
          <button 
            className="save-button" 
            onClick={handleSave}
            disabled={!user}
            title={!user ? "Sign in to save" : "Save playground"}
          >
            Save
          </button>
          <select 
            className="load-select"
            onChange={(e) => handleLoad(e.target.value)}
            value=""
            disabled={!user}
            title={!user ? "Sign in to load" : "Load playground"}
          >
            <option value="" disabled>Load Playground</option>
            {playgrounds.map((playground) => (
              <option key={playground.id} value={playground.id}>
                {playground.fileName}
              </option>
            ))}
          </select>
        </div>
      </div>
      {error && (
        <div className="error-message">
          {error}
        </div>
      )}
      <div className="main-content">
        <div className="editors-section">
          <div className="editor-tabs">
            <button 
              className={`tab-button ${activeTab === 'html' ? 'active' : ''}`}
              onClick={() => setActiveTab('html')}
            >
              HTML
            </button>
            <button 
              className={`tab-button ${activeTab === 'css' ? 'active' : ''}`}
              onClick={() => setActiveTab('css')}
            >
              CSS
            </button>
            <button 
              className={`tab-button ${activeTab === 'js' ? 'active' : ''}`}
              onClick={() => setActiveTab('js')}
            >
              JavaScript
            </button>
          </div>
          <div className="editor-container">
            {renderActiveEditor()}
          </div>
        </div>
        <div className="preview-section">
          <div className="preview-header">
            <span>Preview</span>
          </div>
          <iframe
            ref={iframeRef}
            id="preview-iframe"
            title="preview"
            className="preview-iframe"
            sandbox="allow-scripts allow-same-origin allow-modals"
            scrolling="yes"
          />
        </div>
      </div>
    </div>
  );
};

export default Playground; 