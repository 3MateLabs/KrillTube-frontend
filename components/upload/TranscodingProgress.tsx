/**
 * Transcoding Progress
 * Shows background transcoding progress
 */

'use client';

interface TranscodingProgressProps {
  isTranscoding: boolean;
  progress: number;
}

export function TranscodingProgress({ isTranscoding, progress }: TranscodingProgressProps) {
  if (!isTranscoding) return null;

  return (
    <div className="p-5 bg-black rounded-2xl shadow-[3px_3px_0px_0px_rgba(0,0,0,1.00)] outline outline-2 outline-offset-[-2px] outline-white">
      <div className="flex items-center gap-3 mb-3">
        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-krill-orange"></div>
        <span className="text-white font-medium font-['Outfit']">Processing video in background...</span>
        <span className="text-krill-orange font-bold font-['Outfit'] ml-auto">{Math.round(progress)}%</span>
      </div>
      <div className="w-full bg-white/20 rounded-full h-2">
        <div
          className="bg-krill-orange h-2 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
