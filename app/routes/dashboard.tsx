import { type LoaderFunctionArgs, redirect, useLoaderData, useSearchParams, Link } from "react-router";
import { getUser } from "../server/user";
import { prisma } from "../utils/db.server";
import { Trophy, TrendingUp, Calendar, Users, Award, Target, Medal, SkullIcon } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { calcEloFromGames, calcEloHistory } from "../utils/calc_elo";
import { EloChart } from "../components/EloChart";
import moment from "moment";

type TimePeriod = "all" | "week" | "month" | "year";

function getTimeRange(period: TimePeriod, index: number = 0): [Date | null, Date | null] {
  const now = moment();
  switch (period) {
    case "week":
      return [
        now.clone().subtract(index, "weeks").startOf("week").toDate(),
        now.clone().subtract(index, "weeks").endOf("week").toDate(),
      ];
    case "month":
      return [
        now.clone().subtract(index, "months").startOf("month").toDate(),
        now.clone().subtract(index, "months").endOf("month").toDate(),
      ];
    case "year":
      return [
        now.clone().subtract(index, "years").startOf("year").toDate(),
        now.clone().subtract(index, "years").endOf("year").toDate(),
      ];
    case "all":
    default:
      return [null, null];
  }
}

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await getUser(request);
  if (!user) {
    return redirect("/login");
  }

  // Get time period and index from URL params
  const url = new URL(request.url);
  const period = (url.searchParams.get("period") || "all") as TimePeriod;
  const index = parseInt(url.searchParams.get("index") || "0", 10);
  const [startDate, endDate] = getTimeRange(period, index);

  // Fetch all games for ELO calculation
  const allGamesQuery: any = {
    orderBy: {
      timestamp: "asc",
    },
  };

  // Filter by date range if period is not "all"
  if (startDate && endDate) {
    allGamesQuery.where = {
      timestamp: {
        gte: startDate,
        lte: endDate,
      },
    };
  }

  const allGamesForElo = await prisma.game.findMany(allGamesQuery);

  // Calculate ELO rankings
  const eloRankings = calcEloFromGames(
    allGamesForElo.map((game) => ({
      winner: game.winnerId,
      loser: game.loserId,
      datetime: game.timestamp,
    })),
    10 // k-factor (learning rate)
  );

  // Calculate ELO history over time
  const eloHistory = calcEloHistory(
    allGamesForElo.map((game) => ({
      winner: game.winnerId,
      loser: game.loserId,
      datetime: game.timestamp,
    })),
    10 // k-factor (learning rate)
  );

  // Get user information for rankings
  const userIds = eloRankings.map((r) => r.userId);
  const users = await prisma.user.findMany({
    where: {
      id: { in: userIds },
    },
    select: {
      id: true,
      gamertag: true,
      name: true,
      email: true,
    },
  });

  // Get last game date for each user to determine activity
  const twentyOneDaysAgo = new Date();
  twentyOneDaysAgo.setDate(twentyOneDaysAgo.getDate() - 21);

  // Get all games involving these users to find last game per user
  const userLastGameDates = new Map<string, Date>();
  
  if (userIds.length > 0) {
    const allUserGames = await prisma.game.findMany({
      where: {
        OR: [
          { winnerId: { in: userIds } },
          { loserId: { in: userIds } },
        ],
      },
      select: {
        winnerId: true,
        loserId: true,
        timestamp: true,
      },
      orderBy: {
        timestamp: "desc",
      },
    });

    // Find the most recent game for each user
    for (const game of allUserGames) {
      if (!userLastGameDates.has(game.winnerId)) {
        userLastGameDates.set(game.winnerId, game.timestamp);
      }
      if (!userLastGameDates.has(game.loserId)) {
        userLastGameDates.set(game.loserId, game.timestamp);
      }
      
      // Early exit if we've found all users
      if (userLastGameDates.size === userIds.length) {
        break;
      }
    }
  }

  // Combine rankings with user info and activity status
  const rankingsWithUsers = eloRankings.map((ranking) => {
    const userInfo = users.find((u) => u.id === ranking.userId);
    const lastGameDate = userLastGameDates.get(ranking.userId);
    const isActive = lastGameDate ? lastGameDate >= twentyOneDaysAgo : false;
    
    return {
      ...ranking,
      user: userInfo || { id: ranking.userId, email: "Unknown", gamertag: null, name: null },
      isActive,
      lastGameDate: lastGameDate || null,
    };
  });

  // Separate active and inactive users, sort inactive by ELO
  const activeRankings = rankingsWithUsers.filter((r) => r.isActive);
  const inactiveRankings = rankingsWithUsers
    .filter((r) => !r.isActive)
    .sort((a, b) => b.elo - a.elo); // Sort by ELO descending

  // Get user with games (filtered by time period)
  const wonGamesQuery: any = {
    include: {
      loser: {
        select: {
          id: true,
          gamertag: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: {
      timestamp: "desc",
    },
    take: 500,
  };

  const lostGamesQuery: any = {
    include: {
      winner: {
        select: {
          id: true,
          gamertag: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: {
      timestamp: "desc",
    },
    take: 500,
  };

  // Filter user games by time period if not "all"
  if (startDate && endDate) {
    wonGamesQuery.where = {
      winnerId: user.id,
      timestamp: {
        gte: startDate,
        lte: endDate,
      },
    };
    lostGamesQuery.where = {
      loserId: user.id,
      timestamp: {
        gte: startDate,
        lte: endDate,
      },
    };
  } else {
    wonGamesQuery.where = { winnerId: user.id };
    lostGamesQuery.where = { loserId: user.id };
  }

  const [wonGames, lostGames, userData] = await Promise.all([
    prisma.game.findMany(wonGamesQuery),
    prisma.game.findMany(lostGamesQuery),
    prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        email: true,
        name: true,
        gamertag: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
  ]);

  if (!userData) {
    return redirect("/login");
  }

  const userWithGames = {
    ...userData,
    wonGames,
    lostGames,
  };

  if (!userWithGames) {
    return redirect("/login");
  }

  const allGames = [
    ...userWithGames.wonGames.map((g: any) => ({ ...g, result: "win" as const })),
    ...userWithGames.lostGames.map((g: any) => ({ ...g, result: "loss" as const })),
  ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const totalGames = userWithGames.wonGames.length + userWithGames.lostGames.length;
  const winRate = totalGames > 0 
    ? Math.round((userWithGames.wonGames.length / totalGames) * 100)
    : 0;

  // Calculate streak
  let currentStreak = 0;
  let isWinStreak = true;
  for (const game of allGames) {
    if (game.result === "win" && isWinStreak) {
      currentStreak++;
    } else if (game.result === "loss" && !isWinStreak) {
      currentStreak++;
    } else {
      break;
    }
    isWinStreak = game.result === "win";
  }

  // Recent activity (last 7 days)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const recentGames = allGames.filter(
    (g) => new Date(g.timestamp) >= sevenDaysAgo
  );

  // Helper function to get user display name
  const getUserName = (user: { gamertag?: string | null; name?: string | null; email: string }) => {
    return user.gamertag || user.name || user.email.split("@")[0];
  };

  // Prepare chart players data (only active users)
  const chartPlayers = activeRankings.map((ranking) => ({
    id: ranking.userId,
    name: getUserName(ranking.user),
  }));

  return {
    user: userWithGames,
    games: allGames.slice(0, 20),
    activeRankings,
    inactiveRankings,
    eloHistory,
    chartPlayers,
    period,
    periodIndex: index,
    stats: {
      totalGames,
      wins: userWithGames.wonGames.length,
      losses: userWithGames.lostGames.length,
      winRate,
      currentStreak,
      recentGames: recentGames.length,
    },
  };
}

export default function Dashboard() {
  const { user, games, stats, activeRankings, inactiveRankings, eloHistory, chartPlayers, period, periodIndex } = useLoaderData<typeof loader>();
  const [searchParams, setSearchParams] = useSearchParams();

  const handlePeriodChange = (newPeriod: TimePeriod) => {
    const params = new URLSearchParams(searchParams);
    if (newPeriod === "all") {
      params.delete("period");
      params.delete("index");
    } else {
      params.set("period", newPeriod);
      // Reset index to 0 when changing period
      params.set("index", "0");
    }
    setSearchParams(params);
  };

  const handleIndexChange = (newIndex: number) => {
    const params = new URLSearchParams(searchParams);
    if (newIndex === 0) {
      params.delete("index");
    } else {
      params.set("index", newIndex.toString());
    }
    setSearchParams(params);
  };

  const periods: Array<{ value: TimePeriod; label: string }> = [
    { value: "all", label: "All Time" },
    { value: "year", label: "This Year" },
    { value: "month", label: "This Month" },
    { value: "week", label: "This Week" },
  ];

  const getIndexLabel = (idx: number): string => {
    if (idx === 0) return "Current";
    if (idx === 1) return "Previous";
    return `-${idx}`;
  };

  const indexOptions = Array.from({ length: 12 }, (_, i) => i);

  const getOpponent = (game: any) => {
    return game.result === "win" ? game.loser : game.winner;
  };

  const getOpponentName = (opponent: { gamertag?: string | null; name?: string | null; email: string }) => {
    return opponent.gamertag || opponent.name || opponent.email.split("@")[0];
  };

  const getUserName = (user: { gamertag?: string | null; name?: string | null; email: string }) => {
    return user.gamertag || user.name || user.email.split("@")[0];
  };

  // Chart colors matching the style guide
  const chartColors = [
    "#f97316", // orange-500
    "#3b82f6", // blue-500
    "#10b981", // green-500
    "#f59e0b", // amber-500
    "#8b5cf6", // violet-500
    "#ec4899", // pink-500
    "#06b6d4", // cyan-500
    "#84cc16", // lime-500
    "#f43f5e", // rose-500
    "#6366f1", // indigo-500
  ];

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="w-5 h-5 text-yellow-400" />;
    if (rank === 2) return <Medal className="w-5 h-5 text-gray-300" />;
    if (rank === 3) return <Medal className="w-5 h-5 text-orange-400" />;
    return <span className="text-gray-400 font-bold">{rank}</span>;
  };

  // Combine and sort all rankings by ELO (active and inactive together)
  const allRankingsSorted = [...activeRankings, ...inactiveRankings].sort((a, b) => b.elo - a.elo);
  
  // Calculate current user rank (only counting active users)
  const currentUserRank = activeRankings.findIndex((r) => r.userId === user.id) + 1;
  const currentUserInActive = activeRankings.some((r) => r.userId === user.id);
  
  // Track active user rank as we iterate
  let activeRankCounter = 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-blue-900 overflow-x-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Welcome Message and Time Period Picker */}
        <div className="mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <p className="text-sm sm:text-base text-gray-400 break-words">
            Welcome back, <span className="break-words overflow-wrap-anywhere">{user.gamertag || user.name || "Player"}</span>! 🎱
          </p>
          
          {/* Time Period Pickers */}
          <div className="flex items-center gap-2 flex-nowrap">
            {/* Time Period Picker */}
            <div className="flex items-center gap-2 bg-gray-800/50 border-2 border-gray-700 rounded-xl p-1 flex-wrap">
              {periods.map((p) => (
                <button
                  key={p.value}
                  onClick={() => handlePeriodChange(p.value)}
                  className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 whitespace-nowrap ${
                    period === p.value
                      ? "bg-orange-500 text-white shadow-lg shadow-orange-500/50"
                      : "text-gray-400 hover:text-gray-200 hover:bg-gray-700/50"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Period Index Picker (only show when period is not "all") */}
            {period !== "all" && (
              <div className="bg-gray-800/50 border-2 border-gray-700 rounded-xl flex-shrink-0">
                <select
                  value={periodIndex}
                  onChange={(e) => handleIndexChange(parseInt(e.target.value, 10))}
                  className="bg-transparent text-gray-300 px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg text-xs sm:text-sm font-medium border-none outline-none cursor-pointer hover:bg-gray-700/50 transition-colors"
                >
                  {indexOptions.map((idx) => (
                    <option key={idx} value={idx} className="bg-gray-800 text-gray-300">
                      {getIndexLabel(idx)}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* ELO Rankings */}
        <div className="bg-gradient-to-br from-gray-800 to-blue-900 rounded-2xl p-6 border-2 border-gray-700 shadow-xl mb-8">
          <h2 className="text-2xl font-bold text-gray-100 mb-6 flex items-center gap-3">
            <Users className="w-6 h-6 text-orange-400" />
            ELO Rankings
          </h2>
          {allRankingsSorted.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-400">No rankings yet. Play some games to see the leaderboard!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {allRankingsSorted.map((ranking) => {
                const isActive = ranking.isActive;
                const isCurrentUser = ranking.userId === user.id;
                const playerName = getUserName(ranking.user);
                
                // Only increment rank counter for active users
                if (isActive) {
                  activeRankCounter++;
                }
                const rank = isActive ? activeRankCounter : null;

                // Show top 10 active users + all inactive users in their ELO position
                // Also show current user if they're not in top 10
                const shouldShow = isActive 
                  ? activeRankCounter <= 10 
                  : true; // Show all inactive users
                
                const showCurrentUserBelow = !isActive && isCurrentUser && activeRankings.length > 0 && !activeRankings.slice(0, 10).some(r => r.userId === user.id);

                if (!shouldShow && !showCurrentUserBelow) {
                  return null;
                }

                // Active user display
                if (isActive && rank !== null) {
                  return (
                    <div
                      key={ranking.userId}
                      className={`bg-gray-900/50 border-2 rounded-xl p-4 py-2 flex items-center justify-between gap-4
                        ${isCurrentUser 
                          ? "border-orange-500/70 bg-orange-500/10" 
                          : "border-gray-700 hover:border-gray-600"}
                        transition-all duration-200`}
                    >
                      <div className="flex items-center gap-4 min-w-0 flex-1">
                        <div className="flex-shrink-0 w-8 flex items-center justify-center">
                          {getRankIcon(rank)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            {isCurrentUser ? (
                              <Link
                                to="/profile"
                                className={`font-bold break-words text-orange-400 hover:text-orange-300 hover:underline transition-colors`}
                              >
                                {playerName}
                              </Link>
                            ) : (
                              <Link
                                to={`/profile/${ranking.userId}`}
                                className={`font-bold break-words text-gray-100 hover:text-orange-400 hover:underline transition-colors`}
                              >
                                {playerName}
                              </Link>
                            )}
                            {isCurrentUser && (
                              <span className="text-xs font-semibold px-2 py-1 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/50">
                                YOU
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex-shrink-0">
                        <div className={`text-xl font-bold ${isCurrentUser ? "text-orange-400" : "text-gray-100"}`}>
                          {ranking.elo}
                        </div>
                        <div className="text-xs text-gray-400">ELO</div>
                      </div>
                    </div>
                  );
                }

                // Inactive user display (smaller, no rank number)
                return (
                  <div
                    key={ranking.userId}
                    className={`flex  gap-1 py-1 px-4 ${
                      isCurrentUser 
                        ? "border-orange-500/70 bg-orange-500/5" 
                        : "border-gray-600/50 bg-gray-900/20"
                    }`}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <SkullIcon
                        className="w-4 h-4 text-gray-400"
                      />
                      </div>
                    <div className="flex items-center justify-center gap-2 text-center">
                      {isCurrentUser ? (
                        <Link
                          to="/profile"
                          className={`text-sm font-medium break-words ${
                            isCurrentUser 
                              ? "text-orange-400 hover:text-orange-300 hover:underline" 
                              : "text-gray-400 hover:text-gray-300 hover:underline"
                          } transition-colors`}
                        >
                          {playerName}
                        </Link>
                      ) : (
                        <Link
                          to={`/profile/${ranking.userId}`}
                          className="text-sm font-medium text-gray-400 hover:text-gray-300 hover:underline transition-colors break-words"
                        >
                          {playerName}
                        </Link>
                      )}
                      {isCurrentUser && (
                        <span className="text-xs font-semibold px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-400 border border-orange-500/50">
                          YOU
                        </span>
                      )}
                      <span className="text-xs text-gray-500">
                        ({ranking.elo} ELO)
                      </span>
                    </div>
                  </div>
                );
              })}
              
              {/* Show current user below top 10 if they're active but not in top 10 */}
              {currentUserInActive && currentUserRank > 10 && (
                <div className="pt-4 border-t border-gray-700">
                  <div className="bg-gray-900/50 border-2 border-orange-500/70 bg-orange-500/10 rounded-xl p-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4 min-w-0 flex-1">
                      <div className="flex-shrink-0 w-8 flex items-center justify-center">
                        <span className="text-gray-400 font-bold">{currentUserRank}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Link
                            to="/profile"
                            className="font-bold text-orange-400 hover:text-orange-300 hover:underline transition-colors break-words"
                          >
                            {getUserName(user)}
                          </Link>
                          <span className="text-xs font-semibold px-2 py-1 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/50">
                            YOU
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      <div className="text-xl font-bold text-orange-400">
                        {activeRankings[currentUserRank - 1]?.elo || 1500}
                      </div>
                      <div className="text-xs text-gray-400">ELO</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ELO Chart */}
        {eloHistory.length > 0 && chartPlayers.length > 0 && (
          <div className="mb-8">
            <EloChart eloHistory={eloHistory} players={chartPlayers} colors={chartColors} />
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Games */}
          <div className="bg-gradient-to-br from-gray-800 to-blue-900 rounded-2xl p-6 border-2 border-gray-700 shadow-xl hover:shadow-2xl hover:border-orange-500/50 transition-all duration-300">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-orange-500/20 rounded-xl flex items-center justify-center border-2 border-orange-500/50">
                <Target className="w-8 h-8 text-orange-400" />
              </div>
              <div>
                <div className="text-3xl font-bold text-gray-100">{stats.totalGames}</div>
                <div className="text-sm text-gray-400">Total Games</div>
              </div>
            </div>
          </div>

          {/* Win Rate */}
          <div className="bg-gradient-to-br from-gray-800 to-blue-900 rounded-2xl p-6 border-2 border-gray-700 shadow-xl hover:shadow-2xl hover:border-green-500/50 transition-all duration-300">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-green-500/20 rounded-xl flex items-center justify-center border-2 border-green-500/50">
                <TrendingUp className="w-8 h-8 text-green-400" />
              </div>
              <div>
                <div className="text-3xl font-bold text-gray-100">{stats.winRate}%</div>
                <div className="text-sm text-gray-400">Win Rate</div>
              </div>
            </div>
          </div>

          {/* Current Streak */}
          <div className="bg-gradient-to-br from-gray-800 to-blue-900 rounded-2xl p-6 border-2 border-gray-700 shadow-xl hover:shadow-2xl hover:border-yellow-500/50 transition-all duration-300">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-yellow-500/20 rounded-xl flex items-center justify-center border-2 border-yellow-500/50">
                <Award className="w-8 h-8 text-yellow-400" />
              </div>
              <div>
                <div className="text-3xl font-bold text-gray-100">{stats.currentStreak}</div>
                <div className="text-sm text-gray-400">Current Streak</div>
              </div>
            </div>
          </div>

          {/* Recent Games */}
          <div className="bg-gradient-to-br from-gray-800 to-blue-900 rounded-2xl p-6 border-2 border-gray-700 shadow-xl hover:shadow-2xl hover:border-blue-500/50 transition-all duration-300">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-blue-500/20 rounded-xl flex items-center justify-center border-2 border-blue-500/50">
                <Calendar className="w-8 h-8 text-blue-400" />
              </div>
              <div>
                <div className="text-3xl font-bold text-gray-100">{stats.recentGames}</div>
                <div className="text-sm text-gray-400">Last 7 Days</div>
              </div>
            </div>
          </div>
        </div>

        {/* Win/Loss Breakdown */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div className="bg-gradient-to-br from-gray-800 to-blue-900 rounded-2xl p-6 border-2 border-gray-700 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center border-2 border-green-500/50">
                <Trophy className="w-6 h-6 text-green-400" />
              </div>
              <h2 className="text-2xl font-bold text-gray-100">Wins</h2>
            </div>
            <div className="text-4xl font-bold text-green-400 mb-2">{stats.wins}</div>
            <div className="text-sm text-gray-400">
              {stats.totalGames > 0
                ? `${Math.round((stats.wins / stats.totalGames) * 100)}% of all games`
                : "No games played yet"}
            </div>
          </div>

          <div className="bg-gradient-to-br from-gray-800 to-blue-900 rounded-2xl p-6 border-2 border-gray-700 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center border-2 border-red-500/50">
                <span className="text-2xl">😔</span>
              </div>
              <h2 className="text-2xl font-bold text-gray-100">Losses</h2>
            </div>
            <div className="text-4xl font-bold text-red-400 mb-2">{stats.losses}</div>
            <div className="text-sm text-gray-400">
              {stats.totalGames > 0
                ? `${Math.round((stats.losses / stats.totalGames) * 100)}% of all games`
                : "No games played yet"}
            </div>
          </div>
        </div>

        {/* Recent Games List */}
        <div className="bg-gradient-to-br from-gray-800 to-blue-900 rounded-2xl p-6 border-2 border-gray-700 shadow-xl">
          <h2 className="text-2xl font-bold text-gray-100 mb-6 flex items-center gap-3">
            <Calendar className="w-6 h-6 text-orange-400" />
            Recent Games
          </h2>

          {games.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🎱</div>
              <p className="text-xl text-gray-400 mb-2">No games yet</p>
              <p className="text-gray-500">Start playing to see your game history here!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {games.map((game) => {
                const opponent = getOpponent(game);
                const opponentName = getOpponentName(opponent);
                const isWin = game.result === "win";

                return (
                  <div
                    key={game.id}
                    className={`bg-gray-900/50 border-2 rounded-xl p-4 
                                ${isWin ? "border-green-500/50 hover:border-green-500" : "border-red-500/50 hover:border-red-500"}
                                hover:shadow-lg transition-all duration-200 transform hover:-translate-y-1`}
                  >
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                      <div className="flex items-center gap-4 min-w-0 flex-1">
                        <div
                          className={`w-12 h-12 rounded-full flex items-center justify-center border-2
                                    ${isWin 
                                      ? "bg-green-500/20 border-green-500/50" 
                                      : "bg-red-500/20 border-red-500/50"}`}
                        >
                          {isWin ? (
                            <Trophy className="w-6 h-6 text-green-400" />
                          ) : (
                            <span className="text-2xl">😔</span>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-gray-100 break-words">
                              {isWin ? "Victory" : "Defeat"}
                            </span>
                            <span
                              className={`text-xs font-semibold px-2 py-1 rounded-full flex-shrink-0
                                        ${isWin
                                          ? "bg-green-500/20 text-green-400 border border-green-500/50"
                                          : "bg-red-500/20 text-red-400 border border-red-500/50"}`}
                            >
                              {isWin ? "WIN" : "LOSS"}
                            </span>
                          </div>
                          <p className="text-sm text-gray-400 mt-1 break-words">
                            {isWin ? "Defeated" : "Lost to"}{" "}
                            <Link
                              to={`/profile/${opponent.id}`}
                              className="font-semibold text-gray-300 hover:text-orange-400 hover:underline transition-colors break-words overflow-wrap-anywhere"
                            >
                              {opponentName}
                            </Link>
                          </p>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="text-sm text-gray-400 whitespace-nowrap">
                          {formatDistanceToNow(new Date(game.timestamp), { addSuffix: true })}
                        </div>
                        <div className="text-xs text-gray-500 mt-1 whitespace-nowrap">
                          {new Date(game.timestamp).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
