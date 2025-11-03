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
    <div className="p-5 bg-background-elevated border-2 border-walrus-mint/30 rounded-lg">
      <div className="flex items-center gap-3 mb-3">
        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-walrus-mint"></div>
        <span className="text-foreground font-medium">Processing video in background...</span>
        <span className="text-walrus-mint font-bold ml-auto">{Math.round(progress)}%</span>
      </div>
      <div className="w-full bg-background-hover rounded-full h-2">
        <div
          className="bg-walrus-mint h-2 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
