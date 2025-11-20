import { type LoaderFunctionArgs, type ActionFunctionArgs, redirect, useLoaderData, Form, useNavigation, useActionData } from "react-router";
import { getUser } from "../server/user";
import { prisma } from "../utils/db.server";
import { Ghost, Search, AlertCircle } from "lucide-react";
import { useState, useEffect } from "react";

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await getUser(request);
  if (!user) {
    return redirect("/login");
  }

  // Get current user to check if they're a ghost and if they've already claimed
  const currentUser = await prisma.user.findUnique({
    where: { id: user.id },
    include: {
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

  if (!currentUser || currentUser.ghost) {
    return redirect("/dashboard");
  }

  // Get all unclaimed ghost users (where claimedById is null)
  const ghostUsers = await prisma.user.findMany({
    where: { 
      ghost: true,
      claimedById: null,
    },
    include: {
      wonGames: true,
      lostGames: true,
    },
    orderBy: {
      email: "asc",
    },
  });

  return { user: currentUser, ghostUsers };
}

export async function action({ request }: ActionFunctionArgs) {
  const user = await getUser(request);
  if (!user) {
    return redirect("/login");
  }

  const formData = await request.formData();
  const actionType = formData.get("actionType") as string;
  const ghostUserId = formData.get("ghostUserId") as string;
  const masterPassword = formData.get("masterPassword") as string;

  // Handle confirmation with master password
  if (actionType === "confirm") {
    if (!ghostUserId) {
      return { error: "No ghost user selected", ghostUserId: null };
    }

    // Verify master password
    const expectedPassword = process.env.MASTER_PASSWORD || "changeme";
    if (masterPassword !== expectedPassword) {
      return { error: "Invalid master password", ghostUserId };
    }

    // Verify current user is not a ghost and hasn't claimed yet
    const currentUser = await prisma.user.findUnique({
      where: { id: user.id },
      include: {
        hasClaimed: true,
      },
    });

    if (!currentUser || currentUser.ghost) {
      return { error: "Ghost users cannot claim other ghost users", ghostUserId: null };
    }

    if (currentUser.hasClaimed) {
      return { error: "You have already claimed a ghost user", ghostUserId: null };
    }

    // Verify ghost user exists, is a ghost, and hasn't been claimed
    const ghostUser = await prisma.user.findUnique({
      where: { id: ghostUserId },
      include: {
        wonGames: true,
        lostGames: true,
      },
    });

    if (!ghostUser || !ghostUser.ghost) {
      return { error: "Invalid ghost user", ghostUserId: null };
    }

    if (ghostUser.claimedById) {
      return { error: "This ghost user has already been claimed", ghostUserId: null };
    }

    // Use a transaction to ensure atomicity
    await prisma.$transaction(async (tx) => {
      // Update all games where ghost user was winner
      await tx.game.updateMany({
        where: { winnerId: ghostUserId },
        data: { winnerId: user.id },
      });

      // Update all games where ghost user was loser
      await tx.game.updateMany({
        where: { loserId: ghostUserId },
        data: { loserId: user.id },
      });

      // Update ghost user to mark as claimed
      await tx.user.update({
        where: { id: ghostUserId },
        data: { claimedById: user.id },
      });

      // Update current user to mark that they've claimed
      await tx.user.update({
        where: { id: user.id },
        data: { hasClaimed: { connect: { id: ghostUserId } } },
      });

      // Update ghost user to mark as claimed
      await tx.user.update({
        where: { id: ghostUserId },
        data: { claimedBy: { connect: { id: user.id } } },
      });
    });

    return redirect("/profile");
  }

  // Initial claim request - return confirmation screen
  if (!ghostUserId) {
    return { error: "No ghost user selected", ghostUserId: null };
  }

  // Verify current user hasn't claimed yet
  const currentUser = await prisma.user.findUnique({
    where: { id: user.id },
    include: {
      hasClaimed: true,
    },
  });

  if (!currentUser || currentUser.ghost) {
    return { error: "Ghost users cannot claim other ghost users", ghostUserId: null };
  }

  if (currentUser.hasClaimed) {
    return { error: "You have already claimed a ghost user", ghostUserId: null };
  }

  // Verify ghost user exists, is a ghost, and hasn't been claimed
  const ghostUser = await prisma.user.findUnique({
    where: { id: ghostUserId },
  });

  if (!ghostUser || !ghostUser.ghost) {
    return { error: "Invalid ghost user", ghostUserId: null };
  }

  if (ghostUser.claimedById) {
    return { error: "This ghost user has already been claimed", ghostUserId: null };
  }

  return { ghostUserId, requiresConfirmation: true };
}

export default function ClaimGhost() {
  const { user, ghostUsers } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedGhostId, setSelectedGhostId] = useState<string | null>(
    actionData?.ghostUserId || null
  );
  const [masterPassword, setMasterPassword] = useState("");
  const [error, setError] = useState<string | null>(actionData?.error || null);

  // Check if user has already claimed
  const hasAlreadyClaimed = user.hasClaimed !== null;

  // Show confirmation if we have a selected ghost or action returned one
  const showConfirmation = selectedGhostId !== null;
  const confirmationError = error || actionData?.error || null;

  const filteredGhostUsers = ghostUsers.filter((ghost) => {
    const search = searchTerm.toLowerCase();
    return (
      ghost.email.toLowerCase().includes(search) ||
      (ghost.name && ghost.name.toLowerCase().includes(search)) ||
      (ghost.gamertag && ghost.gamertag.toLowerCase().includes(search))
    );
  });

  const getUserDisplayName = (ghost: typeof ghostUsers[0]) => {
    return ghost.gamertag || ghost.name || ghost.email.split("@")[0];
  };

  const handleCancel = () => {
    setSelectedGhostId(null);
    setError(null);
    setMasterPassword("");
  };

  // Find selected ghost - check both ghostUsers list and actionData
  const selectedGhost = selectedGhostId 
    ? ghostUsers.find((g) => g.id === selectedGhostId) || null
    : null;
  
  // If we have a ghostUserId from action but can't find it in the list, 
  // it might have been claimed - show error
  if (actionData?.ghostUserId && !selectedGhost && showConfirmation) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-blue-900 overflow-x-hidden">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          <div className="bg-red-500/20 border-2 border-red-500/50 rounded-xl p-6 text-center">
            <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <p className="text-lg font-semibold text-red-300 mb-2">
              Ghost user no longer available
            </p>
            <p className="text-red-400 mb-4">
              This ghost user may have been claimed by someone else.
            </p>
            <button
              onClick={handleCancel}
              className="bg-gray-700 hover:bg-gray-600 text-gray-100 font-medium 
                         px-6 py-3 rounded-xl border-2 border-gray-600 
                         transform hover:scale-105 transition-all duration-200"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Initialize selectedGhostId from action data if present
  useEffect(() => {
    if (actionData?.ghostUserId && !selectedGhostId) {
      setSelectedGhostId(actionData.ghostUserId);
    }
    if (actionData?.error) {
      setError(actionData.error);
    }
  }, [actionData, selectedGhostId]);

  // Show confirmation screen
  if (showConfirmation && selectedGhost) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-blue-900 overflow-x-hidden">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-50 mb-2 flex items-center gap-2 sm:gap-3">
              <Ghost className="w-6 h-6 sm:w-8 sm:h-8 lg:w-10 lg:h-10 text-orange-500 flex-shrink-0" />
              <span>Confirm Claim</span>
            </h1>
            <p className="text-sm sm:text-base text-gray-400 break-words">
              Please confirm you want to claim this ghost user
            </p>
          </div>

          {/* Warning Alert */}
          <div className="bg-red-500/20 border-2 border-red-500/50 rounded-xl p-4 mb-6 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-red-300">
              <p className="font-semibold mb-1">This action cannot be undone!</p>
              <p>
                All games from this ghost user will be transferred to your account permanently.
              </p>
            </div>
          </div>

          {/* Ghost User Info */}
          <div className="bg-gradient-to-br from-gray-800 to-blue-900 rounded-2xl p-6 border-2 border-gray-700 shadow-xl mb-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-orange-500/20 rounded-full flex items-center justify-center border-2 border-orange-500/50">
                <Ghost className="w-6 h-6 text-orange-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-100">
                  {getUserDisplayName(selectedGhost)}
                </h3>
                <p className="text-sm text-gray-400">{selectedGhost.email}</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-green-400">{selectedGhost.wonGames.length}</div>
                <div className="text-xs text-gray-400">Wins</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-red-400">{selectedGhost.lostGames.length}</div>
                <div className="text-xs text-gray-400">Losses</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-300">{selectedGhost.wonGames.length + selectedGhost.lostGames.length}</div>
                <div className="text-xs text-gray-400">Total Games</div>
              </div>
            </div>
          </div>

          {/* Master Password Form */}
          <Form method="post" className="space-y-4">
            <input type="hidden" name="actionType" value="confirm" />
            <input type="hidden" name="ghostUserId" value={selectedGhostId} />
            
            <div>
              <label className="block text-sm font-semibold text-gray-400 mb-2">
                Master Password
              </label>
              <input
                type="password"
                name="masterPassword"
                value={masterPassword}
                onChange={(e) => {
                  setMasterPassword(e.target.value);
                  setError(null);
                }}
                className="w-full bg-gray-800 border-2 border-gray-700 rounded-xl px-4 py-3 
                           text-gray-100 placeholder-gray-500 focus:outline-none 
                           focus:border-orange-500 focus:ring-2 focus:ring-orange-500/50 
                           transition-all duration-200"
                placeholder="Enter master password"
                autoFocus
              />
              {confirmationError && (
                <p className="text-red-400 text-sm mt-2">{confirmationError}</p>
              )}
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={isSubmitting || !masterPassword}
                className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-semibold 
                           px-6 py-3 rounded-xl shadow-lg shadow-orange-500/50 
                           transform hover:scale-105 transition-all duration-200
                           disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {isSubmitting ? "Claiming..." : "Confirm Claim"}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                disabled={isSubmitting}
                className="bg-gray-700 hover:bg-gray-600 text-gray-100 font-medium 
                           px-6 py-3 rounded-xl border-2 border-gray-600 
                           transform hover:scale-105 transition-all duration-200
                           disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
            </div>
          </Form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-blue-900 overflow-x-hidden">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-50 mb-2 flex items-center gap-2 sm:gap-3">
            <Ghost className="w-6 h-6 sm:w-8 sm:h-8 lg:w-10 lg:h-10 text-orange-500 flex-shrink-0" />
            <span>Claim Ghost User</span>
          </h1>
          <p className="text-sm sm:text-base text-gray-400 break-words">
            Claim a ghost user to transfer all their games to your account
          </p>
        </div>

        {/* Already Claimed Alert */}
        {hasAlreadyClaimed && user.hasClaimed && (
          <div className="bg-green-500/20 border-2 border-green-500/50 rounded-xl p-4 mb-6 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-green-300">
              <p className="font-semibold mb-1">You have already claimed a ghost user</p>
              <p>
                You claimed: <span className="font-semibold">{user.hasClaimed.gamertag || user.hasClaimed.name || user.hasClaimed.email.split("@")[0]}</span>
              </p>
            </div>
          </div>
        )}

        {/* Info Alert */}
        <div className="bg-blue-500/20 border-2 border-blue-500/50 rounded-xl p-4 mb-6 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-300">
            <p className="font-semibold mb-1">What is a ghost user?</p>
            <p>
              Ghost users are accounts from the previous database. When you claim a ghost user, all their games will be transferred to your account. 
              This action cannot be undone. You can only claim one ghost user.
            </p>
          </div>
        </div>


        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by email, name, or gamertag..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-gray-800 border-2 border-gray-700 rounded-xl px-4 py-3 pl-12 
                         text-gray-100 placeholder-gray-500 focus:outline-none 
                         focus:border-orange-500 focus:ring-2 focus:ring-orange-500/50 
                         transition-all duration-200"
            />
          </div>
        </div>

        {/* Ghost Users List */}
        {filteredGhostUsers.length === 0 ? (
          <div className="bg-gradient-to-br from-gray-800 to-blue-900 rounded-2xl p-8 border-2 border-gray-700 shadow-xl text-center">
            <Ghost className="w-16 h-16 text-gray-500 mx-auto mb-4" />
            <p className="text-xl text-gray-400 mb-2">
              {searchTerm ? "No ghost users found" : "No ghost users available"}
            </p>
            <p className="text-gray-500">
              {searchTerm 
                ? "Try a different search term" 
                : "All ghost users have been claimed or there are no ghost users in the system"}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredGhostUsers.map((ghost) => {
              const totalGames = ghost.wonGames.length + ghost.lostGames.length;
              const displayName = getUserDisplayName(ghost);

              return (
                <div
                  key={ghost.id}
                  className="bg-gradient-to-br from-gray-800 to-blue-900 rounded-xl p-6 border-2 border-gray-700 shadow-lg hover:border-orange-500/50 transition-all duration-200"
                >
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-12 h-12 bg-orange-500/20 rounded-full flex items-center justify-center border-2 border-orange-500/50 flex-shrink-0">
                          <Ghost className="w-6 h-6 text-orange-400" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="text-lg font-bold text-gray-100 break-words">
                            {displayName}
                          </h3>
                          <p className="text-sm text-gray-400 break-words overflow-wrap-anywhere">
                            {ghost.email}
                          </p>
                        </div>
                      </div>
                      <div className="ml-15 mt-3 flex gap-4 text-sm text-gray-400">
                        <span>
                          <span className="font-semibold text-green-400">{ghost.wonGames.length}</span> wins
                        </span>
                        <span>
                          <span className="font-semibold text-red-400">{ghost.lostGames.length}</span> losses
                        </span>
                        <span>
                          <span className="font-semibold text-gray-300">{totalGames}</span> total games
                        </span>
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      <Form method="post">
                        <input type="hidden" name="ghostUserId" value={ghost.id} />
                        <button
                          type="submit"
                          disabled={isSubmitting || hasAlreadyClaimed}
                          className="bg-orange-500 hover:bg-orange-600 text-white font-semibold 
                                     px-6 py-3 rounded-xl shadow-lg shadow-orange-500/50 
                                     transform hover:scale-105 transition-all duration-200
                                     disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                        >
                          Claim
                        </button>
                      </Form>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

