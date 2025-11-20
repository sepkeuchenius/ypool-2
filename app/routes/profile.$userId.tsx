import { type LoaderFunctionArgs, redirect, useLoaderData } from "react-router";
import { getUser } from "../server/user";
import { prisma } from "../utils/db.server";
import { ProfileInfo } from "../components/ProfileInfo";
import { ProfileStats } from "../components/ProfileStats";
import { Ghost } from "lucide-react";

export async function loader({ request, params }: LoaderFunctionArgs) {
  const currentUser = await getUser(request);
  if (!currentUser) {
    return redirect("/login");
  }

  const userId = params.userId;
  if (!userId) {
    return redirect("/profile");
  }

  // Don't allow viewing own profile through this route
  if (userId === currentUser.id) {
    return redirect("/profile");
  }

  const userWithGames = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      wonGames: true,
      lostGames: true,
      hasClaimed: {
        select: {
          id: true,
          email: true,
          name: true,
          gamertag: true,
        },
      },
    },
  });

  if (!userWithGames) {
    return redirect("/dashboard");
  }

  return { user: userWithGames };
}

export default function ViewProfile() {
  const { user } = useLoaderData<typeof loader>();

  const wonGames = "wonGames" in user && Array.isArray(user.wonGames) ? user.wonGames : [];
  const lostGames = "lostGames" in user && Array.isArray(user.lostGames) ? user.lostGames : [];

  const getUserName = (user: { gamertag?: string | null; name?: string | null; email: string }) => {
    return user.gamertag || user.name || user.email.split("@")[0];
  };

  const getClaimedUserName = () => {
    if (!user.hasClaimed) return null;
    return user.hasClaimed.gamertag || user.hasClaimed.name || user.hasClaimed.email.split("@")[0];
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-blue-900 overflow-x-hidden">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-100 mb-2">
            {getUserName(user)}'s Profile
          </h1>
          <p className="text-sm sm:text-base text-gray-400 break-words">View profile information and statistics</p>
        </div>

        {/* Claimed Ghost User Info */}
        {user.hasClaimed && (
          <div className="bg-green-500/20 border-2 border-green-500/50 rounded-xl p-4 mb-6 flex items-start gap-3">
            <Ghost className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-green-300">
              <p className="font-semibold mb-1">Claimed Ghost User</p>
              <p>
                This user has claimed the ghost user: <span className="font-semibold">{getClaimedUserName()}</span>
              </p>
            </div>
          </div>
        )}

        {/* Profile Card */}
        <div className="bg-gradient-to-br from-gray-800 to-blue-900 rounded-2xl p-8 border-2 border-gray-700 shadow-xl">
          <ProfileInfo 
            email={user.email}
            name={user.name}
            gamertag={user.gamertag}
          />
        </div>

        {/* Stats Card */}
        <div className="mt-8">
          <ProfileStats wins={wonGames.length} losses={lostGames.length} />
        </div>
      </div>
    </div>
  );
}
