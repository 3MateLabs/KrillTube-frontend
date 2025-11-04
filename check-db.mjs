import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const video = await prisma.video.findFirst({
    select: {
      id: true,
      network: true,
      title: true,
      createdAt: true,
    }
  });
  
  console.log('Video sample:', video);
  console.log('\nNetwork field exists:', video && 'network' in video ? '✅ YES' : '❌ NO');
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error('Error:', e.message);
    prisma.$disconnect();
  });
