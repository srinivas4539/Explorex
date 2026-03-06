import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Lock, 
  Phone, 
  Check, 
  ArrowLeft, 
  Mail, 
  ShieldCheck,
  Zap
} from 'lucide-react';
import { 
  signInWithPopup, 
  RecaptchaVerifier, 
  signInWithPhoneNumber,
  User,
  GoogleAuthProvider
} from 'firebase/auth';
import { auth, googleProvider } from '../firebase';

interface LoginPageProps {
  onLoginSuccess: (user: User) => void;
  onContinueAsGuest: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess, onContinueAsGuest }) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      // This gives you a Google Access Token. You can use it to access the Google API.
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const token = credential?.accessToken;
      // The signed-in user info.
      const user = result.user;
      console.log("Successfully signed in with Google!", user);
      onLoginSuccess(user);
    } catch (error: any) {
      // Handle Errors here.
      const errorCode = error.code;
      const errorMessage = error.message;
      // The email of the user's account used.
      const email = error.customData?.email;
      // The AuthCredential type that was used.
      const credential = GoogleAuthProvider.credentialFromError(error);
      console.error("Error signing in with Google:", errorMessage);
      setError(errorMessage || "Google Login failed");
    } finally {
      setIsLoading(false);
    }
  };

  const setupRecaptcha = () => {
    if (!(window as any).recaptchaVerifier) {
      (window as any).recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container-page', {
        'size': 'invisible',
        'callback': () => {}
      });
    }
  };

  const handleSendOtp = async () => {
    if (!phoneNumber) return;
    setIsLoading(true);
    setError(null);
    try {
      setupRecaptcha();
      const appVerifier = (window as any).recaptchaVerifier;
      const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, appVerifier);
      (window as any).confirmationResult = confirmationResult;
      setIsOtpSent(true);
    } catch (err: any) {
      setError(err.message || "Failed to send OTP");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp) return;
    setIsLoading(true);
    setError(null);
    try {
      const result = await (window as any).confirmationResult.confirm(otp);
      onLoginSuccess(result.user);
    } catch (err: any) {
      setError(err.message || "Invalid OTP");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFCFB] flex flex-col">
      <header className="p-6 flex items-center justify-between">
        <div className="w-12" /> {/* Spacer */}
        <div className="flex items-center gap-2">
          <Zap className="text-emerald-500 fill-emerald-500" size={24} />
          <span className="text-xl font-black uppercase tracking-tighter">ExploreX</span>
        </div>
        <button 
          onClick={onContinueAsGuest}
          className="text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-emerald-500 transition-colors"
        >
          Skip
        </button>
      </header>

      <main className="flex-1 flex items-center justify-center p-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-white rounded-[3rem] p-10 shadow-2xl shadow-black/5 border border-gray-100 relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-full h-2 bg-emerald-500" />
          
          <div className="text-center mb-10">
            <div className="w-20 h-20 bg-emerald-500 rounded-[2rem] flex items-center justify-center text-white mx-auto mb-6 shadow-2xl shadow-emerald-500/20">
              <ShieldCheck size={40} />
            </div>
            <h2 className="text-4xl font-black text-gray-900 uppercase tracking-tighter leading-none">Welcome Back</h2>
            <p className="text-gray-500 font-bold mt-3">Your sustainable journey continues here.</p>
          </div>

          {error && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-xs font-bold text-center"
            >
              {error}
            </motion.div>
          )}

          <div className="space-y-6">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleGoogleLogin}
              disabled={isLoading}
              className="w-full py-5 bg-white border border-gray-100 rounded-2xl flex items-center justify-center gap-4 text-gray-900 font-black uppercase tracking-widest shadow-sm hover:bg-gray-50 transition-all disabled:opacity-50"
            >
              <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="Google" />
              Continue with Google
            </motion.button>

            <div className="relative flex items-center justify-center py-4">
              <div className="absolute w-full h-px bg-gray-100" />
              <span className="relative px-6 bg-white text-[10px] font-black text-gray-300 uppercase tracking-[0.4em]">Secure Access</span>
            </div>

            <div id="recaptcha-container-page" />

            {!isOtpSent ? (
              <div className="space-y-4">
                <div className="relative group">
                  <Phone className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-emerald-500 transition-colors" size={20} />
                  <input 
                    type="tel" 
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="+91 9876543210"
                    className="w-full pl-16 pr-6 py-5 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold outline-none focus:border-emerald-500 focus:bg-white transition-all"
                  />
                </div>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleSendOtp}
                  disabled={isLoading || !phoneNumber}
                  className="w-full py-5 bg-emerald-500 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-emerald-500/20 disabled:opacity-50"
                >
                  {isLoading ? 'Sending...' : 'Send OTP'}
                </motion.button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="relative group">
                  <Check className="absolute left-6 top-1/2 -translate-y-1/2 text-emerald-500" size={20} />
                  <input 
                    type="text" 
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    placeholder="Enter 6-digit OTP"
                    className="w-full pl-16 pr-6 py-5 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold outline-none focus:border-emerald-500 focus:bg-white transition-all"
                  />
                </div>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleVerifyOtp}
                  disabled={isLoading || !otp}
                  className="w-full py-5 bg-emerald-500 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-emerald-500/20 disabled:opacity-50"
                >
                  {isLoading ? 'Verifying...' : 'Verify & Login'}
                </motion.button>
                <button 
                  onClick={() => setIsOtpSent(false)}
                  className="w-full text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-emerald-600 transition-colors"
                >
                  Change Phone Number
                </button>
              </div>
            )}

            <button 
              onClick={onContinueAsGuest}
              className="w-full py-4 text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] hover:text-gray-900 transition-colors"
            >
              Continue as Guest
            </button>
          </div>

          <div className="mt-12 text-center">
            <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest flex items-center justify-center gap-2">
              <Lock size={12} /> End-to-End Encrypted Authentication
            </p>
          </div>
        </motion.div>
      </main>

      <footer className="p-8 text-center">
        <p className="text-gray-400 text-xs font-medium">
          By continuing, you agree to ExploreX's <span className="text-gray-900 font-bold underline cursor-pointer">Terms</span> and <span className="text-gray-900 font-bold underline cursor-pointer">Privacy Policy</span>.
        </p>
      </footer>
    </div>
  );
};
