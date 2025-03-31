
import { supabase } from "@/integrations/supabase/client";

/**
 * Trigger a notification when a new comment is added to a prototype
 */
export async function notifyNewComment(
  prototypeOwnerId: string,
  commenterId: string,
  prototypeId: string,
  prototypeName: string,
  commentId: string,
  commentContent: string
) {
  if (prototypeOwnerId === commenterId) {
    // Don't notify the user about their own comments
    return;
  }
  
  try {
    await supabase.functions.invoke("send-notification", {
      body: {
        recipientUserId: prototypeOwnerId,
        type: "new_comment",
        actorUserId: commenterId,
        payload: {
          prototypeId,
          prototypeName,
          commentId,
          commentContent,
        },
      },
    });
  } catch (error) {
    console.error("Error notifying about new comment:", error);
  }
}

/**
 * Trigger a notification when a comment receives a reply
 */
export async function notifyCommentReply(
  commentOwnerId: string,
  replierId: string,
  prototypeId: string,
  prototypeName: string,
  commentId: string,
  replyContent: string
) {
  if (commentOwnerId === replierId) {
    // Don't notify the user about their own replies
    return;
  }
  
  try {
    await supabase.functions.invoke("send-notification", {
      body: {
        recipientUserId: commentOwnerId,
        type: "comment_reply",
        actorUserId: replierId,
        payload: {
          prototypeId,
          prototypeName,
          commentId,
          commentContent: replyContent,
        },
      },
    });
  } catch (error) {
    console.error("Error notifying about comment reply:", error);
  }
}

/**
 * Trigger a notification when a comment is resolved
 */
export async function notifyCommentResolved(
  commentOwnerId: string,
  resolverId: string,
  prototypeId: string,
  prototypeName: string,
  commentId: string
) {
  if (commentOwnerId === resolverId) {
    // Don't notify the user about their own resolutions
    return;
  }
  
  try {
    await supabase.functions.invoke("send-notification", {
      body: {
        recipientUserId: commentOwnerId,
        type: "comment_resolved",
        actorUserId: resolverId,
        payload: {
          prototypeId,
          prototypeName,
          commentId,
        },
      },
    });
  } catch (error) {
    console.error("Error notifying about comment resolution:", error);
  }
}
