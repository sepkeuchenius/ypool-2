import { Link, redirect, type LoaderFunctionArgs } from "react-router";
import { getSessionInfo } from "../server/session.server";
import { Trophy, Zap, Users, TrendingUp } from "lucide-react";

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await getSessionInfo(request);
  if (user) {
    return redirect("/dashboard");
  }
  return { user };
  
}

export default function Index() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-blue-900 overflow-x-hidden">
      {/* Hero Section */}
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-32">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-72 h-72 bg-orange-500/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        </div>

        <div className="relative z-10">
          {/* Main Content */}
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Side - Text Content */}
            <div className="text-center lg:text-left space-y-8">
              <div className="space-y-4">
                <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-gray-50 leading-tight break-words">
                  Welcome to{" "}
                  <span className="text-orange-500 transform hover:scale-105 inline-block transition-transform">
                    YPool
                  </span>
                </h1>
                <p className="text-lg sm:text-xl lg:text-2xl text-gray-300 font-medium break-words">
                  The Ultimate 8-Ball Pool Experience 🎱
                </p>
                <p className="text-base sm:text-lg text-gray-400 max-w-xl mx-auto lg:mx-0 break-words">
                  Challenge your friends, track your wins, and prove you're the best pool player around. 
                  Every game counts, every victory matters.
                </p>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-4 max-w-md mx-auto lg:mx-0">
                <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 backdrop-blur-sm hover:border-orange-500/50 transition-all duration-200">
                  <div className="flex items-center gap-2 justify-center lg:justify-start">
                    <Trophy className="w-6 h-6 text-orange-400" />
                    <div>
                      <div className="text-2xl font-bold text-gray-100">1,234</div>
                      <div className="text-xs text-gray-400">Games Played</div>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 backdrop-blur-sm hover:border-orange-500/50 transition-all duration-200">
                  <div className="flex items-center gap-2 justify-center lg:justify-start">
                    <Users className="w-6 h-6 text-blue-400" />
                    <div>
                      <div className="text-2xl font-bold text-gray-100">567</div>
                      <div className="text-xs text-gray-400">Players</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                {/* <Link
                  to="/login"
                  className="bg-orange-500 hover:bg-orange-600 text-white font-semibold 
                             px-8 py-4 rounded-xl shadow-lg shadow-orange-500/50 
                             transform hover:scale-105 hover:-rotate-1 transition-all duration-200
                             text-center text-lg"
                >
                  Login to Play
                </Link>
                <Link
                  to="/signup"
                  className="bg-gray-700 hover:bg-gray-600 text-gray-100 font-semibold 
                             px-8 py-4 rounded-xl border-2 border-gray-600 hover:border-orange-500/50
                             transform hover:scale-105 transition-all duration-200
                             text-center text-lg"
                >
                  Create Account
                </Link> */}
                <Link
                  to="/auth/microsoft"
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold 
                             px-8 py-4 rounded-xl shadow-lg shadow-blue-500/50 
                             transform hover:scale-105 transition-all duration-200
                             text-center text-lg flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" viewBox="0 0 23 23" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="0" y="0" width="11" height="11" fill="#F25022"/>
                    <rect x="12" y="0" width="11" height="11" fill="#7FBA00"/>
                    <rect x="0" y="12" width="11" height="11" fill="#00A4EF"/>
                    <rect x="12" y="12" width="11" height="11" fill="#FFB900"/>
                  </svg>
                  Sign in with Microsoft
                </Link>
              </div>
            </div>

            {/* Right Side - Pool Table Visualization */}
            <div className="flex justify-center lg:justify-end overflow-hidden">
              <div className="w-full max-w-md lg:max-w-none">
                <PoolTableVisualization />
              </div>
            </div>
          </div>

          {/* Features Section */}
          <div className="mt-32 grid md:grid-cols-3 gap-6">
            <FeatureCard
              icon={<Trophy className="w-8 h-8" />}
              title="Track Your Wins"
              description="Every victory is recorded. See your win rate, streaks, and climb the leaderboard."
              color="orange"
            />
            <FeatureCard
              icon={<Zap className="w-8 h-8" />}
              title="Quick Matches"
              description="Challenge friends instantly. Fast-paced games that keep you coming back for more."
              color="yellow"
            />
            <FeatureCard
              icon={<TrendingUp className="w-8 h-8" />}
              title="Leaderboards"
              description="Compete with the best. See who's on top and prove you're the champion."
              color="green"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function PoolTableVisualization() {
  return (
    <div className="relative w-full">
      {/* Pool Table SVG */}
      <svg
        width="100%"
        height="auto"
        viewBox="0 0 500 280"
        className="drop-shadow-2xl transform hover:scale-105 transition-transform duration-300 max-w-full"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Table Surface - Green Felt */}
        <defs>
          <linearGradient id="feltGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#1a5f3f" />
            <stop offset="50%" stopColor="#0d4d2e" />
            <stop offset="100%" stopColor="#0a3d24" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Table Border - Wood */}
        <rect
          x="20"
          y="20"
          width="460"
          height="240"
          rx="30"
          fill="#8B4513"
          stroke="#654321"
          strokeWidth="4"
        />

        {/* Table Surface */}
        <rect
          x="40"
          y="40"
          width="420"
          height="200"
          rx="20"
          fill="url(#feltGradient)"
        />

        {/* Side Pockets */}
        <circle cx="60" cy="60" r="18" fill="#000" filter="url(#glow)" />
        <circle cx="440" cy="60" r="18" fill="#000" filter="url(#glow)" />
        <circle cx="60" cy="220" r="18" fill="#000" filter="url(#glow)" />
        <circle cx="440" cy="220" r="18" fill="#000" filter="url(#glow)" />

        {/* Corner Pockets */}
        <ellipse cx="40" cy="40" rx="22" ry="22" fill="#000" filter="url(#glow)" />
        <ellipse cx="460" cy="40" rx="22" ry="22" fill="#000" filter="url(#glow)" />
        <ellipse cx="40" cy="240" rx="22" ry="22" fill="#000" filter="url(#glow)" />
        <ellipse cx="460" cy="240" rx="22" ry="22" fill="#000" filter="url(#glow)" />

        {/* Center Line */}
        <line
          x1="250"
          y1="40"
          x2="250"
          y2="240"
          stroke="#fff"
          strokeWidth="2"
          strokeDasharray="5,5"
          opacity="0.3"
        />

        {/* Head Spot */}
        <circle cx="150" cy="140" r="4" fill="#fff" opacity="0.8" />

        {/* Center Spot */}
        <circle cx="250" cy="140" r="4" fill="#fff" opacity="0.8" />

        {/* Foot Spot */}
        <circle cx="350" cy="140" r="4" fill="#fff" opacity="0.8" />

        {/* Balls - Rack Formation */}
        <Ball cx={350} cy={140} number={8} color="#000" />
        <Ball cx={330} cy={125} number={1} color="#FFD700" />
        <Ball cx={330} cy={155} number={2} color="#0000FF" />
        <Ball cx={310} cy={110} number={3} color="#FF0000" />
        <Ball cx={310} cy={140} number={4} color="#800080" />
        <Ball cx={310} cy={170} number={5} color="#FFA500" />
        <Ball cx={290} cy={95} number={6} color="#008000" />
        <Ball cx={290} cy={125} number={7} color="#8B0000" />
        <Ball cx={290} cy={155} number={9} color="#FFFF00" />
        <Ball cx={290} cy={185} number={10} color="#00FFFF" />
        <Ball cx={270} cy={80} number={11} color="#FF1493" />
        <Ball cx={270} cy={110} number={12} color="#000080" />
        <Ball cx={270} cy={140} number={13} color="#8B4513" />
        <Ball cx={270} cy={170} number={14} color="#FF00FF" />
        <Ball cx={270} cy={200} number={15} color="#FF4500" />

        {/* Cue Ball */}
        <Ball cx={150} cy={140} number={0} color="#FFF" />

        {/* Cue Stick */}
        <line
          x1="100"
          y1="140"
          x2="130"
          y2="140"
          stroke="#8B4513"
          strokeWidth="8"
          strokeLinecap="round"
          className="animate-pulse"
        />
        <line
          x1="100"
          y1="140"
          x2="130"
          y2="140"
          stroke="#654321"
          strokeWidth="6"
          strokeLinecap="round"
        />
      </svg>

      {/* Floating Animation Indicator */}
      <div className="absolute -bottom-4 left-1/2 transform -translate-x-1/2">
        <div className="flex gap-2">
          <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce"></div>
          <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce delay-75"></div>
          <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce delay-150"></div>
        </div>
      </div>
    </div>
  );
}

