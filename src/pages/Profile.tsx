import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile, ProfileData } from '@/hooks/useSupabaseData';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, User, Mail, Globe, UserCheck } from 'lucide-react';

export const Profile = () => {
  const { user } = useAuth();
  const { profile, loading, upsertProfile, refetch } = useProfile();
  const { toast } = useToast();

  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [website, setWebsite] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (profile) {
      setUsername(profile.username || '');
      setFullName(profile.full_name || '');
      setWebsite(profile.website || '');
    } else if (user) {
      // If no profile exists but user is logged in, populate with user data
      setFullName(user.user_metadata?.name || user.email?.split('@')[0] || '');
    }
  }, [profile, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast({ title: 'You must be logged in.', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    try {
      const updates: Partial<ProfileData> = {
        username: username.trim(),
        full_name: fullName.trim(),
        website: website.trim(),
      };
      await upsertProfile(updates);
      toast({ title: 'Profile updated successfully!' });
      refetch(); // Re-fetch to ensure latest data is displayed
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast({ title: 'Error updating profile', description: error.message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading profile...</span>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex justify-center items-center h-full text-muted-foreground">
        Please log in to view your profile.
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 max-w-2xl">
      {/* User Info Header */}
      <div className="mb-6 p-4 bg-gradient-to-r from-primary/10 to-blue-500/10 rounded-lg border">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
            <User className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              {profile?.full_name || user?.user_metadata?.name || 'User'}
            </h2>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Mail className="w-4 h-4" />
              <span>{user?.email}</span>
              <UserCheck className="w-4 h-4 text-green-600" />
              <span className="text-green-600">Verified</span>
            </div>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile Settings</CardTitle>
          <CardDescription>Manage your public profile information.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input 
                id="email" 
                type="email" 
                value={user?.email || ''} 
                disabled 
                className="bg-muted/50"
              />
              <p className="text-xs text-muted-foreground">Email cannot be changed</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={isSubmitting}
                placeholder="Your unique username"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                disabled={isSubmitting}
                placeholder="Your full name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="website" className="flex items-center gap-2">
                <Globe className="w-4 h-4" />
                Website
              </Label>
              <Input
                id="website"
                type="url"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                disabled={isSubmitting}
                placeholder="https://yourwebsite.com"
              />
            </div>
            <CardFooter className="flex justify-end p-0 pt-6">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Profile'
                )}
              </Button>
            </CardFooter>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
