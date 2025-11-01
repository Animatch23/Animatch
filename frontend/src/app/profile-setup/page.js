"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

export default function ProfileSetup() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [photo, setPhoto] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [step, setStep] = useState(1); // 1: basic, 2: interests

  // Interests UI (UI only for now)
  const SUGGESTED_TOPICS = useMemo(
    () => [
      "Sports",
      "Movies",
      "Music",
      "Books",
      "Technology",
      "Gaming",
      "Cooking",
      "Travel",
      "Anime",
      "Pets",
      "Fitness",
      "Art",
      "Science",
      "History",
      "Finance",
      "Programming",
      "Startups",
      "Photography",
      "Nature",
      "Food",
      "K‑dramas",
    ],
    []
  );
  const [selectedInterests, setSelectedInterests] = useState(["Coffee", "Hiking"]);
  const [interestInput, setInterestInput] = useState("");

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setErrors({ ...errors, photo: "Image must be less than 5MB" });
        return;
      }
      
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setErrors({ ...errors, photo: "Please select a valid image file" });
        return;
      }

      setPhoto(URL.createObjectURL(file)); // preview
      setPhotoFile(file); // actual file for upload
      setErrors({ ...errors, photo: null }); // clear error
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!username.trim()) {
      newErrors.username = "Username is required";
    } else if (username.length < 3) {
      newErrors.username = "Username must be at least 3 characters";
    } else if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      newErrors.username = "Username can only contain letters, numbers, and underscores";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleGoToInterests = async () => {
    // Username required, photo optional
    if (!validateForm()) return;
    setIsSubmitting(true);
    try {
      const profile = { username, hasPhoto: Boolean(photoFile) };
      try { localStorage.setItem("animatch:profile", JSON.stringify(profile)); } catch {}
      setStep(2);
    } finally {
      setIsSubmitting(false);
    }
  };

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
      setErrors((e) => ({ ...e, interests: "Please add at least one topic." }));
      return;
    }
    setErrors((e) => ({ ...e, interests: null }));
    setIsSubmitting(true);
    try {
      try { localStorage.setItem("animatch:interests", JSON.stringify(selectedInterests)); } catch {}
      router.push("/match");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Interests logic removed here; handled in /profile/interests

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="bg-white p-8 md:p-10 rounded-lg shadow-lg w-full max-w-5xl">
        {/* Title */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-green-800">Profile Setup</h1>
            <p className="text-sm text-gray-600">Let's set up your AniMatch profile to get started</p>
          </div>
          <div className="text-sm text-gray-500">Step {step} of 2</div>
        </div>

        {/* Step 1: Basic Info */}
        {step === 1 && (
        <>
            <div className="grid md:grid-cols-2 gap-8 mb-8">
              {/* Photo upload */}
              <div className="flex flex-col items-center">
                <label className="cursor-pointer flex flex-col items-center">
                  <div className="w-32 h-32 bg-green-50 border-2 border-dashed border-green-300 rounded-lg flex items-center justify-center mb-3 shadow-sm hover:bg-green-100 transition-colors">
                    {photo ? (
                      <img
                        src={photo}
                        alt="Profile Preview"
                        className="w-32 h-32 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="text-center">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-12 w-12 text-green-600 mx-auto mb-2"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                          />
                        </svg>
                        <span className="text-sm text-green-700">Upload Photo</span>
                      </div>
                    )}
                  </div>
                  <span className="text-green-800 font-medium text-sm">
                    {photo ? "Change Photo" : "Add Profile Photo"}
                  </span>
                  <span className="text-xs text-gray-500 mt-1">JPG, PNG or GIF (max 5MB)</span>
                  <input type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
                </label>
                {errors.photo && <p className="text-red-500 text-xs mt-2">{errors.photo}</p>}
              </div>

              {/* Username input */}
              <div className="flex flex-col justify-center">
                <input
                  type="text"
                  placeholder="Username *"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className={`w-full px-4 py-3 bg-gray-50 border rounded-md outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors text-black placeholder-gray-400 ${
                    errors.username ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.username && (
                  <p className="text-red-500 text-xs mt-2">{errors.username}</p>
                )}
                <p className="text-xs text-gray-500 mt-1">This will be your display name on AniMatch</p>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleGoToInterests}
                disabled={!username.trim() || isSubmitting}
                className={`px-8 py-3 rounded-full shadow-md font-medium transition-colors ${
                  !username.trim() || isSubmitting
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-green-800 hover:bg-green-900 text-white'
                }`}
              >
                Continue
              </button>
            </div>
          </>
          )}
        
          {/* Step 2: Interests (in-page) */}
          {step === 2 && (
            <div className="grid md:grid-cols-2 gap-10 items-start mt-8">
              {/* Left: headline + suggestions */}
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

              {/* Right: input + selected list inside a panel */}
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

                {/* Action buttons */}
                <div className="mt-6 flex justify-end gap-4">
                  <button
                    type="button"
                    className="px-6 py-3 rounded-lg bg-rose-500 text-white font-semibold hover:bg-rose-600 transition-colors"
                    onClick={() => setStep(1)}
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={selectedInterests.length === 0 || isSubmitting}
                    className={`px-6 py-3 rounded-lg font-semibold shadow-md transition-colors ${
                      selectedInterests.length === 0 || isSubmitting
                        ? 'bg-green-300 text-white cursor-not-allowed'
                        : 'bg-green-700 hover:bg-green-800 text-white'
                    }`}
                  >
                    {isSubmitting ? 'Saving…' : 'Save'}
                  </button>
                </div>
                {errors.interests && (
                  <p className="text-red-600 text-sm mt-3">{errors.interests}</p>
                )}
              </div>
            </div>
          )}

        {/* Error message */}
        {errors.submit && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-600 text-sm">{errors.submit}</p>
          </div>
        )}
      </div>
    </div>
  );
}