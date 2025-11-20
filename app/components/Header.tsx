import { Link, useLocation } from "react-router";
import { Trophy, User, Settings, LogOut, Menu, X, Plus } from "lucide-react";
import { useState } from "react";

interface HeaderProps {
  user: {
    id: string;
    email: string;
    gamertag?: string | null;
    name?: string | null;
  } | null;
}

export function Header({ user }: HeaderProps) {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  if (!user) {
    return null;
  }

  const userDisplayName = user.gamertag || user.name || user.email.split("@")[0];

  const navItems = [
    { to: "/dashboard", label: "Dashboard", icon: Trophy },
    { to: "/newgame", label: "New Game", icon: Plus },
    { to: "/profile", label: "Profile", icon: User },
    { to: "/settings", label: "Settings", icon: Settings },
  ];

  const isActive = (path: string) => location.pathname === path;

  // Get current page title based on route
  const getPageTitle = () => {
    const path = location.pathname;
    if (path === "/dashboard") return "Dashboard";
    if (path === "/profile") return "Profile";
    if (path.startsWith("/profile/")) return "Profile";
    if (path === "/newgame") return "New Game";
    if (path === "/claim-ghost") return "Claim Ghost User";
    if (path === "/settings") return "Settings";
    return null;
  };

  const pageTitle = getPageTitle();

  return (
    <header className="sticky top-0 z-50 bg-gray-900/95 backdrop-blur-sm border-b-2 border-gray-800 shadow-lg">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo/Brand */}
          <Link
            to="/dashboard"
            className="flex items-center gap-2 text-orange-500 hover:text-orange-400 transition-colors"
          >
            <Trophy className="w-6 h-6 sm:w-8 sm:h-8" />
            <span className="text-xl sm:text-2xl font-bold">YPool</span>
            {pageTitle && (
              <>
                <span className="text-gray-400 mx-2">/</span>
                <span className="text-lg sm:text-xl font-semibold text-gray-300">{pageTitle}</span>
              </>
            )}
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all duration-200
                    ${
                      isActive(item.to)
                        ? "bg-orange-500 text-white shadow-lg shadow-orange-500/50"
                        : "text-gray-300 hover:text-gray-100 hover:bg-gray-800"
                    }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </Link>
              );
            })}

            {/* User Info & Logout */}
            <div className="flex items-center gap-4 pl-4 border-l border-gray-700">
              <div className="text-right hidden lg:block">
                <div className="text-sm font-semibold text-gray-100 break-words max-w-[150px] truncate">
                  {userDisplayName}
                </div>
                <div className="text-xs text-gray-400 truncate max-w-[150px]">
                  {user.email}
                </div>
              </div>
              <Link
                to="/logout"
                className="bg-red-500/20 hover:bg-red-500/30 text-red-400 border-2 border-red-500/50 
                         px-4 py-2 rounded-xl font-medium transition-all duration-200
                         flex items-center gap-2 hover:scale-105"
              >
                <LogOut className="w-5 h-5" />
                <span className="hidden lg:inline">Logout</span>
              </Link>
            </div>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-xl text-gray-300 hover:text-gray-100 hover:bg-gray-800 transition-colors"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden pb-4 border-t border-gray-800 mt-2 pt-4">
            <div className="space-y-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-200
                      ${
                        isActive(item.to)
                          ? "bg-orange-500 text-white shadow-lg shadow-orange-500/50"
                          : "text-gray-300 hover:text-gray-100 hover:bg-gray-800"
                      }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}

              {/* Mobile User Info */}
              <div className="px-4 py-3 border-t border-gray-800 mt-2 pt-3">
                <div className="text-sm font-semibold text-gray-100 break-words mb-1">
                  {userDisplayName}
                </div>
                <div className="text-xs text-gray-400 break-words mb-3">
                  {user.email}
                </div>
                <Link
                  to="/logout"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full bg-red-500/20 hover:bg-red-500/30 text-red-400 border-2 border-red-500/50 
                           px-4 py-3 rounded-xl font-medium transition-all duration-200
                           flex items-center justify-center gap-2"
                >
                  <LogOut className="w-5 h-5" />
                  <span>Logout</span>
                </Link>
              </div>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}

