"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function ProfileEditPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  
  // Profile data
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [course, setCourse] = useState("");
  const [dorm, setDorm] = useState("");
  const [organizations, setOrganizations] = useState([]);
  const [orgInput, setOrgInput] = useState("");
  
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

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const userEmail = localStorage.getItem("userEmail");
        if (!userEmail) {
          router.push("/login");
          return;
        }
        
        setEmail(userEmail);
        
        // Fetch user profile
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/exist`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: userEmail })
        });
        
        if (response.ok) {
          const data = await response.json();
          setUsername(data.user?.username || "");
          
          // Load interests if available
          const interests = data.user?.interests || {};
          setCourse(interests.course || "");
          setDorm(interests.dorm || "");
          setOrganizations(interests.organizations || []);
        }
      } catch (err) {
        console.error("Error loading profile:", err);
        setError("Failed to load profile");
      } finally {
        setLoading(false);
      }
    };
    
    loadProfile();
  }, [router]);

  const addOrganization = (value) => {
    const v = (value || "").trim();
    if (!v) return;
    setOrganizations((prev) => 
      prev.some((org) => org.toLowerCase() === v.toLowerCase()) 
        ? prev 
        : [...prev, v].slice(0, 10)
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

  const handleSave = async () => {
    if (!course || !dorm || organizations.length === 0) {
      setError("Please fill in all fields");
      return;
    }
    
    setSaving(true);
    setError(null);
    setSuccess(false);
    
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/upload/interests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          interests: {
            course,
            dorm,
            organizations
          }
        })
      });
      
      if (!response.ok) {
        throw new Error("Failed to update interests");
      }
      
      setSuccess(true);
      setTimeout(() => {
        router.push("/profile");
      }, 1500);
    } catch (err) {
      console.error("Error saving interests:", err);
      setError("Failed to save interests. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-green-800">Edit Interests</h1>
          <p className="text-sm text-gray-600 mt-1">
            Update your interests to find better matches
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6 space-y-6">
          {/* Username (display only) */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Username
            </label>
            <p className="text-gray-900 font-medium">{username}</p>
          </div>

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
                className="w-full mb-3 px-4 py-2 bg-white border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 text-sm"
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

          {/* Error/Success Messages */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}
          
          {success && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-md">
              <p className="text-green-600 text-sm">✓ Interests updated successfully!</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-4 pt-4">
            <Link 
              href="/profile" 
              className="px-6 py-3 rounded-lg bg-gray-200 text-gray-700 font-semibold hover:bg-gray-300 transition-colors"
            >
              Cancel
            </Link>
            <button
              onClick={handleSave}
              disabled={!course || !dorm || organizations.length === 0 || saving}
              className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
                !course || !dorm || organizations.length === 0 || saving
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-green-700 hover:bg-green-800 text-white'
              }`}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
