import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, Eye, EyeOff, Loader2 } from 'lucide-react';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabase';

const loginSchema = z.object({
	email: z.string().email('Please enter a valid email'),
	password: z.string().min(6, 'Password must be at least 6 characters'),
});

const signupSchema = loginSchema
	.extend({
		fullName: z.string().min(2, 'Name must be at least 2 characters'),
		confirmPassword: z.string(),
	})
	.refine((data) => data.password === data.confirmPassword, {
		message: "Passwords don't match",
		path: ['confirmPassword'],
	});

export default function Auth() {
	const navigate = useNavigate();
	const { signIn, signUp, user } = useAuth();
	const { toast } = useToast();

	const [isLogin, setIsLogin] = useState(true);
	const [isFirstUser, setIsFirstUser] = useState<boolean | null>(null);
	const [loading, setLoading] = useState(false);
	const [showPassword, setShowPassword] = useState(false);
	const [formData, setFormData] = useState({
		email: '',
		password: '',
		confirmPassword: '',
		fullName: '',
	});
	const [errors, setErrors] = useState<Record<string, string>>({});

	useEffect(() => {
		if (user) navigate('/dashboard');
	}, [user, navigate]);

	useEffect(() => {
		const checkIfFirstUser = async () => {
			try {
				const { count, error } = await supabase
					.from('user_roles')
					.select('*', { count: 'exact', head: true });

				if (error) {
					setIsFirstUser(true);
				} else {
					setIsFirstUser(count === 0);
				}
			} catch {
				setIsFirstUser(true);
			}
		};

		checkIfFirstUser();
	}, []);

	const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const { name, value } = e.target;
		setFormData((prev) => ({ ...prev, [name]: value }));
		setErrors((prev) => ({ ...prev, [name]: '' }));
	};

	const validateForm = () => {
		try {
			if (isLogin) {
				loginSchema.parse(formData);
			} else {
				signupSchema.parse(formData);
			}
			return true;
		} catch (error) {
			if (error instanceof z.ZodError) {
				const newErrors: Record<string, string> = {};
				error.errors.forEach((err) => {
					if (err.path[0]) newErrors[err.path[0] as string] = err.message;
				});
				setErrors(newErrors);
			}
			return false;
		}
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!validateForm()) return;

		setLoading(true);

		try {
			if (isLogin) {
				const { error } = await signIn(formData.email, formData.password);
				if (error) {
					toast({
						title: 'Login Failed',
						description: error.message,
						variant: 'destructive',
					});
				} else {
					toast({ title: 'Welcome back!', description: 'Successfully logged in.' });
					navigate('/dashboard');
				}
			} else {
				if (!isFirstUser) {
					toast({
						title: 'Registration Disabled',
						description: 'Only Super Admin can add new administrators.',
						variant: 'destructive',
					});
					return;
				}

				const { error } = await signUp(formData.email, formData.password, formData.fullName);
				if (error) {
					toast({
						title: 'Registration Failed',
						description: error.message,
						variant: 'destructive',
					});
				} else {
					toast({
						title: 'Account Created!',
						description: 'You are now the Super Admin. Please check your email to verify your account.',
					});
				}
			}
		} catch (error) {
			toast({
				title: 'Error',
				description: 'An unexpected error occurred.',
				variant: 'destructive',
			});
		} finally {
			setLoading(false);
		}
	};

	if (isFirstUser === null) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-background">
				<Loader2 className="w-8 h-8 animate-spin text-primary" />
			</div>
		);
	}

	return (
		<div className="min-h-screen flex items-center justify-center bg-background px-4 py-10">
			<div className="w-full max-w-md animate-slide-up">
				<div className="flex items-center justify-center gap-3 mb-8">
					<div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center">
						<Home className="w-6 h-6 text-primary-foreground" />
					</div>
					<h1 className="font-display font-bold text-2xl">Care Home</h1>
				</div>

				<div className="card-elevated p-8">
					<div className="text-center mb-8">
						<h2 className="text-2xl font-display font-bold text-foreground">
							{isLogin ? 'Welcome Back' : 'Create Account'}
						</h2>
						<p className="text-muted-foreground mt-2">
							{isLogin
								? 'Sign in to access the management system'
								: isFirstUser
									? 'Set up your Super Admin account'
									: 'Contact Super Admin for access'}
						</p>
					</div>

					{isFirstUser && !isLogin && (
						<div className="mb-6 p-4 rounded-lg bg-primary/10 border border-primary/20">
							<p className="text-sm text-primary font-medium">
								🎉 You'll be the first admin (Super Admin) with full system access.
							</p>
						</div>
					)}

					<form onSubmit={handleSubmit} className="space-y-5">
						{!isLogin && (
							<div className="space-y-2">
								<Label htmlFor="fullName">Full Name</Label>
								<Input
									id="fullName"
									name="fullName"
									placeholder="Enter your full name"
									value={formData.fullName}
									onChange={handleInputChange}
								/>
								{errors.fullName && <p className="text-sm text-destructive">{errors.fullName}</p>}
							</div>
						)}

						<div className="space-y-2">
							<Label htmlFor="email">Email</Label>
							<Input
								id="email"
								name="email"
								type="email"
								placeholder="admin@example.com"
								value={formData.email}
								onChange={handleInputChange}
							/>
							{errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
						</div>

						<div className="space-y-2">
							<div className="flex items-center justify-between">
								<Label htmlFor="password">Password</Label>
								<button
									type="button"
									className="text-xs text-primary hover:underline"
									onClick={() => setShowPassword((prev) => !prev)}
								>
									{showPassword ? 'Hide' : 'Show'}
								</button>
							</div>
							<div className="relative">
								<Input
									id="password"
									name="password"
									type={showPassword ? 'text' : 'password'}
									placeholder="Enter your password"
									value={formData.password}
									onChange={handleInputChange}
								/>
								<button
									type="button"
									className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
									onClick={() => setShowPassword((prev) => !prev)}
								>
									{showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
								</button>
							</div>
							{errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
						</div>

						{!isLogin && (
							<div className="space-y-2">
								<Label htmlFor="confirmPassword">Confirm Password</Label>
								<Input
									id="confirmPassword"
									name="confirmPassword"
									type={showPassword ? 'text' : 'password'}
									placeholder="Re-enter your password"
									value={formData.confirmPassword}
									onChange={handleInputChange}
								/>
								{errors.confirmPassword && (
									<p className="text-sm text-destructive">{errors.confirmPassword}</p>
								)}
							</div>
						)}

						<Button
							type="submit"
							className="w-full"
							variant="gradient"
							disabled={loading || (!isLogin && !isFirstUser)}
						>
							{loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
							{isLogin ? 'Sign In' : 'Create Super Admin Account'}
						</Button>

						<p className="text-center text-sm text-muted-foreground">
							{isLogin ? 'New here?' : 'Already have an account?'}{' '}
							<button
								type="button"
								className="text-primary hover:underline"
								onClick={() => {
									setIsLogin((prev) => !prev);
									setErrors({});
								}}
							>
								{isLogin ? 'Create an account' : 'Sign in instead'}
							</button>
						</p>
					</form>
				</div>
			</div>
		</div>
	);
}
