import { useState, useEffect } from 'react';
import { FeedbackPoint, FeedbackUser, ElementTarget, DeviceInfo, FeedbackStatus } from '@/types/feedback';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { safelyConvertElementMetadata, safelyConvertDeviceInfo } from '@/utils/feedback-utils';
import { notifyNewComment, notifyCommentReply, notifyCommentResolved } from "@/utils/notification-utils";

interface SupabaseFeedbackResponse {
  id: string;
  prototype_id: string;
  created_by: string;
  content: string;
  position: any;
  created_at: string;
  updated_at: string | null;
  status: string;
  element_selector?: string | null;
  element_xpath?: string | null;
  element_metadata?: any;
  device_type?: string;
}

const ensureValidFeedbackStatus = (status: string | null | undefined): FeedbackStatus => {
  if (!status) return 'open';
  
  const validStatuses: FeedbackStatus[] = ['open', 'in_progress', 'resolved', 'closed'];
  return validStatuses.includes(status as FeedbackStatus) 
    ? (status as FeedbackStatus) 
    : 'open';
};

export function usePrototypeFeedback(prototypeId: string) {
  const [feedbackPoints, setFeedbackPoints] = useState<FeedbackPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [feedbackUsers, setFeedbackUsers] = useState<Record<string, FeedbackUser>>({});
  const [currentUser, setCurrentUser] = useState<FeedbackUser | undefined>(undefined);
  const { toast } = useToast();

  useEffect(() => {
    const fetchFeedback = async () => {
      setIsLoading(true);
      try {
        const { data: session } = await supabase.auth.getSession();
        if (session.session) {
          const { data: prototype, error: prototypeError } = await supabase
            .from('prototypes')
            .select('created_by')
            .eq('id', prototypeId)
            .single();
          
          if (prototypeError) {
            console.error("Error checking prototype access:", prototypeError);
          } else if (prototype && prototype.created_by !== session.session.user.id) {
            console.warn("User doesn't own this prototype - would check for sharing permissions here");
          }
        }
        
        const { data, error } = await supabase
          .from('prototype_feedback')
          .select('*')
          .eq('prototype_id', prototypeId);

        if (error) {
          throw error;
        }

        if (data) {
          console.log('Received feedback data:', data);
          
          const feedbackWithElementTargets = data.map(item => {
            const feedback = item as SupabaseFeedbackResponse;
            
            let element_target: ElementTarget | undefined = undefined;
            if (feedback.element_selector || feedback.element_xpath || feedback.element_metadata) {
              element_target = {
                selector: feedback.element_selector || null,
                xpath: feedback.element_xpath || null,
                metadata: safelyConvertElementMetadata(feedback.element_metadata)
              };
            }
            
            let device_info: DeviceInfo | undefined = undefined;
            if (feedback.device_type) {
              device_info = {
                type: feedback.device_type as any,
                width: 1920,
                height: 1080,
                orientation: 'portrait',
                scale: 1
              };
            }
            
            return {
              id: feedback.id,
              prototype_id: feedback.prototype_id,
              created_by: feedback.created_by,
              content: feedback.content,
              position: feedback.position,
              created_at: feedback.created_at,
              updated_at: feedback.updated_at,
              status: ensureValidFeedbackStatus(feedback.status),
              element_target,
              device_info
            } as FeedbackPoint;
          });
          
          setFeedbackPoints(feedbackWithElementTargets);
          
          const userIds = [...new Set(data.map(item => item.created_by))];
          
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
                userMap[user.id] = {
                  id: user.id,
                  name: user.name || 'Anonymous',
                  avatar_url: user.avatar_url
                } as FeedbackUser;
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

  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        
        if (data.session?.user) {
          const { data: userData, error } = await supabase
            .from('profiles')
            .select('id, name, avatar_url')
            .eq('id', data.session.user.id)
            .single();
          
          if (!error && userData) {
            console.log('Current user profile:', userData);
            setCurrentUser({
              id: userData.id,
              name: userData.name || 'Anonymous',
              avatar_url: userData.avatar_url
            } as FeedbackUser);
          } else {
            console.log('Creating default user from session:', data.session.user);
            setCurrentUser({
              id: data.session.user.id,
              name: data.session.user.email || 'Anonymous',
              avatar_url: null
            });
          }
        } else {
          console.log('No session found');
        }
      } catch (error) {
        console.error('Error fetching current user:', error);
      }
    };

    fetchCurrentUser();
  }, []);

  useEffect(() => {
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
            const newData = payload.new as SupabaseFeedbackResponse;
            
            let element_target: ElementTarget | undefined = undefined;
            if (newData.element_selector || newData.element_xpath || newData.element_metadata) {
              element_target = {
                selector: newData.element_selector || null,
                xpath: newData.element_xpath || null,
                metadata: safelyConvertElementMetadata(newData.element_metadata)
              };
            }
            
            let device_info: DeviceInfo | undefined = undefined;
            if (newData.device_type) {
              device_info = {
                type: newData.device_type as any,
                width: 1920,
                height: 1080,
                orientation: 'portrait',
                scale: 1
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
              status: ensureValidFeedbackStatus(newData.status),
              element_target,
              device_info
            };
            
            setFeedbackPoints(prev => [...prev, newFeedback]);
            
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
            const updatedData = payload.new as SupabaseFeedbackResponse;
            
            let element_target: ElementTarget | undefined = undefined;
            if (updatedData.element_selector || updatedData.element_xpath || updatedData.element_metadata) {
              element_target = {
                selector: updatedData.element_selector || null,
                xpath: updatedData.element_xpath || null,
                metadata: safelyConvertElementMetadata(updatedData.element_metadata)
              };
            }
            
            let device_info: DeviceInfo | undefined = undefined;
            if (updatedData.device_type) {
              device_info = {
                type: updatedData.device_type as any,
                width: 1920,
                height: 1080,
                orientation: 'portrait',
                scale: 1
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
              status: ensureValidFeedbackStatus(updatedData.status),
              element_target,
              device_info
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

  const addFeedbackPoint = async (feedback: FeedbackPoint) => {
    try {
      const { data: prototypeData, error: prototypeError } = await supabase
        .from('prototypes')
        .select('name, created_by')
        .eq('id', prototypeId)
        .single();
      
      if (!prototypeError && prototypeData) {
        notifyNewComment(
          prototypeData.created_by,
          feedback.created_by,
          prototypeId,
          prototypeData.name,
          feedback.id,
          feedback.content
        );
      }
    } catch (err) {
      console.error("Error in notification flow:", err);
    }
    
    setFeedbackPoints(prev => [...prev, feedback]);
  };

  const updateFeedbackPoint = async (feedback: FeedbackPoint) => {
    const prevFeedback = feedbackPoints.find(item => item.id === feedback.id);
    
    if (prevFeedback && prevFeedback.status !== 'resolved' && feedback.status === 'resolved') {
      try {
        const { data: prototypeData, error: prototypeError } = await supabase
          .from('prototypes')
          .select('name')
          .eq('id', prototypeId)
          .single();
        
        if (!prototypeError && prototypeData) {
          notifyCommentResolved(
            feedback.created_by,
            currentUser?.id || '',
            prototypeId,
            prototypeData.name,
            feedback.id
          );
        }
      } catch (err) {
        console.error("Error in notification flow:", err);
      }
    }
    
    setFeedbackPoints(prev => 
      prev.map(item => item.id === feedback.id ? feedback : item)
    );
  };

  const addReplyToFeedback = async (
    parentId: string,
    replyContent: string,
    replyId: string
  ) => {
    try {
      const parentFeedback = feedbackPoints.find(item => item.id === parentId);
      
      if (parentFeedback) {
        const { data: prototypeData, error: prototypeError } = await supabase
          .from('prototypes')
          .select('name')
          .eq('id', prototypeId)
          .single();
        
        if (!prototypeError && prototypeData) {
          notifyCommentReply(
            parentFeedback.created_by,
            currentUser?.id || '',
            prototypeId,
            prototypeData.name,
            parentId,
            replyContent
          );
        }
      }
    } catch (err) {
      console.error("Error in notification flow:", err);
    }
  };

  return {
    feedbackPoints,
    isLoading,
    feedbackUsers,
    currentUser,
    addFeedbackPoint,
    updateFeedbackPoint,
    addReplyToFeedback
  };
}
