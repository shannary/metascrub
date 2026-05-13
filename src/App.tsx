import FileScrubber from './components/FileScrubber';

export default function App() {
  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4 selection:bg-red-500/30">
      {/* Abstract Background Noise / Grid */}
      <div className="fixed inset-0 pointer-events-none opacity-20" 
        style={{ 
          backgroundImage: `radial-gradient(circle at 2px 2px, #333 1px, transparent 0)`, 
          backgroundSize: '40px 40px' 
        }} 
      />
      
      <main className="relative z-10 w-full" id="main-content">
        <FileScrubber />
      </main>

      <footer className="relative z-10 mt-12 text-neutral-600 text-[10px] uppercase tracking-[0.2em]" id="app-footer">
        MetaScrub Protocol // Secure Audio Stripper v1.0.0
      </footer>
    </div>
  );
}

