import React, { useState } from 'react';
import Input from '../ui/Input.tsx';
import Button from '../ui/Button.tsx';
import { LogoIcon, LoginIcon } from '../../constants.tsx';
import { useAppContext } from '../AppContext.tsx';
import { useToast } from '../ToastContext.tsx';

const ResetPasswordView: React.FC = () => {
  const { updateCurrentUserPassword, logoutUser } = useAppContext();
  const { showToast } = useToast();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      showToast("Passwords do not match.", "error");
      return;
    }
    if (password.length < 6) {
      showToast("Password must be at least 6 characters.", "error");
      return;
    }

    setIsLoading(true);
    try {
      await updateCurrentUserPassword(password);
      showToast('Password updated successfully! Please log in with your new password.', 'success');
      await logoutUser();
    } catch (err: any) {
      showToast(err.message || 'Failed to update password.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-bg-light dark:bg-brand-bg p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <LogoIcon className="mx-auto h-20 w-auto" />
          <h1 className="mt-4 text-2xl font-bold text-brand-green-text dark:text-brand-dark-green-text">INTOURCAMS</h1>
          <p className="mt-1 text-sm text-brand-text-secondary-light dark:text-brand-text-secondary">
              Integrated Tourism Coordination and Monitoring System
          </p>
          <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-brand-text-light dark:text-brand-text">
            Set your new password
          </h2>
          <p className="mt-2 text-center text-sm text-brand-text-secondary-light dark:text-brand-text-secondary">
            Please enter a strong password to secure your account.
          </p>
        </div>
        <div className="bg-card-bg-light dark:bg-card-bg p-8 rounded-lg shadow-xl border border-neutral-300-light dark:border-neutral-700-dark">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <Input
              label="New Password"
              type="password"
              id="password"
              name="password"
              autoComplete="new-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
            />
            <Input
              label="Confirm New Password"
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              autoComplete="new-password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={isLoading}
            />
            <Button type="submit" variant="primary" size="lg" className="w-full" isLoading={isLoading}>
              Update Password
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordView;
