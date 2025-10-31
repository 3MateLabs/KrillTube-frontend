import { NextRequest, NextResponse } from 'next/server'

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: videoId } = await params
  const refCode = request.nextUrl.searchParams.get('ref')
  
  const userAgent = request.headers.get('user-agent') || ''
  const isBot = /bot|crawler|twitter|facebook|whatsapp|telegram|discord/i.test(userAgent)
  
  const xCardUrl = `${BASE_URL}/x-card/${videoId}${refCode ? `?ref=${refCode}` : ''}`
  const videoUrl = `${BASE_URL}/watch/${videoId}${refCode ? `?ref=${refCode}` : ''}`
  
  if (!isBot) {
    return NextResponse.redirect(videoUrl, 302)
  }
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      
      <!-- Twitter Player Card -->
      <meta name="twitter:card" content="player" />
      <meta name="twitter:site" content="@walplayer" />
      <meta name="twitter:title" content="Watch & Trade on X | WalPlayer" />
      <meta name="twitter:description" content="Stream encrypted videos and trade tokens directly on X" />
      <meta name="twitter:player" content="${xCardUrl}" />
      <meta name="twitter:player:width" content="800" />
      <meta name="twitter:player:height" content="1500" />
      <meta name="twitter:image" content="${BASE_URL}/preview-image.png" />
      
      <!-- Open Graph -->
      <meta property="og:title" content="Watch & Trade on X | WalPlayer" />
      <meta property="og:description" content="Stream encrypted videos and trade tokens directly on X" />
      <meta property="og:image" content="${BASE_URL}/preview-image.png" />
      <meta property="og:url" content="${videoUrl}" />
      <meta property="og:type" content="video.other" />
      
      <!-- Cache Control -->
      <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">
      <meta name="twitter:dnt" content="on">
      
      <title>WalPlayer - Video ${videoId}</title>
      
      <!-- Fallback redirect -->
      <script>
        setTimeout(function() {
          if (window.self === window.top) {
            window.location.replace("${videoUrl}");
          }
        }, 100);
      </script>
    </head>
    <body>
      <div style="padding: 20px; text-align: center; font-family: system-ui, -apple-system, sans-serif;">
        <h1>Loading WalPlayer...</h1>
        <p>If you're not redirected, <a href="${videoUrl}">click here</a></p>
      </div>
    </body>
    </html>
  `
  
  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    }
  })
}