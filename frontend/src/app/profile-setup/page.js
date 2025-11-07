"use client";

import { useState, useEffect } from "react";
import { useRouter } from 'next/navigation';

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
    
    if (!pendingEmail || !pendingToken) {
      // If no pending data, redirect to login
      router.push("/login");
      return;
    }
    
    setEmail(pendingEmail);
    setToken(pendingToken);
  }, [router]);

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

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    
    try {
      if (!email) {
        throw new Error("Email not found");
      }

      // Create profile using upload route
      const formData = new FormData();
      formData.append('email', email);
      formData.append('username', username);
      
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

      // Accept terms and conditions AFTER user is created
      const termsResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/terms/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: email,
          version: "1.0"
        }),
      });

      if (!termsResponse.ok) {
        throw new Error("Failed to accept terms");
      }

      // NOW store the session token in localStorage
      localStorage.setItem("sessionToken", token);
      
      // Clear sessionStorage
      sessionStorage.removeItem("pendingEmail");
      sessionStorage.removeItem("pendingToken");

      console.log("Profile setup completed successfully!");
      router.push("/match");

    } catch (error) {
      console.error("Error during profile setup:", error);
      setErrors({ submit: error.message || "Failed to complete setup. Please try again." });
      setIsSubmitting(false);
    }
  };

  if (!email) {
    return null; // or a loading spinner
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="bg-white p-10 rounded-lg shadow-lg w-full max-w-xl text-center">
        {/* Title */}
        <h1 className="text-3xl font-bold text-green-800 mb-2">Profile Setup</h1>
        <p className="text-sm text-gray-600 mb-8">
          Let's set up your AniMatch profile to get started
        </p>

        {/* Photo upload */}
        <div className="mb-6">
          <label className="cursor-pointer flex flex-col items-center">
            <div className="w-32 h-32 bg-green-50 border-2 border-dashed border-green-300 rounded-lg flex items-center justify-center mb-3 shadow-sm hover:bg-green-100 transition-colors">
              {photo ? (
                // eslint-disable-next-line @next/next/no-img-element
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
            <span className="text-xs text-gray-500 mt-1">
              JPG, PNG or GIF (max 5MB)
            </span>
            <input 
              type="file" 
              accept="image/*" 
              onChange={handlePhotoChange} 
              className="hidden" 
            />
          </label>
          {errors.photo && (
            <p className="text-red-500 text-xs mt-2">{errors.photo}</p>
          )}
        </div>

        {/* Username input */}
        <div className="mb-6">
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
            <p className="text-red-500 text-xs mt-2 text-left">{errors.username}</p>
          )}
          <p className="text-xs text-gray-500 mt-1 text-left">
            This will be your display name on AniMatch
          </p>
        </div>

        {/* Error message */}
        {errors.submit && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-600 text-sm">{errors.submit}</p>
          </div>
        )}

        {/* Submit button */}
        <div className="flex justify-end">
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !username.trim()}
            className={`px-8 py-3 rounded-full shadow-md font-medium transition-colors ${
              isSubmitting || !username.trim()
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-green-800 hover:bg-green-900 text-white'
            }`}
          >
            {isSubmitting ? 'Setting up...' : 'Complete Setup'}
          </button>
        </div>
      </div>
    </div>
  );
}