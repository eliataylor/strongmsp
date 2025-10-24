import { Box, useTheme } from '@mui/material';
import 'easymde/dist/easymde.min.css';
import React, { useEffect } from 'react';
import SimpleMDE from 'react-simplemde-editor';

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: number;
  readOnly?: boolean;
}

const MarkdownEditor: React.FC<MarkdownEditorProps> = ({
  value,
  onChange,
  placeholder = 'Enter your content here...',
  minHeight = 200,
  readOnly = false
}) => {
  const theme = useTheme();

  const options = {
    placeholder,
    minHeight: `${minHeight}px`,
    readOnly,
    spellChecker: false,
    status: false,
    toolbar: [
      'bold',
      'italic',
      'heading',
      '|',
      'quote',
      'unordered-list',
      'ordered-list',
      '|',
      'link',
      'image',
      '|',
      'preview',
      'side-by-side',
      'fullscreen',
      '|',
      'guide'
    ] as const,
    previewRender: (plainText: string) => {
      // This will be handled by ReactMarkdown in the parent component
      return plainText;
    },
    sideBySideFullscreen: false,
    toolbarTips: true,
    shortcuts: {
      togglePreview: null,
      toggleSideBySide: null,
      toggleFullScreen: null
    }
  };

  useEffect(() => {
    // Custom CSS for Material-UI theme integration
    const style = document.createElement('style');
    style.textContent = `
      .CodeMirror {
        font-family: ${theme.typography.body1.fontFamily};
        font-size: ${theme.typography.body1.fontSize};
        line-height: ${theme.typography.body1.lineHeight};
        border: 1px solid ${theme.palette.divider};
        border-radius: ${theme.shape.borderRadius}px;
        background-color: ${theme.palette.background.paper};
        color: ${theme.palette.text.primary};
      }
      
      .CodeMirror-focused {
        border-color: ${theme.palette.primary.main};
        box-shadow: 0 0 0 2px ${theme.palette.primary.main}20;
      }
      
      .CodeMirror-cursor {
        border-left-color: ${theme.palette.primary.main};
      }
      
      .CodeMirror-selected {
        background-color: ${theme.palette.primary.main}20;
      }
      
      .CodeMirror-gutters {
        background-color: ${theme.palette.grey[50]};
        border-right: 1px solid ${theme.palette.divider};
      }
      
      .CodeMirror-linenumber {
        color: ${theme.palette.text.secondary};
      }
      
      .CodeMirror-activeline-background {
        background-color: ${theme.palette.action.hover};
      }
      
      .editor-toolbar {
        background-color: ${theme.palette.grey[50]};
        border: 1px solid ${theme.palette.divider};
        border-bottom: none;
        border-radius: ${theme.shape.borderRadius}px ${theme.shape.borderRadius}px 0 0;
      }
      
      .editor-toolbar button {
        color: ${theme.palette.text.secondary};
        border-radius: ${theme.shape.borderRadius}px;
        margin: 2px;
      }
      
      .editor-toolbar button:hover {
        background-color: ${theme.palette.action.hover};
        color: ${theme.palette.text.primary};
      }
      
      .editor-toolbar button.active {
        background-color: ${theme.palette.primary.main};
        color: ${theme.palette.primary.contrastText};
      }
      
      .editor-preview {
        background-color: ${theme.palette.background.paper};
        color: ${theme.palette.text.primary};
        font-family: ${theme.typography.body1.fontFamily};
        font-size: ${theme.typography.body1.fontSize};
        line-height: ${theme.typography.body1.lineHeight};
        padding: ${theme.spacing(2)};
      }
      
      .editor-preview h1,
      .editor-preview h2,
      .editor-preview h3,
      .editor-preview h4,
      .editor-preview h5,
      .editor-preview h6 {
        color: ${theme.palette.text.primary};
        font-weight: ${theme.typography.h6.fontWeight};
        margin-top: ${theme.spacing(2)};
        margin-bottom: ${theme.spacing(1)};
      }
      
      .editor-preview p {
        margin-bottom: ${theme.spacing(1)};
      }
      
      .editor-preview blockquote {
        border-left: 4px solid ${theme.palette.primary.main};
        padding-left: ${theme.spacing(2)};
        margin: ${theme.spacing(2)} 0;
        font-style: italic;
        color: ${theme.palette.text.secondary};
      }
      
      .editor-preview code {
        background-color: ${theme.palette.grey[100]};
        padding: 2px 4px;
        border-radius: ${theme.shape.borderRadius}px;
        font-family: ${theme.typography.fontFamily};
      }
      
      .editor-preview pre {
        background-color: ${theme.palette.grey[100]};
        padding: ${theme.spacing(2)};
        border-radius: ${theme.shape.borderRadius}px;
        overflow-x: auto;
      }
      
      .editor-preview ul,
      .editor-preview ol {
        padding-left: ${theme.spacing(3)};
      }
      
      .editor-preview a {
        color: ${theme.palette.primary.main};
        text-decoration: none;
      }
      
      .editor-preview a:hover {
        text-decoration: underline;
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, [theme]);

  return (
    <Box sx={{ width: '100%' }}>
      <SimpleMDE
        value={value}
        onChange={onChange}
        options={options}
      />
    </Box>
  );
};

export default MarkdownEditor;
