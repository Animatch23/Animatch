"use client";

import { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ProfileInterestsPage() {
  const router = useRouter();
  const SUGGESTED_TOPICS = useMemo(
    () => [
      "Sports","Movies","Music","Books","Technology","Gaming","Cooking","Travel","Anime","Pets",
      "Fitness","Art","Science","History","Finance","Programming","Startups","Photography","Nature","Food","K‑dramas",
    ],
    []
  );

  const [selectedInterests, setSelectedInterests] = useState([]);
  const [interestInput, setInterestInput] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem("animatch:interests");
      if (raw) setSelectedInterests(JSON.parse(raw));
    } catch {}
  }, []);

  const addInterest = (value) => {
    const v = (value || "").trim();
    if (!v) return;
    setSelectedInterests((prev) => (prev.some((i) => i.toLowerCase() === v.toLowerCase()) ? prev : [...prev, v]).slice(0, 20));
    setInterestInput("");
  };

  const removeInterest = (value) => setSelectedInterests((prev) => prev.filter((i) => i !== value));

  const handleInterestKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addInterest(interestInput);
    } else if (e.key === "Backspace" && !interestInput && selectedInterests.length) {
      removeInterest(selectedInterests[selectedInterests.length - 1]);
    }
  };

  const handleSave = async () => {
    if (selectedInterests.length === 0) {
      setError("Please add at least one topic.");
      return;
    }
    setError("");
    setIsSaving(true);
    try {
      // Persist locally (placeholder for API)
      try { localStorage.setItem("animatch:interests", JSON.stringify(selectedInterests)); } catch {}
      // Redirect to matching page
      router.push("/match");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="bg-white p-8 md:p-10 rounded-lg shadow-lg w-full max-w-5xl">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-green-800">Select Interests</h1>
            <p className="text-sm text-gray-600">Tell us what you like; we’ll match you better</p>
          </div>
          <div className="text-sm text-gray-500">Step 2 of 2</div>
        </div>

        <div className="grid md:grid-cols-2 gap-10 items-start">
          <div>
            <h3 className="text-2xl md:text-3xl font-bold text-gray-700 leading-snug mb-6">
              <span className="block">Discover and add the</span>
              <span className="block">topics that you like</span>
            </h3>

            <div className="flex flex-wrap gap-4">
              {SUGGESTED_TOPICS.slice(0, 8).map((topic, idx) => (
                <button
                  key={topic}
                  type="button"
                  onClick={() => addInterest(topic)}
                  className={
                    `px-5 py-3 rounded-full text-sm font-medium shadow-sm transition-colors ` +
                    [
                      "bg-red-200 text-red-800 hover:bg-red-300",
                      "bg-lime-200 text-lime-900 hover:bg-lime-300",
                      "bg-teal-200 text-teal-900 hover:bg-teal-300",
                      "bg-blue-200 text-blue-900 hover:bg-blue-300",
                      "bg-pink-200 text-pink-900 hover:bg-pink-300",
                      "bg-yellow-200 text-yellow-900 hover:bg-yellow-300",
                      "bg-purple-200 text-purple-900 hover:bg-purple-300",
                      "bg-emerald-200 text-emerald-900 hover:bg-emerald-300",
                    ][idx % 8]
                  }
                >
                  {topic}
                </button>
              ))}
              <div className="w-full" />
              {SUGGESTED_TOPICS.slice(8, 12).map((topic, idx) => (
                <button
                  key={topic}
                  type="button"
                  onClick={() => addInterest(topic)}
                  className={
                    `px-8 py-3 rounded-full text-sm font-medium shadow-sm transition-colors ` +
                    [
                      "bg-teal-200 text-teal-900 hover:bg-teal-300",
                      "bg-blue-200 text-blue-900 hover:bg-blue-300",
                      "bg-pink-200 text-pink-900 hover:bg-pink-300",
                      "bg-red-200 text-red-800 hover:bg-red-300",
                    ][idx % 4]
                  }
                >
                  {topic}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-green-100 rounded-lg p-4 md:p-5 border border-green-200">
            <input
              type="text"
              value={interestInput}
              onChange={(e) => setInterestInput(e.target.value)}
              onKeyDown={handleInterestKeyDown}
              placeholder="Type a topic and press Enter"
              className="w-full mb-4 px-4 py-3 bg-white border border-green-200 rounded-md outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 text-black placeholder-gray-400"
            />

            <div className="min-h-[220px] bg-green-100 rounded-md">
              <div className="flex flex-wrap gap-3 p-2">
                {selectedInterests.length === 0 && (
                  <p className="text-sm text-gray-600 px-2">Add at least one topic to continue. Try the suggestions or type your own.</p>
                )}
                {selectedInterests.map((topic, idx) => (
                  <span
                    key={topic}
                    className={
                      `inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium ` +
                      [
                        "bg-rose-300 text-rose-900",
                        "bg-orange-200 text-orange-900",
                        "bg-sky-200 text-sky-900",
                        "bg-violet-200 text-violet-900",
                        "bg-amber-200 text-amber-900",
                        "bg-lime-200 text-lime-900",
                      ][idx % 6]
                    }
                  >
                    {topic}
                    <button
                      type="button"
                      onClick={() => removeInterest(topic)}
                      className="ml-1 w-5 h-5 inline-flex items-center justify-center rounded-full bg-white/70 text-gray-700 hover:bg-white hover:text-gray-900"
                      aria-label={`Remove ${topic}`}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-4">
              <button
                type="button"
                className="px-6 py-3 rounded-lg bg-rose-500 text-white font-semibold hover:bg-rose-600 transition-colors"
                onClick={() => router.push("/profile")}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={selectedInterests.length === 0 || isSaving}
                className={`px-6 py-3 rounded-lg font-semibold shadow-md transition-colors ${
                  selectedInterests.length === 0 || isSaving
                    ? 'bg-green-300 text-white cursor-not-allowed'
                    : 'bg-green-700 hover:bg-green-800 text-white'
                }`}
              >
                {isSaving ? 'Saving…' : 'Save'}
              </button>
            </div>
            {error && <p className="text-red-600 text-sm mt-3">{error}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