function Ball({
  cx,
  cy,
  number,
  color,
}: {
  cx: number;
  cy: number;
  number: number;
  color: string;
}) {
  const isStriped = number > 8;
  const ballColor = number === 0 ? "#FFF" : number === 8 ? "#000" : color;

  return (
    <g>
      <circle
        cx={cx}
        cy={cy}
        r="12"
        fill={ballColor}
        stroke="#000"
        strokeWidth="1"
        className="drop-shadow-lg"
      />
      {number > 0 && (
        <>
          {isStriped ? (
            <>
              <rect
                x={cx - 12}
                y={cy - 3}
                width="24"
                height="6"
                fill="#FFF"
                opacity="0.9"
              />
              <text
                x={cx}
                y={cy + 4}
                textAnchor="middle"
                fontSize="10"
                fill="#000"
                fontWeight="bold"
              >
                {number}
              </text>
            </>
          ) : (
            <circle cx={cx} cy={cy} r="8" fill="#FFF" opacity="0.3" />
          )}
          {!isStriped && (
            <text
              x={cx}
              y={cy + 4}
              textAnchor="middle"
              fontSize="10"
              fill="#000"
              fontWeight="bold"
            >
              {number}
            </text>
          )}
        </>
      )}
      {/* Highlight */}
      <circle
        cx={cx - 3}
        cy={cy - 3}
        r="3"
        fill="#FFF"
        opacity="0.6"
      />
    </g>
  );
}

function FeatureCard({
  icon,
  title,
  description,
  color,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  color: "orange" | "yellow" | "green";
}) {
  const colorClasses = {
    orange: {
      icon: "bg-orange-500/20 text-orange-400 border-orange-500/50",
      border: "hover:border-orange-500/50",
    },
    yellow: {
      icon: "bg-yellow-500/20 text-yellow-400 border-yellow-500/50",
      border: "hover:border-yellow-500/50",
    },
    green: {
      icon: "bg-green-500/20 text-green-400 border-green-500/50",
      border: "hover:border-green-500/50",
    },
  };

  const classes = colorClasses[color];

  return (
    <div
      className={`bg-gradient-to-br from-gray-800 to-blue-900 rounded-2xl p-6 
                  border-2 border-gray-700 shadow-xl hover:shadow-2xl 
                  ${classes.border} transition-all duration-300 
                  transform hover:-translate-y-1`}
    >
      <div className={`w-16 h-16 ${classes.icon} rounded-xl flex items-center justify-center mb-4 border-2`}>
        {icon}
      </div>
      <h3 className="text-xl font-bold text-gray-100 mb-2">{title}</h3>
      <p className="text-gray-400 text-sm leading-relaxed">{description}</p>
    </div>
  );
}

