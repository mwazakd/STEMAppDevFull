
import React, { useState } from 'react';
import type { Post } from '../types';
import { ArrowUpIcon, MessageSquareIcon, BookmarkIcon } from './Icons';

interface CommunityPostProps {
  post: Post;
  onToggleSave: (postId: string) => void;
}

const CommunityPost: React.FC<CommunityPostProps> = ({ post, onToggleSave }) => {
  const [upvotes, setUpvotes] = useState(post.upvotes);
  const [voted, setVoted] = useState(false);

  const handleUpvote = () => {
    if (voted) {
      setUpvotes(upvotes - 1);
      setVoted(false);
    } else {
      setUpvotes(upvotes + 1);
      setVoted(true);
    }
  };

  return (
    <article className="bg-white rounded-lg shadow-lg overflow-hidden transition hover:shadow-xl">
      <div className="p-6">
        <div className="flex items-start">
          <img className="h-10 w-10 rounded-full mr-4" src={post.author.avatarUrl} alt={post.author.name} />
          <div className="flex-1">
            <div className="flex items-baseline">
              <span className="font-semibold text-brand-dark">{post.author.name}</span>
              <span className="text-gray-500 text-xs ml-2">&bull; {post.timestamp}</span>
            </div>
            <h2 className="text-xl font-bold text-brand-dark mt-1">{post.title}</h2>
          </div>
        </div>
        <p className="text-gray-700 mt-4 ml-14">{post.content}</p>
        <div className="flex items-center justify-between mt-6 ml-14">
            <div className="flex items-center space-x-6 text-gray-500">
                <button
                    onClick={handleUpvote}
                    className={`flex items-center space-x-1 hover:text-brand-primary transition group ${voted ? 'text-brand-primary' : ''}`}
                >
                    <ArrowUpIcon className={`h-5 w-5 group-hover:stroke-brand-primary ${voted ? 'stroke-brand-primary' : ''}`} />
                    <span className="font-semibold">{upvotes}</span>
                </button>
                <button className="flex items-center space-x-1 hover:text-brand-primary transition group">
                    <MessageSquareIcon className="h-5 w-5 group-hover:stroke-brand-primary" />
                    <span className="font-semibold">{post.comments.length} Comments</span>
                </button>
            </div>
            <button
                onClick={() => onToggleSave(post.id)}
                className={`hover:text-brand-accent transition ${post.saved ? 'text-brand-accent' : 'text-gray-500'}`}
                >
                <BookmarkIcon className={`h-6 w-6 ${post.saved ? 'fill-current' : 'fill-none'}`} />
            </button>
        </div>
      </div>
    </article>
  );
};

export default CommunityPost;
