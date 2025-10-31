
import React, { useState } from 'react';
import { MOCK_POSTS } from '../constants';
import CommunityPost from './CommunityPost';

const CommunityFeed: React.FC = () => {
  const [posts, setPosts] = useState(MOCK_POSTS);

  const toggleSave = (postId: string) => {
    setPosts(posts.map(p => p.id === postId ? {...p, saved: !p.saved} : p));
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-brand-dark">Community Forum</h1>
        <button className="px-4 py-2 bg-brand-primary hover:bg-green-700 text-white font-semibold rounded-lg shadow-md transition">
          Ask a Question
        </button>
      </div>
      <div className="space-y-6">
        {posts.map(post => (
          <CommunityPost key={post.id} post={post} onToggleSave={toggleSave} />
        ))}
      </div>
    </div>
  );
};

export default CommunityFeed;
