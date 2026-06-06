import React, { useRef, useState } from 'react';
import { Upload, X, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import { formatFileSize } from '../../utils/formatters';
import './FileUpload.css';

export default function FileUpload({ onFilesSelected, accept = '.pdf,.docx,.txt', multiple = false, maxFiles = 500, label }) {
  const [dragOver, setDragOver] = useState(false);
  const [files, setFiles] = useState([]);
  const inputRef = useRef(null);

  const handleFiles = (newFiles) => {
    const fileArray = Array.from(newFiles).slice(0, maxFiles);
    setFiles(fileArray);
    onFilesSelected?.(fileArray);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer.files);
  };

  const removeFile = (index) => {
    const updated = files.filter((_, i) => i !== index);
    setFiles(updated);
    onFilesSelected?.(updated);
  };

  return (
    <div className="file-upload-wrapper">
      <div
        className={`file-upload-zone ${dragOver ? 'drag-over' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <Upload size={40} className="file-upload-icon" />
        <p className="file-upload-text">{label || 'Drag & drop files here, or click to browse'}</p>
        <p className="file-upload-hint">PDF, DOCX, or TXT {multiple ? `(up to ${maxFiles} files)` : ''}</p>
        <input ref={inputRef} type="file" accept={accept} multiple={multiple} onChange={(e) => handleFiles(e.target.files)} hidden />
      </div>

      {files.length > 0 && (
        <div className="file-list">
          <div className="file-list-header">
            <span>{files.length} file{files.length > 1 ? 's' : ''} selected</span>
            <button className="file-clear" onClick={() => { setFiles([]); onFilesSelected?.([]); }}>Clear all</button>
          </div>
          {files.slice(0, 10).map((file, i) => (
            <div key={i} className="file-item">
              <FileText size={16} />
              <span className="file-name">{file.name}</span>
              <span className="file-size">{formatFileSize(file.size)}</span>
              <button className="file-remove" onClick={(e) => { e.stopPropagation(); removeFile(i); }}><X size={14} /></button>
            </div>
          ))}
          {files.length > 10 && <p className="file-more">...and {files.length - 10} more files</p>}
        </div>
      )}
    </div>
  );
}
