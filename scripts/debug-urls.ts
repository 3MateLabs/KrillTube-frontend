import { prisma } from '../lib/db';

async function main() {
  const videos = await prisma.video.findMany({
    take: 1,
    orderBy: { createdAt: 'desc' },
    include: {
      renditions: {
        include: {
          segments: true // Get ALL segments, not just 3
        }
      }
    }
  });

  for (const video of videos) {
    console.log('\n=== VIDEO ===');
    console.log('ID:', video.id);
    console.log('Title:', video.title);
    console.log('Master URI:', video.walrusMasterUri);
    console.log('Created:', video.createdAt);

    for (const rendition of video.renditions) {
      console.log(`\n  RENDITION: ${rendition.name}`);
      console.log('  Playlist URI:', rendition.walrusPlaylistUri);
      console.log(`  Total Segments: ${rendition.segments.length}`);

      if (rendition.segments.length === 0) {
        console.log('  ⚠️ WARNING: This rendition has NO segments!');
      } else {
        console.log(`\n  First 3 segments:`);
        for (const segment of rendition.segments.slice(0, 3)) {
          console.log(`    Segment ${segment.segIdx}:`);
          console.log(`      URI: ${segment.walrusUri}`);
          console.log(`      IV: ${segment.iv ? 'Present' : 'MISSING'}`);
        }

        if (rendition.segments.length > 3) {
          console.log(`\n  ... and ${rendition.segments.length - 3} more segments`);
        }
      }
    }
  }
}

main().finally(() => prisma.$disconnect());
