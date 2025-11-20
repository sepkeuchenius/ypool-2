import { type ActionFunctionArgs, type LoaderFunctionArgs, redirect, useActionData, useLoaderData, Form, useNavigation } from "react-router";
import { getUser } from "../server/user";
import { prisma } from "../utils/db.server";
import { Trophy, Users, Plus, CheckCircle, XCircle } from "lucide-react";
import { useState } from "react";

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await getUser(request);
  if (!user) {
    return redirect("/login");
  }

  // Get all users except the current user for opponent selection
  const opponents = await prisma.user.findMany({
    where: {
      id: {
        not: user.id,
      },
    },
    select: {
      id: true,
      email: true,
      name: true,
      gamertag: true,
    },
    orderBy: {
      gamertag: "asc",
    },
  });

  return { user, opponents };
}

export async function action({ request }: ActionFunctionArgs) {
  const user = await getUser(request);
  if (!user) {
    return redirect("/login");
  }

  const formData = await request.formData();
  const opponentId = formData.get("opponentId");
  const userWon = formData.get("userWon") === "true";

  if (!opponentId) {
    return {
      error: "Please select an opponent",
    };
  }

  const winnerId = userWon ? user.id : (opponentId as string);
  const loserId = userWon ? (opponentId as string) : user.id;

  const game = await prisma.game.create({
    data: {
      winnerId,
      loserId,
    },
  });

  return redirect("/dashboard");
}

export default function NewGame() {
  const { user, opponents } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";
  const [userWon, setUserWon] = useState(true);
  const [selectedOpponent, setSelectedOpponent] = useState("");

  const getOpponentName = (opponent: { gamertag?: string | null; name?: string | null; email: string }) => {
    return opponent.gamertag || opponent.name || opponent.email.split("@")[0];
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-blue-900 overflow-x-hidden">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-50 mb-2 flex items-center gap-2 sm:gap-3 break-words">
            <Plus className="w-6 h-6 sm:w-8 sm:h-8 lg:w-10 lg:h-10 text-orange-500 flex-shrink-0" />
            <span>New Game</span>
          </h1>
          <p className="text-sm sm:text-base text-gray-400 break-words">
            Record a new game result
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-gradient-to-br from-gray-800 to-blue-900 rounded-2xl p-6 sm:p-8 border-2 border-gray-700 shadow-xl">
          <Form method="post" className="space-y-6">
            {/* Error Message */}
            {actionData?.error && (
              <div className="bg-red-500/20 border-2 border-red-500/50 rounded-xl p-4 text-red-400">
                <p className="font-semibold">{actionData.error}</p>
              </div>
            )}

            {/* Opponent Selection */}
            <div>
              <label className="block text-sm font-semibold text-gray-400 mb-3">
                <Users className="w-5 h-5 inline mr-2" />
                Select Opponent
              </label>
              <select
                name="opponentId"
                value={selectedOpponent}
                onChange={(e) => setSelectedOpponent(e.target.value)}
                required
                className="w-full bg-gray-900 border-2 border-gray-700 rounded-xl px-4 py-3 
                         text-gray-100 focus:outline-none focus:border-orange-500 focus:ring-2 
                         focus:ring-orange-500/50 transition-all duration-200
                         appearance-none cursor-pointer"
              >
                <option value="">Choose an opponent...</option>
                {opponents.map((opponent) => (
                  <option key={opponent.id} value={opponent.id}>
                    {getOpponentName(opponent)}
                  </option>
                ))}
              </select>
              {opponents.length === 0 && (
                <p className="mt-2 text-sm text-gray-500">
                  No other players found. Invite friends to start playing!
                </p>
              )}
            </div>

            {/* Win/Loss Toggle */}
            <div>
              <label className="block text-sm font-semibold text-gray-400 mb-3">
                Game Result
              </label>
              <div className="flex items-center gap-4">
                {/* Toggle Switch */}
                <div className="flex-1">
                  <input
                    type="hidden"
                    name="userWon"
                    value={userWon.toString()}
                  />
                  <button
                    type="button"
                    onClick={() => setUserWon(!userWon)}
                    className={`relative h-14 w-full rounded-xl border-2 transition-colors duration-300 overflow-hidden ${
                      userWon
                        ? "bg-green-500/20 border-green-500/50"
                        : "bg-red-500/20 border-red-500/50"
                    }`}
                  >
                    <div className="absolute inset-0 flex items-center">
                      <span
                        className={`h-12 w-12 rounded-lg transition-all duration-300 ease-in-out flex items-center justify-center ${
                          userWon 
                            ? "bg-green-500 ml-1" 
                            : "bg-red-500 ml-auto mr-1"
                        }`}
                      >
                        {userWon ? (
                          <CheckCircle className="w-6 h-6 text-white" />
                        ) : (
                          <XCircle className="w-6 h-6 text-white" />
                        )}
                      </span>
                    </div>
                  </button>
                </div>

                {/* Result Display */}
                <div className="flex-1">
                  <div
                    className={`rounded-xl p-4 border-2 transition-all duration-300 ${
                      userWon
                        ? "bg-green-500/20 border-green-500/50"
                        : "bg-red-500/20 border-red-500/50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {userWon ? (
                        <>
                          <Trophy className="w-6 h-6 text-green-400" />
                          <div>
                            <div className="font-bold text-green-400 text-lg">Victory!</div>
                            <div className="text-sm text-gray-400">You won this game</div>
                          </div>
                        </>
                      ) : (
                        <>
                          <XCircle className="w-6 h-6 text-red-400" />
                          <div>
                            <div className="font-bold text-red-400 text-lg">Defeat</div>
                            <div className="text-sm text-gray-400">You lost this game</div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex gap-4 pt-4">
              <button
                type="submit"
                disabled={isSubmitting || !selectedOpponent}
                className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-semibold 
                         px-6 py-4 rounded-xl shadow-lg shadow-orange-500/50 
                         transform hover:scale-105 hover:-rotate-1 transition-all duration-200
                         disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
                         flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>Recording...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    <span>Record Game</span>
                  </>
                )}
              </button>
            </div>
          </Form>
        </div>

        {/* Info Card */}
        <div className="mt-6 bg-gray-800/50 border border-gray-700 rounded-xl p-4">
          <p className="text-sm text-gray-400">
            <strong className="text-gray-300">Tip:</strong> Make sure to select the correct opponent and game result. 
            This will be recorded in your game history and affect your statistics.
          </p>
        </div>
      </div>
    </div>
  );
}
