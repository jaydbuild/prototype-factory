
import { useState, useEffect } from 'react';
import { FeedbackPoint, FeedbackUser } from '@/types/feedback';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from './use-toast';

export function usePrototypeFeedback(prototypeId: string) {
  const [feedbackPoints, setFeedbackPoints] = useState<FeedbackPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [feedbackUsers, setFeedbackUsers] = useState<Record<string, FeedbackUser>>({});
  const [currentUser, setCurrentUser] = useState<FeedbackUser | undefined>(undefined);
  const { toast } = useToast();

  // Fetch feedback points
  useEffect(() => {
    const fetchFeedback = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('prototype_feedback')
          .select('*')
          .eq('prototype_id', prototypeId);

        if (error) {
          throw error;
        }

        if (data) {
          setFeedbackPoints(data as FeedbackPoint[]);
          
          // Extract unique user IDs
          const userIds = [...new Set(data.map(item => item.created_by))];
          
          // Fetch user details
          if (userIds.length > 0) {
            const { data: userData, error: userError } = await supabase
              .from('profiles')
              .select('id, name, avatar_url')
              .in('id', userIds);
            
            if (userError) {
              console.error("Error fetching user details:", userError);
            } else if (userData) {
              const userMap: Record<string, FeedbackUser> = {};
              userData.forEach(user => {
                userMap[user.id] = user as FeedbackUser;
              });
              setFeedbackUsers(userMap);
            }
          }
        }
      } catch (error) {
        console.error("Error fetching feedback:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load feedback. Please try refreshing the page."
        });
      } finally {
        setIsLoading(false);
      }
    };

    if (prototypeId) {
      fetchFeedback();
    }
  }, [prototypeId, toast]);

  // Set up realtime subscription
  useEffect(() => {
    if (!prototypeId) return;

    const channel = supabase
      .channel('feedback-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'prototype_feedback',
          filter: `prototype_id=eq.${prototypeId}`
        },
        async (payload) => {
          if (payload.eventType === 'INSERT') {
            const newFeedback = payload.new as FeedbackPoint;
            setFeedbackPoints(prev => [...prev, newFeedback]);
            
            // Fetch user if not already in cache
            if (!feedbackUsers[newFeedback.created_by]) {
              const { data, error } = await supabase
                .from('profiles')
                .select('id, name, avatar_url')
                .eq('id', newFeedback.created_by)
                .single();
              
              if (!error && data) {
                setFeedbackUsers(prev => ({
                  ...prev,
                  [data.id]: data as FeedbackUser
                }));
              }
            }
          } else if (payload.eventType === 'UPDATE') {
            const updatedFeedback = payload.new as FeedbackPoint;
            setFeedbackPoints(prev => 
              prev.map(item => item.id === updatedFeedback.id ? updatedFeedback : item)
            );
          } else if (payload.eventType === 'DELETE') {
            const deletedFeedback = payload.old as FeedbackPoint;
            setFeedbackPoints(prev => 
              prev.filter(item => item.id !== deletedFeedback.id)
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [prototypeId, feedbackUsers]);

  // Get current user
  useEffect(() => {
    const fetchCurrentUser = async () => {
      const { data } = await supabase.auth.getSession();
      
      if (data.session?.user) {
        const { data: userData, error } = await supabase
          .from('profiles')
          .select('id, name, avatar_url')
          .eq('id', data.session.user.id)
          .single();
        
        if (!error && userData) {
          setCurrentUser(userData as FeedbackUser);
        } else {
          // If we can't get the profile but have a user, create a minimal user object
          setCurrentUser({
            id: data.session.user.id,
            name: data.session.user.email || null,
            avatar_url: null
          });
        }
      }
    };

    fetchCurrentUser();
  }, []);

  const addFeedbackPoint = (feedback: FeedbackPoint) => {
    setFeedbackPoints(prev => [...prev, feedback]);
  };

  const updateFeedbackPoint = (feedback: FeedbackPoint) => {
    setFeedbackPoints(prev => 
      prev.map(item => item.id === feedback.id ? feedback : item)
    );
  };

  return {
    feedbackPoints,
    isLoading,
    feedbackUsers,
    currentUser,
    addFeedbackPoint,
    updateFeedbackPoint
  };
}
