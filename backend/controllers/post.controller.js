import User from '../models/user.model.js'
import Notification from '../models/notification.model.js'
import {v2 as cloudinary } from 'cloudinary'
import Post from '../models/post.model.js'


export const createPost = async (req, res) => {
    try{
        const { text } = req.body;
        let { img } = req.body;
        const userId = req.user._id.toString();

        const user = await User.findById(userId);

        if(!user){
            return res.status(404).json({ message: "User not found" });
        }

        if(!text && !img){
            return res.status(400).json({ error: "User must have text or image" })
        }

        if(img){
            const uploadedResponse = await cloudinary.uploader.upload(img);
            img = uploadedResponse.secure_url;
        }

        const newPost = new Post({
            user: userId,
            text,
            img
        })

        await newPost.save();
        res.status(200).json(newPost);
    }
    catch(error){
        console.log("Error in createPost: ", error.message)
        res.status(500).json({error: error.message})
    }
}

export const deletePost = async (req, res) => {
    try{
        const post = await Post.findById(req.params.id)

        if(!post){
            return res.status(404).json({ error: "Post not found"});
        }

        if(post.user.toString() !== req.user._id.toString()){
            return res.status(401).json({ error: "You are not authorized to delete this post"})
        }

        // delete from cloudinary
        if(post.img){
            const imgId = post.img.split("/").pop().split(".")[0];
            await cloudinary.uploader.destroy(imgId)
        }

        // delete from database
        await Post.findByIdAndDelete(req.params.id);

        res.status(200).json({ message: "Post deleted successfully"});
    }
    catch(error){
        console.log("Error in deletePost: ", error.message)
        res.status(500).json({error: error.message})
    }
}

export const commentOnPost = async (req, res) => {
    try{
        const { text } = req.body;
        const postId = req.params.id;
        const userId = req.user._id;

        if(!text){
            return res.status(400).json({ error: "Text field is required"})
        }

        const post = await Post.findById(postId);
        if(!post){
            return res.status(404).json({ error: "Post not found"})
        }

        const comment = {user: userId, text}

        post.comments.push(comment);
        await post.save();

        // dont send notification if leaving comment on own post
        if(userId.toString() !== post.user.toString()){
            const notification = new Notification({
                from: userId,
                to: post.user,
                type: "comment"
            })
            await notification.save();
        }
        const updatedPost = await Post.findById(postId).populate({
            path: "user",
            select: "-password"
        }).populate({
            path: "comments.user",
            select: "-password"
        })

        res.status(200).json(updatedPost);
    }
    catch(error){
        console.log("Error in likeUnlikePost: ", error.message)
        res.status(500).json({error: error.message})
    }
}

export const likeUnlikePost = async (req, res) => {
    try{
        const userId = req.user._id;
        const {id:postId} = req.params;

        const post = await Post.findById(postId);

        if(!post){
            return res.status(404).json({ error: "Post not found"});
        }

        const userLikedPost = post.likes.includes(userId);

        if(userLikedPost){
            // Unlike post
            await Post.updateOne({_id: postId}, {$pull: {likes: userId}});
            await User.updateOne({_id:userId}, {$pull: {likedPosts: postId}})

            const updatedLikes = post.likes.filter((id) => id.toString() !== userId.toString());
            res.status(200).json(updatedLikes)
        }
        else{
            // Like post
            post.likes.push(userId);
            await User.updateOne({_id:userId}, {$push: {likedPosts:postId}})
            await post.save();

            // dont send a notification if liking own post
            if(userId.toString() !== post.user.toString()){
                const notification = new Notification({
                    from: userId,
                    to: post.user,
                    type: "like"
                })
                await notification.save();
            }

            const updatedLikes = post.likes;
            res.status(200).json(updatedLikes)
        }
    }
    catch(error){
        console.log("Error in commentOnPost: ", error.message)
        res.status(500).json({error: error.message})
    }
}

export const getAllPosts = async (req, res) => {
    try{
        const posts = await Post.find().sort({ createAt: -1}).populate({
            path: "user",
            select: "-password"
        }).populate({
            path: "comments.user",
            select: "-password"
        })

        if(posts.length === 0){
            return res.status(200).json([]);
        }

        res.status(200).json(posts);
    }
    catch(error){
        console.log("Error in getAllPosts: ", error.message)
        res.status(500).json({error: error.message})
    }
}

export const getLikedPosts = async (req, res) =>{
    try{
        const userId = req.params.id;
        const user = await User.findById(userId);

        if(!user){
            return res.status(404).json({ error: "User not found"})
        }

        const likedPosts = await Post.find({_id: {$in: user.likedPosts}}).populate({
            path: "user",
            select: "-password"
        }).populate({
            path: "comments.user",
            select: "-password"
        });

        res.status(200).json(likedPosts)
    }
    catch(error){
        console.log("Error in getLikedPosts: ", error.message)
        res.status(500).json({error: error.message})
    }
}

export const getFollowingPosts = async (req, res) => {
    try{
        const userId = req.user._id;
        const user = await User.findById(userId);

        if(!user){
            return res.status(404).json({ error: "User not found"})
        }

        const following = user.following;

        const feedPosts = await Post.find({user: {$in: following}}).populate({
            path: "user",
            select: "-password"
        }).populate({
            path: "comments.user",
            select: "-password"
        });

        res.status(200).json(feedPosts);
    }
    catch(error){
        console.log("Error in getFollowingPosts: ", error.message)
        res.status(500).json({error: error.message})
    }
}

export const getUserPosts = async (req, res) => {
    try{
        const { username } = req.params;
        const user = await User.findOne({username});

        if(!user){
            return res.status(404).json({ error: "User not found"})
        }

        const posts = (await Post.find({user: user._id}).populate({
            path: "user",
            select: "-password"
        }).populate({
            path: "comments.user",
            select: "-password"
        }));

        res.status(200).json(posts)
    }
    catch(error){
        console.log("Error in getUserPosts: ", error.message)
        res.status(500).json({error: error.message})
    }
}