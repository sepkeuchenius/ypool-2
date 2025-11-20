import { Form } from "react-router";
import { Edit2, Save, X } from "lucide-react";
import { useState } from "react";

interface GamertagEditorProps {
  gamertag: string | null;
  isSubmitting: boolean;
}

export function GamertagEditor({ gamertag, isSubmitting }: GamertagEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(gamertag || "");

  if (isEditing) {
    return (
      <Form method="post" className="space-y-4">
        <input
          type="text"
          name="gamertag"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="w-full bg-gray-800 border-2 border-gray-700 rounded-xl px-4 py-3 
                     text-gray-100 placeholder-gray-500 focus:outline-none 
                     focus:border-orange-500 focus:ring-2 focus:ring-orange-500/50 
                     transition-all duration-200"
          placeholder="Enter your gamer tag"
          maxLength={50}
          autoFocus
        />
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={isSubmitting}
            className="bg-orange-500 hover:bg-orange-600 text-white font-semibold 
                       px-6 py-3 rounded-xl shadow-lg shadow-orange-500/50 
                       transform hover:scale-105 transition-all duration-200
                       flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-5 h-5" />
            {isSubmitting ? "Saving..." : "Save"}
          </button>
          <button
            type="button"
            onClick={() => {
              setIsEditing(false);
              setValue(gamertag || "");
            }}
            className="bg-gray-700 hover:bg-gray-600 text-gray-100 font-medium 
                       px-6 py-3 rounded-xl border-2 border-gray-600 
                       transform hover:scale-105 transition-all duration-200
                       flex items-center gap-2"
          >
            <X className="w-5 h-5" />
            Cancel
          </button>
        </div>
      </Form>
    );
  }

  return (
    <div className="flex items-center gap-4">
      <div className="flex-1 bg-gray-900/50 border-2 border-gray-700 rounded-xl px-4 py-3 text-gray-300 break-words overflow-wrap-anywhere min-w-0">
        {gamertag || "Not set"}
      </div>
      <button
        onClick={() => setIsEditing(true)}
        className="bg-orange-500 hover:bg-orange-600 text-white font-semibold 
                   px-4 sm:px-6 py-3 rounded-xl shadow-lg shadow-orange-500/50 
                   transform hover:scale-105 hover:-rotate-1 transition-all duration-200
                   flex items-center gap-2 flex-shrink-0 whitespace-nowrap"
      >
        <Edit2 className="w-4 h-4 sm:w-5 sm:h-5" />
        <span className="hidden sm:inline">Edit</span>
      </button>
    </div>
  );
}


