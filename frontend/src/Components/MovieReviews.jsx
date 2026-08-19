import React, { useState, useEffect } from "react";
import { Star, MessageSquare, Send, Heart, CornerDownRight, Reply, ThumbsUp } from "lucide-react";
import toast from "react-hot-toast";
import { useAppContext } from "../context/AppContext";

const MovieReviews = ({ movieId, onRatingUpdated }) => {
  const { axios, user, token, setIsAuthModalOpen } = useAppContext();
  const [reviews, setReviews] = useState([]);
  const [averageRating, setAverageRating] = useState(0);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);

  // Reply state
  const [activeReplyId, setActiveReplyId] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [replyLoading, setReplyLoading] = useState(false);

  const fetchReviews = async () => {
    try {
      const { data } = await axios.get(`/api/reviews/${movieId}`);
      if (data.success) {
        setReviews(data.reviews || []);
        setAverageRating(data.averageRating || 0);
        if (onRatingUpdated && data.averageRating !== undefined) {
          onRatingUpdated(data.averageRating, data.totalReviews);
        }
      }
    } catch (error) {
      console.error("Error fetching reviews:", error);
    }
  };

  useEffect(() => {
    if (movieId) fetchReviews();
  }, [movieId]);

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!token) {
      toast.error("Please log in to submit a review");
      setIsAuthModalOpen(true);
      return;
    }

    if (!comment.trim()) {
      toast.error("Please write a comment");
      return;
    }

    setLoading(true);
    try {
      const { data } = await axios.post("/api/reviews", {
        movieId,
        rating,
        comment,
      });

      if (data.success) {
        toast.success(data.message);
        setComment("");
        if (onRatingUpdated && data.newAverageRating !== undefined) {
          onRatingUpdated(data.newAverageRating, data.totalReviews);
        }
        fetchReviews();
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to submit review");
    } finally {
      setLoading(false);
    }
  };

  // Toggle Like Handler
  const handleLike = async (reviewId) => {
    if (!token) {
      toast.error("Please log in to like a review");
      setIsAuthModalOpen(true);
      return;
    }

    try {
      const { data } = await axios.post(`/api/reviews/${reviewId}/like`);
      if (data.success) {
        setReviews((prev) =>
          prev.map((r) =>
            r._id === reviewId
              ? {
                  ...r,
                  likes: data.likes,
                }
              : r
          )
        );
      }
    } catch (error) {
      console.error("Error toggling like:", error);
      toast.error("Failed to like review");
    }
  };

  // Submit Nested Reply Handler
  const handleSendReply = async (reviewId) => {
    if (!token) {
      toast.error("Please log in to reply");
      setIsAuthModalOpen(true);
      return;
    }

    if (!replyText.trim()) {
      toast.error("Reply text cannot be empty");
      return;
    }

    setReplyLoading(true);
    try {
      const { data } = await axios.post(`/api/reviews/${reviewId}/reply`, {
        comment: replyText,
      });

      if (data.success) {
        toast.success("Reply added!");
        setReplyText("");
        setActiveReplyId(null);
        fetchReviews();
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to post reply");
    } finally {
      setReplyLoading(false);
    }
  };

  return (
    <div className="w-full mt-12 bg-gray-900/60 border border-gray-800 rounded-3xl p-6 md:p-8 text-white backdrop-blur-sm shadow-xl">
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-gray-800">
        <div>
          <h3 className="text-2xl font-bold flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-primary" /> Audience Reviews & Discussions
          </h3>
          <p className="text-sm text-gray-400 mt-1">Share your ratings, like reviews, and reply to discussions</p>
        </div>

        <div className="flex items-center gap-3 bg-gray-800/80 px-4 py-2 rounded-2xl border border-gray-700">
          <Star className="w-6 h-6 fill-amber-400 text-amber-400" />
          <div>
            <span className="text-xl font-bold">{averageRating}</span>
            <span className="text-xs text-gray-400"> / 5 ({reviews.length})</span>
          </div>
        </div>
      </div>

      {/* Review Submission Form */}
      <form onSubmit={handleSubmitReview} className="mb-10 bg-gray-800/40 p-5 rounded-2xl border border-gray-700/50">
        <h4 className="text-sm font-semibold mb-3">Leave a Review</h4>

        <div className="flex items-center gap-2 mb-4">
          <span className="text-xs text-gray-400 mr-2">Your Rating:</span>
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              type="button"
              key={star}
              onClick={() => setRating(star)}
              className="p-1 transition hover:scale-110 cursor-pointer"
            >
              <Star
                className={`w-6 h-6 ${
                  star <= rating ? "fill-amber-400 text-amber-400" : "text-gray-600"
                }`}
              />
            </button>
          ))}
        </div>

        <div className="relative">
          <textarea
            rows={3}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={user ? "Share your thoughts about this movie..." : "Log in to post a review..."}
            disabled={!user}
            className="w-full bg-gray-900 border border-gray-700 rounded-xl p-3.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-primary transition disabled:opacity-50"
          />

          <button
            type="submit"
            disabled={loading || !user}
            className="mt-3 px-5 py-2 bg-primary hover:bg-primary/90 text-white text-sm font-medium rounded-xl transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            {loading ? "Posting..." : "Submit Review"}
          </button>
        </div>
      </form>

      {/* Review List */}
      <div className="space-y-6">
        {reviews.length === 0 ? (
          <p className="text-gray-500 text-center py-6 text-sm">No reviews yet. Be the first to review!</p>
        ) : (
          reviews.map((rev) => {
            const hasLiked = user && rev.likes?.includes(user.id || user._id);
            const totalLikes = rev.likes?.length || 0;
            const replies = rev.replies || [];

            return (
              <div key={rev._id} className="bg-gray-900/80 border border-gray-800/80 p-5 rounded-2xl">
                {/* Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={rev.userImage || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(rev.userName)}`}
                      alt={rev.userName}
                      className="w-9 h-9 rounded-full object-cover border border-primary/40"
                    />
                    <div>
                      <span className="text-sm font-semibold text-white">{rev.userName}</span>
                      <span className="text-[10px] text-gray-500 block">
                        {new Date(rev.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 bg-amber-400/10 px-2.5 py-1 rounded-lg border border-amber-400/20">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    <span className="text-xs font-bold text-amber-400">{rev.rating}.0</span>
                  </div>
                </div>

                {/* Comment */}
                <p className="text-sm text-gray-300 pl-12 leading-relaxed">{rev.comment}</p>

                {/* Actions: Like & Reply */}
                <div className="flex items-center gap-4 mt-3 pl-12">
                  <button
                    onClick={() => handleLike(rev._id)}
                    className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg transition cursor-pointer ${
                      hasLiked
                        ? "text-rose-500 bg-rose-500/10 border border-rose-500/20"
                        : "text-gray-400 hover:text-white bg-gray-800/50 hover:bg-gray-800 border border-gray-700/50"
                    }`}
                  >
                    <Heart className={`w-3.5 h-3.5 ${hasLiked ? "fill-rose-500" : ""}`} />
                    <span>{totalLikes > 0 ? totalLikes : "Like"}</span>
                  </button>

                  <button
                    onClick={() => {
                      setActiveReplyId(activeReplyId === rev._id ? null : rev._id);
                      setReplyText("");
                    }}
                    className="flex items-center gap-1.5 text-xs font-medium text-gray-400 hover:text-white px-2.5 py-1 rounded-lg bg-gray-800/50 hover:bg-gray-800 border border-gray-700/50 transition cursor-pointer"
                  >
                    <Reply className="w-3.5 h-3.5" />
                    <span>Reply {replies.length > 0 && `(${replies.length})`}</span>
                  </button>
                </div>

                {/* Nested Reply Input Box */}
                {activeReplyId === rev._id && (
                  <div className="mt-4 pl-12">
                    <div className="flex items-center gap-2 bg-gray-800/60 p-2.5 rounded-xl border border-gray-700">
                      <input
                        type="text"
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder="Write a reply..."
                        className="flex-1 bg-transparent text-xs text-white placeholder-gray-500 outline-none px-2"
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            handleSendReply(rev._id);
                          }
                        }}
                      />
                      <button
                        onClick={() => handleSendReply(rev._id)}
                        disabled={replyLoading}
                        className="bg-primary hover:bg-primary/90 text-white text-xs px-3 py-1.5 rounded-lg transition cursor-pointer disabled:opacity-50 flex items-center gap-1 font-medium"
                      >
                        <Send className="w-3 h-3" />
                        Reply
                      </button>
                    </div>
                  </div>
                )}

                {/* Nested Replies List */}
                {replies.length > 0 && (
                  <div className="mt-4 pl-12 space-y-3">
                    {replies.map((reply, rIndex) => (
                      <div
                        key={reply._id || rIndex}
                        className="flex items-start gap-3 bg-gray-950/40 p-3 rounded-xl border border-gray-800"
                      >
                        <CornerDownRight className="w-4 h-4 text-primary mt-1 flex-shrink-0" />
                        <img
                          src={reply.userImage || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(reply.userName)}`}
                          alt={reply.userName}
                          className="w-7 h-7 rounded-full object-cover border border-primary/30 flex-shrink-0"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-white">{reply.userName}</span>
                            <span className="text-[10px] text-gray-500">
                              {new Date(reply.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-xs text-gray-300 mt-0.5">{reply.comment}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default MovieReviews;
