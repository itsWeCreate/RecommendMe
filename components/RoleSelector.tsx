import React, { useState } from "react";
import { AppMode } from "../types";

interface RoleSelectorProps {
  setAppMode: (mode: AppMode) => void;
}

const RoleSelector: React.FC<RoleSelectorProps> = ({ setAppMode }) => {
  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleAdminAccess = () => {
    if (password === "rec0mm3ndME!") {
      setAppMode("admin");
      setError("");
    } else {
      setError("Incorrect password.");
    }
  };

  if (showPassword) {
    return (
      <div className="w-full max-w-sm mx-auto mt-10 bg-white p-8 rounded-3xl shadow-xl border border-gray-100 animate-fade-in-up">
        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900">Admin Access</h2>
          <p className="text-sm text-gray-500">Enter password to configure applicant data.</p>
        </div>
        
        <input
          type="password"
          className="w-full p-3 mb-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdminAccess()}
        />
        
        {error && <p className="text-red-500 text-sm mb-4 font-medium">{error}</p>}

        <div className="space-y-3">
          <button
            onClick={handleAdminAccess}
            className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl transition-colors"
          >
            Unlock
          </button>
          <button
            onClick={() => { setShowPassword(false); setPassword(""); setError(""); }}
            className="w-full py-3 text-gray-500 hover:text-gray-800 font-medium transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-lg space-y-8 mt-10 text-center animate-fade-in-up">
      <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">Select Your Role</h2>
      <p className="text-gray-600 mb-6 text-lg">Are you setting up the context, or writing the letter?</p>

      <div className="space-y-5">
        {/* Applicant Button */}
        <button
          onClick={() => setShowPassword(true)}
          className="w-full p-6 rounded-3xl bg-white border-2 border-gray-100 shadow-xl hover:shadow-2xl hover:border-purple-500 transition-all duration-300 group relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-purple-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          <div className="flex items-center text-left relative z-10">
            <div className="w-14 h-14 rounded-2xl bg-purple-100 flex items-center justify-center mr-5 group-hover:bg-purple-600 transition-colors duration-300">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-purple-600 group-hover:text-white transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900 group-hover:text-purple-700 transition-colors">Applicant (Setup)</p>
              <p className="text-sm text-gray-500 mt-1">Configure program requirements and anecdotes.</p>
            </div>
          </div>
        </button>

        {/* Recommender Button */}
        <button
          onClick={() => setAppMode("recommender")}
          className="w-full p-6 rounded-3xl bg-white border-2 border-gray-100 shadow-xl hover:shadow-2xl hover:border-cyan-500 transition-all duration-300 group relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-cyan-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          <div className="flex items-center text-left relative z-10">
            <div className="w-14 h-14 rounded-2xl bg-cyan-100 flex items-center justify-center mr-5 group-hover:bg-cyan-500 transition-colors duration-300">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-cyan-600 group-hover:text-white transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900 group-hover:text-cyan-700 transition-colors">Recommender</p>
              <p className="text-sm text-gray-500 mt-1">Answer questions or record audio to draft.</p>
            </div>
          </div>
        </button>
      </div>
    </div>
  );
};

export default RoleSelector;