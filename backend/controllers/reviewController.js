import Review from "../models/reviewModel.js";
import Movie from "../models/movieModel.js";
import { safeRedisDel } from "../configs/redis.js";

// Helper function to recalculate and update movie rating
const recalculateMovieRating = async (movieId) => {
  const reviews = await Review.find({ movie: movieId.toString() });
  const totalReviews = reviews.length;

  if (totalReviews === 0) {
    return { avgRating: 0, totalReviews: 0 };
  }

  const sum = reviews.reduce((acc, curr) => acc + curr.rating, 0);
  const avgRating = Number((sum / totalReviews).toFixed(1));

  // Update Movie document in MongoDB if valid ObjectId
  const isMongoObjectId = typeof movieId === "string" && /^[0-9a-fA-F]{24}$/.test(movieId);
  if (isMongoObjectId) {
    await Movie.findByIdAndUpdate(movieId, {
      vote_average: avgRating,
      vote_count: totalReviews,
    });
  }

  // Invalidate any movie/recommendation cache in Redis
  await safeRedisDel("cache:now_playing_movies");

  return { avgRating, totalReviews };
};

// Add or update a review for a movie
export const addReview = async (req, res) => {
  try {
    const { movieId, rating, comment } = req.body;
    const { userId, name } = req.user;

    const movieStr = movieId.toString();

    // Check if user already reviewed this movie
    let review = await Review.findOne({ movie: movieStr, user: userId });
    let isUpdate = false;

    if (review) {
      review.rating = rating;
      review.comment = comment;
      review.userName = name || review.userName;
      review.userImage = req.user.image || review.userImage;
      await review.save();
      isUpdate = true;
    } else {
      review = await Review.create({
        movie: movieStr,
        user: userId,
        userName: name || "Anonymous User",
        userImage: req.user.image || "",
        rating,
        comment,
      });
    }

    // Automatically recalculate and update Movie's vote_average & vote_count
    const { avgRating, totalReviews } = await recalculateMovieRating(movieStr);

    return res.status(isUpdate ? 200 : 201).json({
      success: true,
      message: isUpdate ? "Review updated successfully" : "Review submitted successfully",
      review,
      newAverageRating: avgRating,
      totalReviews,
    });
  } catch (error) {
    console.error("Error adding review:", error);
    return res.status(500).json({ success: false, message: "Failed to submit review" });
  }
};

// Get all reviews for a movie
export const getMovieReviews = async (req, res) => {
  try {
    const { movieId } = req.params;
    const movieStr = movieId.toString();
    const reviews = await Review.find({ movie: movieStr }).sort({ createdAt: -1 });

    const totalReviews = reviews.length;
    let avgRating = 8.5;

    if (totalReviews > 0) {
      const sum = reviews.reduce((acc, curr) => acc + curr.rating, 0);
      avgRating = Number((sum / totalReviews).toFixed(1));
    } else {
      const isMongoObjectId = typeof movieStr === "string" && /^[0-9a-fA-F]{24}$/.test(movieStr);
      if (isMongoObjectId) {
        const movie = await Movie.findById(movieStr);
        avgRating = movie?.vote_average || 8.5;
      }
    }

    return res.status(200).json({
      success: true,
      reviews,
      totalReviews,
      averageRating: avgRating,
    });
  } catch (error) {
    console.error("Error fetching reviews:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch reviews" });
  }
};

// Toggle like on a review
export const likeReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { userId } = req.user;

    const review = await Review.findById(reviewId);
    if (!review) {
      return res.status(404).json({ success: false, message: "Review not found" });
    }

    const likes = review.likes || [];
    const alreadyLiked = likes.includes(userId);

    if (alreadyLiked) {
      review.likes = likes.filter((id) => id !== userId);
    } else {
      review.likes.push(userId);
    }

    await review.save();

    return res.status(200).json({
      success: true,
      liked: !alreadyLiked,
      totalLikes: review.likes.length,
      likes: review.likes,
    });
  } catch (error) {
    console.error("Error liking review:", error);
    return res.status(500).json({ success: false, message: "Failed to toggle like" });
  }
};

// Add a reply inside a review comment
export const replyToReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { comment } = req.body;
    const { userId, name } = req.user;

    if (!comment || !comment.trim()) {
      return res.status(400).json({ success: false, message: "Reply comment cannot be empty" });
    }

    const review = await Review.findById(reviewId);
    if (!review) {
      return res.status(404).json({ success: false, message: "Review not found" });
    }

    const newReply = {
      user: userId,
      userName: name || "Anonymous User",
      userImage: req.user.image || "",
      comment: comment.trim(),
      createdAt: new Date(),
    };

    review.replies.push(newReply);
    await review.save();

    return res.status(201).json({
      success: true,
      message: "Reply posted successfully",
      reply: newReply,
      replies: review.replies,
    });
  } catch (error) {
    console.error("Error replying to review:", error);
    return res.status(500).json({ success: false, message: "Failed to post reply" });
  }
};
