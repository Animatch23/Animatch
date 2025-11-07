"use client";

import { useState } from "react";

export default function ProfileSetup() {
  const [username, setUsername] = useState("");
  const [photo, setPhoto] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

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

  const handleContinue = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    
    try {
      // Prepare form data for backend
      const formData = new FormData();
      formData.append('username', username);
      if (photoFile) {
        formData.append('profilePhoto', photoFile);
      }

      // TODO: Send to backend API
      // const response = await fetch('/api/profile/setup', {
      //   method: 'POST',
      //   body: formData,
      // });
      
      // For now, just log the data
      console.log("Username:", username);
      console.log("Photo file:", photoFile);
      console.log("FormData prepared for backend:", formData);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // TODO: Navigate to dashboard after successful save
      console.log("Profile setup completed!");
      
    } catch (error) {
      console.error("Error saving profile:", error);
      setErrors({ submit: "Failed to save profile. Please try again." });
    } finally {
      setIsSubmitting(false);
    }
  };

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

        {/* Continue button */}
        <div className="flex justify-end">
          <button
            onClick={handleContinue}
            disabled={isSubmitting || !username.trim()}
            className={`px-8 py-3 rounded-full shadow-md font-medium transition-colors ${
              isSubmitting || !username.trim()
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-green-800 hover:bg-green-900 text-white'
            }`}
          >
            {isSubmitting ? 'Setting up...' : 'Continue'}
          </button>
        </div>
      </div>
    </div>
  );
}