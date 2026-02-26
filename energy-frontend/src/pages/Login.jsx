import { useState } from "react";
import { motion } from "framer-motion";
import { signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "../firebase";
import { useNavigate } from "react-router-dom";
import { Chrome, Loader2 } from "lucide-react";

export default function Login() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);

      // 🔥 Firebase popup
      const result = await signInWithPopup(auth, googleProvider);

      // 🔥 get firebase id token
      const idToken = await result.user.getIdToken();

      // 🔥 send to backend
      const res = await fetch(
        "http://127.0.0.1:5000/auth/firebase-login",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idToken }),
        }
      );

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Login failed");

      // ✅ store YOUR JWT
      localStorage.setItem("token", data.token);

      navigate("/dashboard");
    } catch (err) {
      console.error(err);
      alert("Google sign-in failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 px-4">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        {/* Card */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-8">
          {/* Title */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-white">
              Smart Energy Login
            </h1>
            <p className="text-gray-400 text-sm mt-2">
              Secure access to your energy analytics
            </p>
          </div>

          {/* Google Button */}
          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-100 text-gray-900 font-medium py-3 rounded-xl transition-all duration-200 shadow-lg disabled:opacity-70"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Signing in...
              </>
            ) : (
              <>
                <Chrome className="w-5 h-5" />
                Continue with Google
              </>
            )}
          </button>

          {/* Footer */}
          <p className="text-xs text-gray-500 text-center mt-6">
            Powered by Firebase Authentication
          </p>
        </div>
      </motion.div>
    </div>
  );
}