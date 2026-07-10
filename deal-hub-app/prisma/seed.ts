// Seed reviewable fixtures (PRD §0.6). A PRD is not a data source, so only the
// structural fixtures are seeded here; real figures arrive through the pipeline
// with citations. RVM (IL/ILS) and Net Core (data_grade Inferred) are the
// acceptance fixtures.
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  await prisma.user.upsert({ where: { email: 'amit@kochavii.com' }, update: {},
    create: { name: 'Amit', email: 'amit@kochavii.com', role: 'Full' } });
  await prisma.user.upsert({ where: { email: 'tal@starwell.example' }, update: {},
    create: { name: 'Tal Raif', email: 'tal@starwell.example', role: 'Full' } });

  const count = await prisma.deal.count();
  if (count === 0) {
    await prisma.deal.create({
      data: {
        projectName: 'Example MSP — Southeast', status: 'Underwriting', dealLead: 'Amit',
        priority: 'Medium', dealType: 'Roll-up', industry: 'IT Services', subIndustry: 'MSP',
        revenueM: 8.4, ebitdaM: 1.9, evM: 8.55, valuationBasis: 'LTM EBITDA',
        businessProfile: 'Managed IT services provider serving SMB clients across the US Southeast.',
      },
    });
    await prisma.deal.create({
      data: {
        projectName: 'RVM Systems (1998) Ltd.', status: 'IC', dealLead: 'Amit',
        dealType: 'Value', industry: 'IT Services', jurisdiction: 'IL', currency: 'ILS',
        valuationBasis: 'LTM EBITDA', businessProfile: 'Module R acceptance fixture (IL / ILS).',
      },
    });
    await prisma.deal.create({
      data: {
        projectName: 'Net Core', status: 'Underwriting', dealLead: 'Tal',
        dealType: 'Growth', industry: 'IT Services',
        businessProfile: 'Module PC composer fixture — data_grade Inferred; its “—” values are load-bearing.',
      },
    });
  }
  console.log('Seed complete.');
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
