import { prisma } from "../src/db/prisma";

async function main() {
  try {
    const result = await prisma.$queryRaw<{ now: Date }[]>`SELECT NOW() as now;`;
    console.log("数据库连接成功，当前时间：", result[0]?.now ?? "未知");
  } catch (error) {
    console.error("数据库连接失败：", error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

void main();
