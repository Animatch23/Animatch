"use client";
import { GoogleOAuthProvider } from '@react-oauth/google';

export default function Providers({ children }) {
  return (
    <GoogleOAuthProvider clientId="883429365227-kbb16mbl3iefqh3q5258fjhtdtp0ibvt.apps.googleusercontent.com">
      {children}
    </GoogleOAuthProvider>
  );
}