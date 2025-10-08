import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { signInWithYouTube, getCurrentUser } from '../lib/firebase';
import { connectYouTube, disconnectYouTube, getOAuthStatus } from '../lib/oauthApi';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Youtube, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '../components/ui/alert';

export function OAuthSettings() {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Check if user is signed in with Firebase
  const firebaseUser = getCurrentUser();

  // Get OAuth connection status
  const { data: oauthStatus, isLoading } = useQuery({
    queryKey: ['/api/oauth/status'],
    queryFn: getOAuthStatus,
    enabled: !!firebaseUser,
  });

  // Connect YouTube mutation
  const connectMutation = useMutation({
    mutationFn: async () => {
      setError(null);
      setSuccess(null);

      // Sign in with Google/YouTube
      const { accessToken, user } = await signInWithYouTube();

      // Send token to backend
      await connectYouTube(accessToken);

      return { user };
    },
    onSuccess: () => {
      setSuccess('YouTube connected successfully!');
      queryClient.invalidateQueries({ queryKey: ['/api/oauth/status'] });
    },
    onError: (error: Error) => {
      setError(error.message || 'Failed to connect YouTube');
    },
  });

  // Disconnect YouTube mutation
  const disconnectMutation = useMutation({
    mutationFn: disconnectYouTube,
    onSuccess: () => {
      setSuccess('YouTube disconnected successfully');
      queryClient.invalidateQueries({ queryKey: ['/api/oauth/status'] });
    },
    onError: (error: Error) => {
      setError(error.message || 'Failed to disconnect YouTube');
    },
  });

  const isYouTubeConnected = oauthStatus?.youtube === true;

  return (
    <div className="container max-w-4xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Connect Accounts</h1>
        <p className="text-muted-foreground mt-2">
          Connect your social media accounts to enable personalized profile analysis
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-600">{success}</AlertDescription>
        </Alert>
      )}

      {/* YouTube Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-red-100 dark:bg-red-950 rounded-lg flex items-center justify-center">
                <Youtube className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <CardTitle>YouTube</CardTitle>
                <CardDescription>
                  Analyze your channel performance and viral patterns
                </CardDescription>
              </div>
            </div>
            {isYouTubeConnected && (
              <Badge variant="default" className="bg-green-500">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Connected
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {!firebaseUser ? (
            <div className="text-sm text-muted-foreground">
              Sign in to connect your YouTube account
            </div>
          ) : isLoading ? (
            <Button disabled>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Loading...
            </Button>
          ) : isYouTubeConnected ? (
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                Your YouTube account is connected. We can now analyze your channel data.
              </div>
              <Button
                variant="outline"
                onClick={() => disconnectMutation.mutate()}
                disabled={disconnectMutation.isPending}
              >
                {disconnectMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Disconnecting...
                  </>
                ) : (
                  'Disconnect YouTube'
                )}
              </Button>
            </div>
          ) : (
            <Button
              onClick={() => connectMutation.mutate()}
              disabled={connectMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {connectMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <Youtube className="w-4 h-4 mr-2" />
                  Connect YouTube
                </>
              )}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Instagram and TikTok cards removed for YouTube-only mobile release */}
    </div>
  );
}
