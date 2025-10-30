import { prisma } from '../lib/db';

async function main() {
  const videos = await prisma.video.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      renditions: {
        include: {
          segments: true
        }
      }
    }
  });

  console.log(`Total videos: ${videos.length}\n`);

  for (const video of videos) {
    console.log(`Video: ${video.title}`);
    console.log(`  ID: ${video.id}`);
    console.log(`  Created: ${video.createdAt}`);
    console.log(`  Renditions: ${video.renditions.length}`);

    for (const rendition of video.renditions) {
      console.log(`    ${rendition.name}: ${rendition.segments.length} segments`);
    }
    console.log('');
  }
}

main().finally(() => prisma.$disconnect());
