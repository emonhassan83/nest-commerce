import 'dotenv/config';
import { PrismaClient, UserRole, UserStatus } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import bcrypt from 'bcrypt';

async function seedAdmin(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    console.error('❌ [Seed Error] DATABASE_URL is missing in environment variables.');
    process.exit(1);
  }

  const adminEmail = (process.env.ADMIN_EMAIL || 'admin@example.com').trim().toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD || 'Admin1234!';
  const adminName = process.env.ADMIN_NAME || 'Super Admin';
  const adminPhone = process.env.ADMIN_PHONE || '+8801700000000';

  console.log('🌱 [Admin Seed] Starting admin user seeding...');
  console.log(`📧 Target Email: ${adminEmail}`);

  const pool = new pg.Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    await prisma.$connect();

    const existingUser = await prisma.user.findUnique({
      where: { email: adminEmail },
    });

    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(adminPassword, saltRounds);

    if (existingUser) {
      console.log(
        `ℹ️ User with email "${adminEmail}" already exists. Ensuring ADMIN role and active status...`,
      );
      const updatedAdmin = await prisma.user.update({
        where: { email: adminEmail },
        data: {
          name: existingUser.name || adminName,
          role: UserRole.ADMIN,
          status: UserStatus.ACTIVE,
          password: hashedPassword,
        },
      });

      console.log('✅ [Admin Seed] Existing user successfully updated to ADMIN:');
      console.table([
        {
          id: updatedAdmin.id,
          name: updatedAdmin.name,
          email: updatedAdmin.email,
          role: updatedAdmin.role,
          status: updatedAdmin.status,
        },
      ]);
    } else {
      const newAdmin = await prisma.user.create({
        data: {
          email: adminEmail,
          password: hashedPassword,
          name: adminName,
          phoneNumber: adminPhone,
          role: UserRole.ADMIN,
          status: UserStatus.ACTIVE,
        },
      });

      console.log('🎉 [Admin Seed] New admin user successfully created:');
      console.table([
        {
          id: newAdmin.id,
          name: newAdmin.name,
          email: newAdmin.email,
          role: newAdmin.role,
          status: newAdmin.status,
        },
      ]);
    }

    console.log('\n🔑 Login Credentials:');
    console.log(`   Email:    ${adminEmail}`);
    console.log(`   Password: ${adminPassword}\n`);
  } catch (error: any) {
    console.error('❌ [Admin Seed] Failed to seed admin user:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

seedAdmin();
