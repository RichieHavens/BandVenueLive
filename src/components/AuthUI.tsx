import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../AuthContext';
import { useNavigationContext } from '../context/NavigationContext';
import { motion } from 'motion/react';
import { Music, Mail, Lock, Loader2, UserPlus, CheckCircle2, Eye, EyeOff } from 'lucide-react';

export default function AuthUI({ onSuccess }: { onSuccess?: () => void }) {
  const { user } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [showResendButton, setShowResendButton] = useState(false);

  useEffect(() => {
    const savedEmail = localStorage.getItem('rememberedEmail');
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, []);

  const resetAuthFlow = () => {
    setError(null);
    setSuccess(null);
    setShowResendButton(false);
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Auth attempt started");
    setLoading(true);
    resetAuthFlow();

    const emailToAuth = email.trim().toLowerCase();
    
    try {
      if (isForgotPassword) {
        const { error } = await supabase.auth.resetPasswordForEmail(emailToAuth, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        setSuccess('Password reset link sent! Please check your email.');
      } else if (isSignUp) {
        const { error } = await supabase.auth.signUp({ 
          email: emailToAuth, 
          password,
          options: {
            emailRedirectTo: window.location.origin
          }
        });
        if (error) {
          if (error.message.toLowerCase().includes('already registered') || error.message.toLowerCase().includes('user already exists')) {
            setError('This email already has an account. Click forgot password and check your email to reset it.');
          } else {
            throw error;
          }
        } else {
          setSuccess('Check your email for the confirmation link!');
          setShowResendButton(true);
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email: emailToAuth, password });
        if (error) {
          console.error("Login Error Details:", error);
          if (error.message.includes('Invalid login credentials')) {
            throw new Error('Invalid email or password. Please check your credentials and try again.');
          }
          if (error.message.includes('Email not confirmed')) {
            setShowResendButton(true);
            throw new Error('Please confirm your email address before logging in. Check your inbox for the confirmation link.');
          }
          throw error;
        }
        
        if (rememberMe) {
          localStorage.setItem('rememberedEmail', emailToAuth);
        } else {
          localStorage.removeItem('rememberedEmail');
        }
        if (onSuccess) onSuccess();
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResendConfirmation = async () => {
    if (!email) {
      setError('Please enter your email address first.');
      return;
    }
    setResending(true);
    setError(null);
    setSuccess(null);
    const emailToResend = email.trim().toLowerCase();
    
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: emailToResend,
        options: {
          emailRedirectTo: window.location.origin
        }
      });
      if (error) throw error;
      setSuccess('Confirmation email resent! Please check your inbox.');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setResending(false);
    }
  };

  const toggleSignUp = () => {
    setIsSignUp(!isSignUp);
    resetAuthFlow();
  };

  const toggleForgotPassword = () => {
    setIsForgotPassword(!isForgotPassword);
    resetAuthFlow();
  };

  const updateEmail = (val: string) => {
    setEmail(val);
    resetAuthFlow();
  };

  const updatePassword = (val: string) => {
    setPassword(val);
    resetAuthFlow();
  };

  const { setActiveTab } = useNavigationContext();

  useEffect(() => {
    if (user) {
      setActiveTab('dashboard');
    }
  }, [user, setActiveTab]);

  return (
    <div 
      className="min-h-screen flex flex-col items-center justify-center bg-neutral-950 p-4 relative overflow-hidden"
    >
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-neutral-900/90 backdrop-blur-xl border border-neutral-800 rounded-3xl p-6 shadow-2xl text-white relative z-10"
      >
        <div className="text-center mb-4">
          <img 
            src="/bandvenue_transparent.png" 
            alt="BandVenue Logo" 
            className="h-24 w-auto mx-auto mb-4 object-contain max-w-full"
            referrerPolicy="no-referrer"
          />
          {!isForgotPassword && (
            <div className="space-y-1">
              <h2 className="text-xl font-medium text-neutral-300">
                {isSignUp ? 'Create Account' : 'Welcome back'}
              </h2>
              <button
                type="button"
                onClick={toggleSignUp}
                className="text-sm text-neutral-400 hover:text-primary font-medium transition-colors"
              >
                {isSignUp ? 'Already have an account? Sign In' : 'New to BandVenue? Create account'}
              </button>
            </div>
          )}
        </div>

          <form onSubmit={handleAuth} className="space-y-4">
            <div className="space-y-3">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-neutral-400 ml-1 uppercase tracking-wider">Email</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500" size={18} />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-2xl py-3 pl-12 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                    placeholder="you@example.com"
                  />
                </div>
              </div>

              {!isForgotPassword && (
                <div className="space-y-2">
                  <div className="flex justify-between items-center ml-1">
                    <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Password</label>
                    {!isSignUp && (
                      <button
                        type="button"
                        onClick={() => { setIsForgotPassword(true); setError(null); setSuccess(null); }}
                        className="text-xs text-primary hover:text-primary/80 transition-colors"
                      >
                        Forgot Password?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500" size={18} />
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-2xl py-3 pl-12 pr-12 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {!isForgotPassword && !isSignUp && (
              <div className="flex items-center gap-3 ml-1">
                <button
                  type="button"
                  onClick={() => setRememberMe(!rememberMe)}
                  className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${rememberMe ? 'bg-primary border-primary' : 'bg-neutral-950 border-neutral-800'}`}
                >
                  {rememberMe && <CheckCircle2 size={14} className="text-white" />}
                </button>
                <span className="text-sm text-neutral-400 cursor-pointer" onClick={() => setRememberMe(!rememberMe)}>
                  Remember me
                </span>
              </div>
            )}

            {error && (
              <div className="p-3 bg-red-950/30 border border-red-900/50 text-red-400 text-sm rounded-xl text-center">
                {error}
              </div>
            )}
            {success && (
              <div className="p-3 bg-green-950/30 border border-green-900/50 text-green-400 text-sm rounded-xl text-center">
                {success}
              </div>
            )}

            {showResendButton && (
              <button
                type="button"
                onClick={handleResendConfirmation}
                disabled={resending}
                className="w-full bg-neutral-800 hover:bg-neutral-700 text-white font-medium py-3 rounded-2xl transition-all disabled:opacity-50"
              >
                {resending ? 'Resending...' : 'Resend confirmation email'}
              </button>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-3.5 rounded-2xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/20 border border-primary/20 hover:border-primary/40 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : (isForgotPassword ? 'Send Reset Link' : isSignUp ? 'Create Account' : 'Sign In')}
            </button>
          </form>

          {isForgotPassword && (
            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={toggleForgotPassword}
                className="text-neutral-400 hover:text-white text-sm font-medium transition-colors"
              >
                Back to Sign In
              </button>
            </div>
          )}
      </motion.div>
    </div>
  );
}
