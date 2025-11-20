interface ProfileInfoProps {
  email: string;
  name?: string | null;
  gamertag?: string | null;
}

export function ProfileInfo({ email, name, gamertag }: ProfileInfoProps) {
  return (
    <div className="space-y-6">
      {/* Email */}
      <div>
        <label className="block text-sm font-semibold text-gray-400 mb-2">
          Email
        </label>
        <div className="bg-gray-900/50 border-2 border-gray-700 rounded-xl px-4 py-3 text-gray-300 break-words overflow-wrap-anywhere">
          {email}
        </div>
      </div>

      {/* Name */}
      <div>
        <label className="block text-sm font-semibold text-gray-400 mb-2">
          Name
        </label>
        <div className="bg-gray-900/50 border-2 border-gray-700 rounded-xl px-4 py-3 text-gray-300 break-words">
          {name || "Not set"}
        </div>
      </div>

      {/* Gamer Tag */}
      <div>
        <label className="block text-sm font-semibold text-gray-400 mb-2">
          Gamer Tag
        </label>
        <div className="bg-gray-900/50 border-2 border-gray-700 rounded-xl px-4 py-3 text-gray-300 break-words overflow-wrap-anywhere min-w-0">
          {gamertag || "Not set"}
        </div>
      </div>
    </div>
  );
}


