import React, { useState, useRef } from 'react';
import { Upload, FileAudio, Trash2, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const FileScrubber: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customMarker, setCustomMarker] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setIsSuccess(false);
      setError(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
      setIsSuccess(false);
      setError(null);
    }
  };

  const scrubFile = async () => {
    if (!file) return;

    setIsScrubbing(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('marker', customMarker);

    try {
      const response = await fetch('/api/scrub', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to scrub file. Currently only MP3 is supported for deep cleaning.');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `scrubbed_${file.name}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setIsSuccess(true);
    } catch (err: any) {
      setError(err.message || 'An error occurred during scrubbing.');
    } finally {
      setIsScrubbing(false);
    }
  };

  const clearFile = () => {
    setFile(null);
    setIsSuccess(false);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-6 space-y-8" id="scrubber-container">
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-bold tracking-tighter text-white" id="main-title">
          Meta<span className="text-red-500">Scrub</span>
        </h1>
        <p className="text-neutral-400">Total metadata destruction for your audio files.</p>
      </div>

      <div 
        className={`relative group border-2 border-dashed rounded-2xl p-12 transition-all 
          ${file ? 'border-red-500/50 bg-red-500/5' : 'border-neutral-800 hover:border-neutral-700 bg-neutral-900/50'}
          ${isScrubbing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        onClick={() => !isScrubbing && fileInputRef.current?.click()}
        id="drop-zone"
      >
        <input 
          type="file" 
          className="hidden" 
          ref={fileInputRef} 
          onChange={handleFileChange}
          accept="audio/*"
        />

        <div className="flex flex-col items-center justify-center space-y-4 text-center">
          {file ? (
            <div className="space-y-4">
              <div className="p-4 bg-red-500/10 rounded-full inline-block">
                <FileAudio className="w-12 h-12 text-red-500" />
              </div>
              <div>
                <p className="text-lg font-medium text-white max-w-xs truncate">{file.name}</p>
                <p className="text-sm text-neutral-500">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
              </div>
            </div>
          ) : (
            <>
              <div className="p-4 bg-neutral-800 rounded-full group-hover:scale-110 transition-transform">
                <Upload className="w-8 h-8 text-neutral-400" />
              </div>
              <div className="space-y-1">
                <p className="text-white font-medium text-lg">Pick an audio file</p>
                <p className="text-neutral-500 text-sm">Drag & drop or click to browse</p>
              </div>
            </>
          )}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {file && !isSuccess && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest px-1">Replacement Tag (Optional)</label>
              <input 
                type="text" 
                value={customMarker}
                onChange={(e) => setCustomMarker(e.target.value)}
                placeholder="Data baru dari user (e.g. MyAudio)"
                className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 text-white focus:border-red-500 outline-none transition-colors"
                id="marker-input"
              />
            </div>

            <div className="flex gap-4" id="action-buttons">
              <button
                onClick={scrubFile}
                disabled={isScrubbing}
                className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-neutral-800 text-white font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2 group shadow-lg shadow-red-900/20"
                id="scrub-button"
              >
                {isScrubbing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    SCRUBBING...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                    DESTROY & REPLACE
                  </>
                )}
              </button>
              <button
                onClick={clearFile}
                className="px-6 py-4 bg-neutral-800 hover:bg-neutral-700 text-white font-bold rounded-xl transition-all"
                id="clear-button"
              >
                RESET
              </button>
            </div>
          </motion.div>
        )}

        {isSuccess && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-6 bg-green-500/10 border border-green-500/20 rounded-2xl flex flex-col items-center text-center space-y-4"
            id="success-message"
          >
            <CheckCircle2 className="w-12 h-12 text-green-500" />
            <div>
              <p className="text-white font-bold text-xl">Scrubbing Complete!</p>
              <p className="text-neutral-400">File has been stripped and downloaded.</p>
            </div>
            <button
              onClick={clearFile}
              className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl transition-all"
              id="done-button"
            >
              CLEAN ANOTHER FILE
            </button>
          </motion.div>
        )}

        {error && (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-400 text-sm"
            id="error-message"
          >
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p>{error}</p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="pt-8 grid grid-cols-1 md:grid-cols-3 gap-4" id="features">
        {[
          { title: 'Zero Signatures', desc: 'Removes all encoder headers and software tags.' },
          { title: 'Anonymous Bits', desc: 'Overwrites identifyable metadata sections.' },
          { title: 'Path Clean', desc: 'Renames output to generic random string.' },
        ].map((f, i) => (
          <div key={i} className="p-4 bg-neutral-900/50 rounded-xl border border-neutral-800/50 space-y-1">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">{f.title}</h3>
            <p className="text-xs text-neutral-500 leading-relaxed">{f.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FileScrubber;
