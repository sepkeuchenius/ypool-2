interface ProfileStatsProps {
  wins: number;
  losses: number;
}

export function ProfileStats({ wins, losses }: ProfileStatsProps) {
  const totalGames = wins + losses;
  const winRate = totalGames > 0
    ? Math.round((wins / totalGames) * 100)
    : 0;

  return (
    <div className="grid md:grid-cols-3 gap-6">
      <div className="bg-gradient-to-br from-gray-800 to-blue-900 rounded-xl p-6 border-2 border-gray-700 shadow-lg">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center border-2 border-green-500/50">
            <span className="text-2xl">🏆</span>
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-100">
              {wins}
            </div>
            <div className="text-sm text-gray-400">Wins</div>
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-br from-gray-800 to-blue-900 rounded-xl p-6 border-2 border-gray-700 shadow-lg">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center border-2 border-red-500/50">
            <span className="text-2xl">😔</span>
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-100">
              {losses}
            </div>
            <div className="text-sm text-gray-400">Losses</div>
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-br from-gray-800 to-blue-900 rounded-xl p-6 border-2 border-gray-700 shadow-lg">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 bg-orange-500/20 rounded-full flex items-center justify-center border-2 border-orange-500/50">
            <span className="text-2xl">📊</span>
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-100">
              {winRate}%
            </div>
            <div className="text-sm text-gray-400">Win Rate</div>
          </div>
        </div>
      </div>
    </div>
  );
}


