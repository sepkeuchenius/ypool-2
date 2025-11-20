import { prisma } from "../../utils/db.server";
export async function loader() {
  const users = await prisma.user.findMany()
  return {
    users
  }
} 