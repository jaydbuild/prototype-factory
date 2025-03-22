
import { useState, useEffect } from 'react';
import { FeedbackPoint, FeedbackUser, ElementTarget, DeviceType } from '@/types/feedback';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from './use-toast';

// Helper function to safely convert attributes to Record<string, string>
function safelyConvertAttributes(attributes: any): Record<string, string> | undefined {
  if (!attributes || typeof attributes !== 'object') {
    return undefined;
  }
  
  // If it's an array, we can't convert it to Record<string, string>
  if (Array.isArray(attributes)) {
    return undefined;
  }
  
  // Convert all values to strings
  const result: Record<string, string> = {};
  for (const key in attributes) {
    if (Object.prototype.hasOwnProperty.call(attributes, key)) {
      const value = attributes[key];
      // Skip null or undefined values
      if (value != null) {
        // Convert any value to string
        result[key] = String(value);
      }
    }
  }
  
  return Object.keys(result).length > 0 ? result : undefined;
}

// Helper function to safely convert element metadata
function safelyConvertElementMetadata(metadata: any): ElementTarget['metadata'] {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return null;
  }
  
  return {
    tagName: typeof metadata.tagName === 'string' ? metadata.tagName : undefined,
    text: typeof metadata.text === 'string' ? metadata.text : undefined,
    attributes: safelyConvertAttributes(metadata.attributes),
    elementType: typeof metadata.elementType === 'string' ? metadata.elementType : undefined,
    displayName: typeof metadata.displayName === 'string' ? metadata.displayName : undefined
  };
}

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
          // Convert the DB structure to our FeedbackPoint type with element_target
          const feedbackWithElementTargets = data.map(item => {
            const feedback = item as any;
            
            // Create element_target if any of the fields exist
            let element_target: ElementTarget | undefined = undefined;
            if (feedback.element_selector || feedback.element_xpath || feedback.element_metadata) {
              element_target = {
                selector: feedback.element_selector || null,
                xpath: feedback.element_xpath || null,
                metadata: safelyConvertElementMetadata(feedback.element_metadata)
              };
            }
            
            // Return the feedback point with our structure
            return {
              id: feedback.id,
              prototype_id: feedback.prototype_id,
              created_by: feedback.created_by,
              content: feedback.content,
              position: feedback.position,
              created_at: feedback.created_at,
              updated_at: feedback.updated_at,
              status: feedback.status,
              element_target,
              device_type: feedback.device_type
            } as FeedbackPoint;
          });
          
          setFeedbackPoints(feedbackWithElementTargets);
          
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
            const newData = payload.new as any;
            
            // Create element_target from database fields
            let element_target: ElementTarget | undefined = undefined;
            if (newData.element_selector || newData.element_xpath || newData.element_metadata) {
              element_target = {
                selector: newData.element_selector || null,
                xpath: newData.element_xpath || null,
                metadata: safelyConvertElementMetadata(newData.element_metadata)
              };
            }
            
            const newFeedback: FeedbackPoint = {
              id: newData.id,
              prototype_id: newData.prototype_id,
              created_by: newData.created_by,
              content: newData.content,
              position: newData.position,
              created_at: newData.created_at,
              updated_at: newData.updated_at,
              status: newData.status,
              element_target,
              device_type: (newData.device_type as DeviceType) || 'desktop'
            };
            
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
            const updatedData = payload.new as any;
            
            // Create element_target from database fields
            let element_target: ElementTarget | undefined = undefined;
            if (updatedData.element_selector || updatedData.element_xpath || updatedData.element_metadata) {
              element_target = {
                selector: updatedData.element_selector || null,
                xpath: updatedData.element_xpath || null,
                metadata: safelyConvertElementMetadata(updatedData.element_metadata)
              };
            }
            
            const updatedFeedback: FeedbackPoint = {
              id: updatedData.id,
              prototype_id: updatedData.prototype_id,
              created_by: updatedData.created_by,
              content: updatedData.content,
              position: updatedData.position,
              created_at: updatedData.created_at,
              updated_at: updatedData.updated_at,
              status: updatedData.status,
              element_target,
              device_type: (updatedData.device_type as DeviceType) || 'desktop'
            };
            
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
