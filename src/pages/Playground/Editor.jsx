import React, { useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
import './Editor.css';

const CodeEditor = ({ language, value, onChange, title }) => {
  const editorRef = useRef(null);

  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;
    
    // Configure language-specific settings
    if (language === 'html') {
      monaco.languages.html.htmlDefaults.setOptions({
        suggest: { 
          html5: true,
          autoClosingTags: true,
          autoClosingQuotes: true,
          autoClosingBrackets: true,
          snippets: [
            {
              label: 'div',
              kind: monaco.languages.CompletionItemKind.Snippet,
              insertText: '<div>${1}</div>',
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: 'HTML div element'
            },
            {
              label: 'p',
              kind: monaco.languages.CompletionItemKind.Snippet,
              insertText: '<p>${1}</p>',
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: 'HTML paragraph element'
            },
            {
              label: 'span',
              kind: monaco.languages.CompletionItemKind.Snippet,
              insertText: '<span>${1}</span>',
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: 'HTML span element'
            },
            {
              label: 'button',
              kind: monaco.languages.CompletionItemKind.Snippet,
              insertText: '<button>${1}</button>',
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: 'HTML button element'
            },
            {
              label: 'input',
              kind: monaco.languages.CompletionItemKind.Snippet,
              insertText: '<input type="${1:text}" placeholder="${2}" />',
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: 'HTML input element'
            }
          ]
        },
        format: {
          wrapLineLength: 80,
          unformatted: 'span,em,strong,i,b,br',
          contentUnformatted: 'pre,code,textarea'
        }
      });
    } else if (language === 'css') {
      monaco.languages.css.cssDefaults.setOptions({
        validate: true,
        lint: {
          compatibleVendorPrefixes: 'ignore',
          vendorPrefix: 'warning',
          duplicateProperties: 'warning',
          emptyRules: 'warning',
          importStatement: 'ignore',
          boxModel: 'ignore',
          universalSelector: 'ignore',
          zeroUnits: 'ignore',
          fontFaceProperties: 'warning',
          hexColorLength: 'error',
          argumentsInColorFunction: 'error',
          unknownProperties: 'warning',
          ieHack: 'ignore',
          unknownVendorSpecificProperties: 'ignore',
          propertyIgnoredDueToDisplay: 'warning',
          important: 'ignore',
          float: 'ignore',
          idSelector: 'ignore'
        },
        suggest: {
          showProperties: true,
          showValues: true,
          showColors: true,
          showVariables: true,
          showFunctions: true,
          showKeywords: true,
          showMarkdown: true,
          showSnippets: true
        }
      });
    } else if (language === 'javascript') {
      // Enable JavaScript language features
      monaco.languages.typescript.javascriptDefaults.setEagerModelSync(true);
      monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
        noSemanticValidation: false,
        noSyntaxValidation: false,
      });
      
      // Add JavaScript language features
      monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
        target: monaco.languages.typescript.ScriptTarget.ES2020,
        allowNonTsExtensions: true,
        moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
        module: monaco.languages.typescript.ModuleKind.CommonJS,
        noEmit: true,
        typeRoots: ["node_modules/@types"],
        lib: ["es2020"],
        allowJs: true,
        checkJs: true,
      });
    }
  };

  return (
    <div className="editor-wrapper">
      <div className="editor-header">
        <span className="editor-title">{title}</span>
      </div>
      <Editor
        height="100%"
        language={language}
        value={value}
        onChange={onChange}
        onMount={handleEditorDidMount}
        theme="vs-dark"
        options={{
          // Basic editor settings
          minimap: { enabled: false },
          fontSize: 14,
          lineNumbers: 'on',
          roundedSelection: false,
          scrollBeyondLastLine: true,
          readOnly: false,
          automaticLayout: true,
          tabSize: 2,
          wordWrap: 'on',
          
          // Editor features
          autoClosingBrackets: 'always',
          autoClosingQuotes: 'always',
          autoIndent: 'full',
          autoSurround: 'languageDefined',
          bracketPairColorization: { enabled: true },
          contextmenu: true,
          cursorBlinking: 'smooth',
          cursorStyle: 'line',
          folding: true,
          fontLigatures: true,
          links: true,
          matchBrackets: 'always',
          mouseWheelZoom: true,
          multiCursorModifier: 'alt',
          
          // Performance settings
          renderControlCharacters: false,
          renderIndentGuides: true,
          
          // Scrollbar settings
          scrollbar: {
            vertical: 'visible',
            horizontal: 'visible',
            useShadows: false,
            verticalHasArrows: false,
            horizontalHasArrows: false,
            verticalScrollbarSize: 10,
            horizontalScrollbarSize: 10,
            arrowSize: 30
          }
        }}
      />
    </div>
  );
};

export default CodeEditor; 