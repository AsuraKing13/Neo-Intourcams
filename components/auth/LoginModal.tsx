import React, { useState, useCallback } from 'react';
import Modal from '../ui/Modal.tsx';
import Input from '../ui/Input.tsx';
import Button from '../ui/Button.tsx';
import { useAppContext } from '../AppContext.tsx';
import { LoginIcon } from '../../constants.tsx';
import { useToast } from '../ToastContext.tsx';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose }) => {
  const { loginUserWithPassword, resetPasswordForEmail } = useAppContext();
  const { showToast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isForgotPassword, setIsForgotPassword] = useState(false);

  const handleClose = useCallback(() => {
    setEmail('');
    setPassword('');
    setError(null);
    setIsLoading(false);
    setIsForgotPassword(false);
    onClose();
  }, [onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      if (isForgotPassword) {
        await resetPasswordForEmail(email);
        showToast('Password reset link sent to your email!', 'success');
        setIsForgotPassword(false);
      } else {
        await loginUserWithPassword(email, password);
        showToast('Logged in successfully!', 'success');
        handleClose();
      }
    } catch (err: any) {
        if (err.message.includes("Email not confirmed")) {
           setError("Login failed: Please check your inbox for a verification email.");
        } else if (err.message.includes("Invalid login credentials")) {
           setError("Invalid email or password. If you just registered, please check your inbox for a verification link.");
        } else {
           setError(err.message || "An unknown error occurred.");
        }
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={handleClose} 
      title={isForgotPassword ? "Reset Password" : "Login to your Account"} 
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Email Address"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          placeholder="Enter your email"
          disabled={isLoading}
        />
        
        {!isForgotPassword && (
          <div className="space-y-2">
            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Enter your password"
              disabled={isLoading}
            />
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setIsForgotPassword(true)}
                className="text-sm font-medium text-brand-green dark:text-brand-dark-green-text hover:underline decoration-2 underline-offset-4 transition-all py-1"
                disabled={isLoading}
              >
                Forgot your password?
              </button>
            </div>
          </div>
        )}

        {error && <p className="text-sm text-red-500 dark:text-red-400">{error}</p>}
        
        <div className="flex justify-end space-x-3 pt-4">
          <Button 
            type="button" 
            variant="secondary" 
            onClick={isForgotPassword ? () => setIsForgotPassword(false) : handleClose} 
            disabled={isLoading}
          >
            {isForgotPassword ? "Back to Login" : "Cancel"}
          </Button>
          <Button type="submit" variant="primary" leftIcon={!isForgotPassword ? <LoginIcon className="w-5 h-5" /> : undefined} isLoading={isLoading}>
            {isForgotPassword ? "Send Reset Link" : "Login"}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default LoginModal;
