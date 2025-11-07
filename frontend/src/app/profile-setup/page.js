"use client";

import { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ProfileSetup() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [photo, setPhoto] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [email, setEmail] = useState(null);
  const [token, setToken] = useState(null);

  useEffect(() => {
    // Get pending email and token from sessionStorage
    const pendingEmail = sessionStorage.getItem("pendingEmail");
    const pendingToken = sessionStorage.getItem("pendingToken");
    const termsAccepted = sessionStorage.getItem("termsAccepted");
    
    if (!pendingEmail || !pendingToken || !termsAccepted) {
      // If no pending data or terms not accepted, redirect to login
      router.push("/login");
      return;
    }
    
    setEmail(pendingEmail);
    setToken(pendingToken);
  }, [router]);
  const [step, setStep] = useState(1); // 1: basic, 2: interests

  // Interests state - structured for matchmaking
  const [course, setCourse] = useState("");
  const [dorm, setDorm] = useState("");
  const [organizations, setOrganizations] = useState([]);
  const [orgInput, setOrgInput] = useState("");
  
  // Common options
  const COURSES = useMemo(
    () => [
      "Computer Science",
      "Engineering",
      "Business",
      "Liberal Arts",
      "Sciences",
      "Architecture",
      "Education",
      "Medicine",
      "Law",
      "Other"
    ],
    []
  );
  
  const DORMS = useMemo(
    () => [
      "Dorm A",
      "Dorm B", 
      "Dorm C",
      "Dorm D",
      "Off-Campus",
      "Commuter"
    ],
    []
  );

  const SUGGESTED_ORGS = useMemo(
    () => [
      "Anime Club",
      "Gaming Society",
      "Tech Club",
      "Sports Club",
      "Music Club",
      "Art Society",
      "Dance Crew",
      "Drama Club",
      "Debate Team",
      "Student Government",
      "Photography Club",
      "Film Society",
      "Book Club",
      "Coding Club",
      "Robotics Team",
      "Environmental Club",
      "Volunteer Corps",
      "Business Club"
    ],
    []
  );

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
    
    try {
      const profile = { username, hasPhoto: Boolean(photoFile) };
      try { localStorage.setItem("animatch:profile", JSON.stringify(profile)); } catch {}
      setStep(2);
    } catch (error) {
      console.error("Error saving profile locally:", error);
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    
    // Validate interests
    if (step === 2 && (!course || !dorm || organizations.length === 0)) {
      setErrors((e) => ({ 
        ...e, 
        interests: "Please select your course, dorm, and at least one organization" 
      }));
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      if (!email) {
        throw new Error("Email not found");
      }

      // Create profile using upload route WITH terms acceptance
      const formData = new FormData();
      formData.append('email', email);
      formData.append('username', username);
      formData.append('acceptTerms', 'true'); // Include terms acceptance
      
      // Add photo file if it exists
      if (photoFile) {
        formData.append('profilePhoto', photoFile);
      }

      const profileResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!profileResponse.ok) {
        const errorData = await profileResponse.json();
        throw new Error(errorData.message || "Failed to save profile");
      }

      console.log("Profile created successfully with terms accepted!");
      
      // Save interests to backend (structured format)
      const interestsData = {
        email,
        interests: {
          course,
          dorm,
          organizations
        }
      };
      
      console.log("Sending interests:", interestsData);
      
      const interestsResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/upload/interests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(interestsData),
      });

      if (!interestsResponse.ok) {
        console.warn("Failed to save interests, but profile was created");
        const errorData = await interestsResponse.json();
        console.error("Interests error:", errorData);
      } else {
        console.log("Interests saved successfully!");
      }
      
      // NOW store the session token in localStorage (only after successful profile creation)
      localStorage.setItem("sessionToken", token);
      localStorage.setItem("userEmail", email);
      
      // Clear sessionStorage
      sessionStorage.removeItem("pendingEmail");
      sessionStorage.removeItem("pendingToken");
      sessionStorage.removeItem("termsAccepted");

      console.log("Profile setup completed successfully! Redirecting to match...");
      
      // Use window.location for more reliable redirect
      window.location.href = '/match';

    } catch (error) {
      console.error("Error during profile setup:", error);
      setErrors({ submit: error.message || "Failed to complete setup. Please try again." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const addOrganization = (value) => {
    const v = (value || "").trim();
    if (!v) return;
    setOrganizations((prev) => 
      prev.some((org) => org.toLowerCase() === v.toLowerCase()) 
        ? prev 
        : [...prev, v].slice(0, 10) // Max 10 organizations
    );
    setOrgInput("");
  };

  const removeOrganization = (value) => 
    setOrganizations((prev) => prev.filter((org) => org !== value));

  const handleOrgKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addOrganization(orgInput);
    } else if (e.key === "Backspace" && !orgInput && organizations.length) {
      removeOrganization(organizations[organizations.length - 1]);
    }
  };

  if (!email) {
    return null; // or a loading spinner
  }

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
            <div className="space-y-6">
              {/* Course Selection */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Your Course / Major *
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {COURSES.map((courseOption) => (
                    <button
                      key={courseOption}
                      type="button"
                      onClick={() => setCourse(courseOption)}
                      className={`px-4 py-3 rounded-lg border-2 text-sm font-medium transition-all ${
                        course === courseOption
                          ? 'border-green-600 bg-green-50 text-green-800'
                          : 'border-gray-200 bg-white text-gray-700 hover:border-green-300'
                      }`}
                    >
                      {courseOption}
                    </button>
                  ))}
                </div>
                {course === "Other" && (
                  <input
                    type="text"
                    placeholder="Type your course..."
                    onChange={(e) => setCourse(e.target.value)}
                    className="mt-3 w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                )}
              </div>

              {/* Dorm Selection */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Your Housing *
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {DORMS.map((dormOption) => (
                    <button
                      key={dormOption}
                      type="button"
                      onClick={() => setDorm(dormOption)}
                      className={`px-4 py-3 rounded-lg border-2 text-sm font-medium transition-all ${
                        dorm === dormOption
                          ? 'border-blue-600 bg-blue-50 text-blue-800'
                          : 'border-gray-200 bg-white text-gray-700 hover:border-blue-300'
                      }`}
                    >
                      {dormOption}
                    </button>
                  ))}
                </div>
              </div>

              {/* Organizations Selection */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Your Organizations & Clubs *
                </label>
                
                {/* Suggested organizations */}
                <div className="mb-4">
                  <p className="text-xs text-gray-500 mb-2">Popular organizations:</p>
                  <div className="flex flex-wrap gap-2">
                    {SUGGESTED_ORGS.slice(0, 12).map((org) => (
                      <button
                        key={org}
                        type="button"
                        onClick={() => addOrganization(org)}
                        disabled={organizations.includes(org)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                          organizations.includes(org)
                            ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                            : 'bg-purple-100 text-purple-800 hover:bg-purple-200'
                        }`}
                      >
                        {org} {organizations.includes(org) && '✓'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom organization input */}
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <input
                    type="text"
                    value={orgInput}
                    onChange={(e) => setOrgInput(e.target.value)}
                    onKeyDown={handleOrgKeyDown}
                    placeholder="Type a club/organization and press Enter..."
                    className="w-full mb-3 px-4 py-2 bg-white border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
                  />

                  {/* Selected organizations */}
                  <div className="min-h-[80px]">
                    {organizations.length === 0 ? (
                      <p className="text-sm text-gray-500 italic">
                        Add at least one organization from the suggestions or type your own.
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {organizations.map((org, idx) => (
                          <span
                            key={org}
                            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
                              [
                                'bg-rose-200 text-rose-900',
                                'bg-orange-200 text-orange-900',
                                'bg-sky-200 text-sky-900',
                                'bg-violet-200 text-violet-900',
                                'bg-amber-200 text-amber-900',
                                'bg-lime-200 text-lime-900',
                              ][idx % 6]
                            }`}
                          >
                            {org}
                            <button
                              type="button"
                              onClick={() => removeOrganization(org)}
                              className="w-4 h-4 inline-flex items-center justify-center rounded-full bg-white/70 hover:bg-white text-xs"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Error message */}
              {errors.interests && (
                <p className="text-red-600 text-sm">{errors.interests}</p>
              )}

              {/* Action buttons */}
              <div className="flex justify-between pt-4">
                <button
                  type="button"
                  className="px-6 py-3 rounded-lg bg-gray-200 text-gray-700 font-semibold hover:bg-gray-300 transition-colors"
                  onClick={() => setStep(1)}
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={!course || !dorm || organizations.length === 0 || isSubmitting}
                  className={`px-6 py-3 rounded-lg font-semibold shadow-md transition-colors ${
                    !course || !dorm || organizations.length === 0 || isSubmitting
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-green-700 hover:bg-green-800 text-white'
                  }`}
                >
                  {isSubmitting ? 'Saving…' : 'Complete Setup'}
                </button>
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