"use client";

import { useState, useEffect, useMemo, useRef } from "react";
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
  const [initialUsername, setInitialUsername] = useState("");
  const [profilePhotoFile, setProfilePhotoFile] = useState(null);
  const [profilePhotoPreview, setProfilePhotoPreview] = useState("");
  const [course, setCourse] = useState("");
  const [customCourse, setCustomCourse] = useState("");
  const [dorm, setDorm] = useState("");
  const [organizations, setOrganizations] = useState([]);
  const [orgInput, setOrgInput] = useState("");
  const fileInputRef = useRef(null);
  const finalCourse = course === "Other" ? customCourse : course;
  
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
          setInitialUsername(data.user?.username || "");
          // Set profile picture preview
          if (data.user?.profilePicture?.url) {
            const previewUrl = data.user.profilePicture.url;
            // If the backend returns a relative path (e.g., '/uploads/xyz.jpg'),
            // prefix it with the configured API URL and /api path so that the browser loads
            // the image from the backend host in development (matching profile/page.js behavior).
            const resolved = previewUrl.startsWith('http') || previewUrl.startsWith('data:') || previewUrl.startsWith('blob:')
              ? previewUrl
              : `${process.env.NEXT_PUBLIC_API_URL}/api${previewUrl}`;
            setProfilePhotoPreview(resolved);
          }
          
          // Load profile data - check both old and new structure for backwards compatibility
          const dbCourse = data.user?.course || data.user?.interests?.course || "";
          if (dbCourse && !COURSES.includes(dbCourse)) {
            setCourse("Other");
            setCustomCourse(dbCourse);
          } else {
            setCourse(dbCourse);
          }
          setDorm(data.user?.housing || data.user?.interests?.dorm || data.user?.interests?.housing || "");
          setOrganizations(data.user?.organizations || data.user?.interests?.organizations || []);
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
    if (!finalCourse || !dorm || organizations.length === 0) {
      setError("Please fill in all fields");
      return;
    }
    
    setSaving(true);
    setError(null);
    setSuccess(false);
    
    try {
      // If user updated username or profile photo, send multipart/form-data to /api/upload
      if (profilePhotoFile || username !== initialUsername) {
        const formData = new FormData();
        formData.append('email', email);
        formData.append('username', username);
        if (profilePhotoFile) {
          formData.append('profilePhoto', profilePhotoFile);
        }
        // Do not forcibly set acceptTerms here for updates; for new user it's used
        const profileResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/upload`, {
          method: 'POST',
          body: formData
        });
        if (!profileResponse.ok) {
          const errorData = await profileResponse.json();
          throw new Error(errorData.message || 'Failed to update username/profile photo');
        }
        const updatedProfile = await profileResponse.json();
        // Update local states from server response
        setInitialUsername(updatedProfile.user?.username || username);
        if (updatedProfile.user?.profilePicture?.url) {
          const previewUrl = updatedProfile.user.profilePicture.url;
          const resolved = previewUrl.startsWith('http') || previewUrl.startsWith('data:') || previewUrl.startsWith('blob:')
            ? previewUrl
            : `${process.env.NEXT_PUBLIC_API_URL}/api${previewUrl}`;
          setProfilePhotoPreview(resolved);
          // Reset the file input after successful upload so users can
          // choose the same file again if they want to re-upload
          if (fileInputRef?.current) {
            fileInputRef.current.value = '';
          }
        }
      }
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/upload/interests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          interests: {
            course: finalCourse,
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
          <div className="flex items-start gap-6">
            <div className="flex-1">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Profile Photo</label>
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center border">
                  {profilePhotoPreview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={profilePhotoPreview} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-sm text-gray-500">No photo</span>
                  )}
                </div>
                <div>
                  {/* Hidden file input - visually styled button will trigger this */}
                  <input
                    id="profile-photo-input"
                    name="profilePhoto"
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    ref={fileInputRef}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      setProfilePhotoFile(f);
                      setProfilePhotoPreview(URL.createObjectURL(f));
                    }}
                  />

                  <div className="flex items-center gap-3">
                    <label
                      htmlFor="profile-photo-input"
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-gray-200 bg-white text-sm text-gray-700 hover:bg-gray-50 cursor-pointer transition-all shadow-sm"
                    >
                      <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V7M8 7V5a4 4 0 118 0v2" />
                      </svg>
                      <span>{profilePhotoPreview ? 'Replace Photo' : 'Choose Photo'}</span>
                    </label>

                    {/* Show selected file name or a hint */}
                    <div className="text-sm text-gray-500">
                      {profilePhotoFile ? (
                        <span className="inline-block max-w-[200px] truncate">{profilePhotoFile.name}</span>
                      ) : (
                        <span className="italic">PNG, JPG up to 5MB</span>
                      )}
                    </div>

                    {/* Show remove button when a preview exists */}
                    {profilePhotoPreview && (
                      <button
                        type="button"
                        onClick={() => {
                          setProfilePhotoFile(null);
                          setProfilePhotoPreview("");
                          if (fileInputRef?.current) fileInputRef.current.value = '';
                        }}
                        className="text-sm text-rose-600 hover:underline"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  {/* File hint - PNG/JPG size note */}
                </div>
              </div>
            </div>
            <div className="flex-1">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 text-black"
              />
            </div>
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
            {course === "Other" && (
              <input
                type="text"
                value={customCourse}
                onChange={(e) => setCustomCourse(e.target.value)}
                placeholder="Type your course..."
                className="mt-3 w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500 text-black"
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
              disabled={!finalCourse || !dorm || organizations.length === 0 || saving}
              className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
                !finalCourse || !dorm || organizations.length === 0 || saving
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
