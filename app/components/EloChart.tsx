import { useState } from "react";
import { LineChart, Line, CartesianGrid, Tooltip, Legend, ResponsiveContainer, YAxis } from "recharts";
import { TrendingUp } from "lucide-react";
import { format } from "date-fns";
import type { EloHistoryPoint } from "../utils/calc_elo";

interface EloChartProps {
  eloHistory: EloHistoryPoint[];
  players: Array<{
    id: string;
    name: string;
  }>;
  colors: string[];
}

export function EloChart({ eloHistory, players, colors }: EloChartProps) {
  const [visiblePlayers, setVisiblePlayers] = useState<Set<string>>(
    new Set(players.map((p) => p.id))
  );

  const togglePlayer = (playerId: string) => {
    const newVisible = new Set(visiblePlayers);
    if (newVisible.has(playerId)) {
      newVisible.delete(playerId);
    } else {
      newVisible.add(playerId);
    }
    setVisiblePlayers(newVisible);
  };

  // Format data for recharts
  const chartData = eloHistory.map((point) => {
    const dataPoint: any = {
      timestamp: point.timestamp,
      date: format(new Date(point.timestamp), "MMM d, yyyy"),
    };
    
    // Add each player's ELO if they're visible
    players.forEach((player) => {
      if (visiblePlayers.has(player.id)) {
        dataPoint[player.id] = point[player.id] as number;
      }
    });
    
    return dataPoint;
  });

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-800 border-2 border-gray-700 rounded-xl p-4 shadow-xl">
          <p className="text-gray-300 font-semibold mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: <span className="font-bold">{entry.value?.toFixed(2)}</span>
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-gradient-to-br from-gray-800 to-blue-900 rounded-2xl p-6 border-2 border-gray-700 shadow-xl">
      <div className="mb-4">
        <h2 className="text-2xl font-bold text-gray-100 mb-3 flex items-center gap-3">
          <TrendingUp className="w-6 h-6 text-orange-400" />
          ELO Over Time
        </h2>
        
        {/* Player Toggles */}
        <div className="flex flex-wrap gap-2">
          {players.map((player, index) => {
            const isVisible = visiblePlayers.has(player.id);
            const color = colors[index % colors.length];
            
            return (
              <button
                key={player.id}
                onClick={() => togglePlayer(player.id)}
                className={`px-2 py-1 rounded-lg text-xs font-medium transition-all duration-200 border flex items-center gap-1.5 ${
                  isVisible
                    ? "bg-orange-500/20 text-orange-400 border-orange-500/50 hover:bg-orange-500/30"
                    : "bg-gray-700/50 text-gray-400 border-gray-600 hover:bg-gray-700"
                }`}
              >
                <div
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: isVisible ? color : "#6b7280" }}
                />
                <span className="truncate max-w-[80px]">{player.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {chartData.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-400">No ELO history available yet. Play some games to see your progress!</p>
        </div>
      ) : (
        <div className="w-full" style={{ height: "400px" }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <YAxis 
                domain={[1400, 'auto']}
                stroke="#9ca3af"
                tick={{ fill: "#9ca3af", fontSize: 12 }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ color: "#d1d5db" }}
                iconType="line"
              />
              {players.map((player, index) => {
                if (!visiblePlayers.has(player.id)) return null;
                const color = colors[index % colors.length];
                return (
                  <Line
                    key={player.id}
                    type="monotone"
                    dataKey={player.id}
                    name={player.name}
                    stroke={color}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                );
              })}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

