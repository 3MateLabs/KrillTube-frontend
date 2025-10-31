'use client';

import { useState } from 'react';

export default function TestCompilePage() {
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (msg: string) => {
    console.log(msg);
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${msg}`]);
  };

  const testFFmpegMinimal = async () => {
    setStatus('Starting test with video from public folder...');
    setError('');
    setLogs([]);

    try {
      addLog('Loading video from public folder...');
      const videoUrl = '/uploads/2025-10-30 21-02-35.mp4';

      const response = await fetch(videoUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch video: ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const videoData = new Uint8Array(arrayBuffer);
      addLog(`✓ Video loaded: ${(videoData.length / 1024).toFixed(2)} KB`);

      // Create a mock File object
      const file = new File([videoData], '2025-10-30 21-02-35.mp4', { type: 'video/mp4' });

      // Run the same tests
      await testWithFileInput(file);

    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      addLog(`❌ ERROR: ${errMsg}`);
      setError(errMsg);
      setStatus('❌ Test failed');
      console.error('Full error:', err);
    }
  };

  const testWithFileInput = async (file: File) => {
    setStatus('Starting test with uploaded file...');
    setError('');
    setLogs([]);

    try {
      addLog(`Testing file: ${file.name} (${(file.size / 1024).toFixed(2)} KB)`);

      addLog('Loading FFmpeg...');
      const { FFmpeg } = await import('@ffmpeg/ffmpeg');
      const { toBlobURL } = await import('@ffmpeg/util');

      const ffmpeg = new FFmpeg();

      ffmpeg.on('log', ({ message }) => {
        addLog(`[FFmpeg] ${message}`);
      });

      addLog('Loading FFmpeg core files...');
      const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';

      await ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
      });

      addLog('✓ FFmpeg loaded');

      // Read file as Uint8Array
      addLog('Reading file into memory...');
      const arrayBuffer = await file.arrayBuffer();
      const videoData = new Uint8Array(arrayBuffer);

      addLog(`✓ File read: ${(videoData.length / 1024).toFixed(2)} KB`);

      // Write to FFmpeg
      addLog('Writing file to FFmpeg virtual filesystem...');
      await ffmpeg.writeFile('input.mp4', videoData);
      addLog('✓ File written to FFmpeg');

      // TEST 1: Probe video info
      addLog('\n=== TEST 1: Probe video info ===');
      try {
        await ffmpeg.exec(['-i', 'input.mp4', '-f', 'null', '-']);
        addLog('✓ Probe successful');
      } catch (e) {
        addLog(`❌ Probe failed: ${e}`);
        throw e;
      }

      // TEST 2: Try different preset settings
      addLog('\n=== TEST 2: Transcode with ultrafast preset ===');
      try {
        await ffmpeg.exec([
          '-i', 'input.mp4',
          '-vf', 'scale=640:360',
          '-c:v', 'libx264',
          '-preset', 'ultrafast',
          '-b:v', '800k',
          '-c:a', 'aac',
          '-b:a', '128k',
          '-f', 'hls',
          '-hls_time', '4',
          '-hls_playlist_type', 'vod',
          '-hls_segment_type', 'fmp4',
          '-hls_segment_filename', 'seg_ultra_%d.m4s',
          '-hls_fmp4_init_filename', 'init_ultra.mp4',
          'output_ultra.m3u8'
        ]);
        addLog('✓ Ultrafast transcode complete');

        // Try reading one segment
        const testSeg = await ffmpeg.readFile('seg_ultra_0.m4s');
        addLog(`✓ Read segment: ${(testSeg.length / 1024).toFixed(2)} KB`);

        // Clean up
        await ffmpeg.deleteFile('seg_ultra_0.m4s');
        addLog('✓ Cleanup successful');

      } catch (e) {
        addLog(`❌ Ultrafast transcode failed: ${e}`);
        throw e;
      }

      // TEST 3: Try with superfast preset (slightly better quality, still fast)
      addLog('\n=== TEST 3: Transcode with superfast preset ===');
      try {
        await ffmpeg.exec([
          '-i', 'input.mp4',
          '-vf', 'scale=640:360',
          '-c:v', 'libx264',
          '-preset', 'superfast',
          '-b:v', '800k',
          '-c:a', 'aac',
          '-b:a', '128k',
          '-f', 'hls',
          '-hls_time', '4',
          '-hls_playlist_type', 'vod',
          '-hls_segment_type', 'fmp4',
          '-hls_segment_filename', 'seg_super_%d.m4s',
          '-hls_fmp4_init_filename', 'init_super.mp4',
          'output_super.m3u8'
        ]);
        addLog('✓ Superfast transcode complete');
      } catch (e) {
        addLog(`❌ Superfast transcode failed: ${e}`);
        throw e;
      }

      // TEST 4: Try reading all segments to check for memory issues
      addLog('\n=== TEST 4: Reading all segments ===');
      try {
        const initData = await ffmpeg.readFile('init_super.mp4');
        addLog(`✓ Init segment: ${(initData.length / 1024).toFixed(2)} KB`);

        let segIdx = 0;
        while (true) {
          try {
            const segData = await ffmpeg.readFile(`seg_super_${segIdx}.m4s`);
            addLog(`✓ Segment ${segIdx}: ${(segData.length / 1024).toFixed(2)} KB`);

            // Immediately delete to free memory
            await ffmpeg.deleteFile(`seg_super_${segIdx}.m4s`);

            segIdx++;
          } catch {
            break;
          }
        }

        addLog(`✓ Total segments: ${segIdx}`);
      } catch (e) {
        addLog(`❌ Reading segments failed: ${e}`);
        throw e;
      }

      setStatus('✅ ALL TESTS PASSED! No memory errors detected.');

    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      addLog(`\n❌ FAILED: ${errMsg}`);
      setError(errMsg);
      setStatus('❌ Test failed - check console logs');
      console.error('Full error:', err);

      // Log stack trace if available
      if (err instanceof Error && err.stack) {
        console.error('Stack trace:', err.stack);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-4">FFmpeg Transcode Test</h1>
        <p className="text-gray-400 mb-8">
          Testing different FFmpeg approaches to find what works without memory errors
        </p>

        <div className="space-y-4 mb-8">
          <button
            onClick={testFFmpegMinimal}
            disabled={status.includes('Starting')}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Test with Video from /public/uploads
          </button>

          <div>
            <label className="block text-sm font-medium mb-2">
              Or upload a file to test:
            </label>
            <input
              type="file"
              accept="video/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) testWithFileInput(file);
              }}
              disabled={status.includes('Starting')}
              className="block w-full text-sm text-gray-400
                file:mr-4 file:py-2 file:px-4
                file:rounded file:border-0
                file:text-sm file:font-semibold
                file:bg-blue-600 file:text-white
                hover:file:bg-blue-700
                file:cursor-pointer
                disabled:opacity-50"
            />
          </div>
        </div>

        {status && (
          <div className={`p-4 rounded-lg mb-4 ${
            status.includes('✅') ? 'bg-green-900/50' :
            status.includes('❌') ? 'bg-red-900/50' :
            'bg-blue-900/50'
          }`}>
            <p className="font-semibold">{status}</p>
          </div>
        )}

        {error && (
          <div className="p-4 rounded-lg mb-4 bg-red-900/50 border border-red-500">
            <p className="font-semibold text-red-300">Error:</p>
            <pre className="text-sm mt-2 text-red-200 whitespace-pre-wrap">{error}</pre>
          </div>
        )}

        <div className="bg-gray-800 rounded-lg p-4">
          <h2 className="text-xl font-bold mb-3">Console Logs:</h2>
          <div className="space-y-1 max-h-[500px] overflow-y-auto font-mono text-sm">
            {logs.length === 0 ? (
              <p className="text-gray-500">No logs yet...</p>
            ) : (
              logs.map((log, idx) => (
                <div key={idx} className={`${
                  log.includes('ERROR') || log.includes('❌') ? 'text-red-400' :
                  log.includes('✓') ? 'text-green-400' :
                  log.includes('[FFmpeg]') ? 'text-blue-400' :
                  'text-gray-300'
                }`}>
                  {log}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
