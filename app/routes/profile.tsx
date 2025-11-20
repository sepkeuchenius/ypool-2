import { type LoaderFunctionArgs, type ActionFunctionArgs, redirect, useLoaderData, useNavigation, Link } from "react-router";
import { getUser } from "../server/user";
import { prisma } from "../utils/db.server";
import { ProfileStats } from "../components/ProfileStats";
import { GamertagEditor } from "../components/GamertagEditor";
import { Ghost } from "lucide-react";

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await getUser(request);
  if (!user) {
    return redirect("/login");
  }
  
  const userWithGames = await prisma.user.findUnique({
    where: { id: user.id },
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

  // Check if there are any unclaimed ghost users available
  const unclaimedGhostUserCount = await prisma.user.count({
    where: { 
      ghost: true,
      claimedById: null,
    },
  });
  
  return { 
    user: userWithGames || user, 
    hasGhostUsers: unclaimedGhostUserCount > 0,
    hasClaimed: userWithGames?.hasClaimed || null,
  };
}

export async function action({ request }: ActionFunctionArgs) {
  const user = await getUser(request);
  if (!user) {
    return redirect("/login");
  }

  const formData = await request.formData();
  const gamertag = formData.get("gamertag") as string;

  await prisma.user.update({
    where: { id: user.id },
    data: { gamertag: gamertag || null },
  });

  return redirect("/profile");
}

export default function Profile() {
  const { user, hasGhostUsers, hasClaimed } = useLoaderData<typeof loader>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  console.log(hasClaimed);
  
  const wonGames = "wonGames" in user && Array.isArray(user.wonGames) ? user.wonGames : [];
  const lostGames = "lostGames" in user && Array.isArray(user.lostGames) ? user.lostGames : [];

  const getClaimedUserName = () => {
    if (!hasClaimed) return null;
    return hasClaimed.gamertag || hasClaimed.name || hasClaimed.email.split("@")[0];
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-blue-900 overflow-x-hidden">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Description */}
        <div className="mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <p className="text-sm sm:text-base text-gray-400 break-words">Manage your profile and gamer tag</p>
          {hasGhostUsers && !hasClaimed && (
            <Link
              to="/claim-ghost"
              className="bg-orange-500 hover:bg-orange-600 text-white font-semibold 
                         px-4 py-2 rounded-xl shadow-lg shadow-orange-500/50 
                         transform hover:scale-105 transition-all duration-200
                         flex items-center gap-2 whitespace-nowrap"
            >
              <Ghost className="w-4 h-4" />
              Claim Ghost User
            </Link>
          )}
        </div>

        {/* Claimed Ghost User Info */}
        {hasClaimed && (
          <div className="bg-green-500/20 border-2 border-green-500/50 rounded-xl p-4 mb-6 flex items-start gap-3">
            <Ghost className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-green-300">
              <p className="font-semibold mb-1">Claimed Ghost User</p>
              <p>
                You have claimed the ghost user: <span className="font-semibold">{getClaimedUserName()}</span>
              </p>
            </div>
          </div>
        )}

        {/* Profile Card */}
        <div className="bg-gradient-to-br from-gray-800 to-blue-900 rounded-2xl p-8 border-2 border-gray-700 shadow-xl">
          <div className="space-y-6">
            {/* Email and Name */}
            <div>
              <label className="block text-sm font-semibold text-gray-400 mb-2">
                Email
              </label>
              <div className="bg-gray-900/50 border-2 border-gray-700 rounded-xl px-4 py-3 text-gray-300 break-words overflow-wrap-anywhere">
                {user.email}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-400 mb-2">
                Name
              </label>
              <div className="bg-gray-900/50 border-2 border-gray-700 rounded-xl px-4 py-3 text-gray-300 break-words">
                {user.name || "Not set"}
              </div>
            </div>

            {/* Gamer Tag Editor */}
            <div>
              <label className="block text-sm font-semibold text-gray-400 mb-2">
                Gamer Tag
              </label>
              <GamertagEditor gamertag={user.gamertag} isSubmitting={isSubmitting} />
            </div>
          </div>
        </div>

        {/* Stats Card */}
        <div className="mt-8">
          <ProfileStats wins={wonGames.length} losses={lostGames.length} />
        </div>
      </div>
    </div>
  );
}
