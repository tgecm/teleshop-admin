import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getNewsfeedPosts, createNewsfeedPost, updateNewsfeedPost, deleteNewsfeedPost, getNewsfeedPostComments, adminDeleteNewsfeedComment } from '../../api/newsfeed';
import { uploadImage } from '../../api/products';
import { useToastStore } from '../../store/toastStore';
import LoadingSkeleton from '../shared/LoadingSkeleton';
import { Plus, X, Loader2, Image as ImageIcon, Heart, MessageCircle, Trash2, Edit2, Newspaper, Calendar } from 'lucide-react';
import { myanmarFormat } from '../../utils/date';

export default function NewsfeedPanel({ botId }) {
  const { addToast } = useToastStore();
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingPost, setEditingPost] = useState(null);
  const [commentsPost, setCommentsPost] = useState(null);
  const [comments, setComments] = useState(null);
  const [loadingComments, setLoadingComments] = useState(false);
  const [deletingCommentId, setDeletingCommentId] = useState(null);

  const { data: posts, isLoading } = useQuery({
    queryKey: ['newsfeed', botId],
    queryFn: () => getNewsfeedPosts(Number(botId)),
    enabled: !!botId,
  });

  const createMutation = useMutation({
    mutationFn: (data) => createNewsfeedPost({ ...data, bot_id: Number(botId) }),
    onSuccess: () => {
      queryClient.invalidateQueries(['newsfeed', botId]);
      addToast('Post created successfully');
      setShowCreateModal(false);
    },
    onError: () => addToast('Failed to create post', 'error'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => updateNewsfeedPost(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['newsfeed', botId]);
      addToast('Post updated');
      setEditingPost(null);
    },
    onError: () => addToast('Failed to update post', 'error'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => deleteNewsfeedPost(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['newsfeed', botId]);
      addToast('Post deleted');
    },
    onError: () => addToast('Failed to delete post', 'error'),
  });

  const handleViewComments = async (post) => {
    setCommentsPost(post);
    setComments(null);
    setLoadingComments(true);
    try {
      const data = await getNewsfeedPostComments(post.id);
      setComments(data);
    } catch { setComments([]); }
    setLoadingComments(false);
  };

  const handleDeleteComment = async (commentId) => {
    if (!commentsPost) return;
    setDeletingCommentId(commentId);
    try {
      await adminDeleteNewsfeedComment(commentsPost.id, commentId);
      setComments(prev => prev.filter(c => c.id !== commentId));
      addToast('Comment deleted');
    } catch { addToast('Failed to delete comment', 'error'); }
    setDeletingCommentId(null);
  };

  if (isLoading) return <LoadingSkeleton type="list" count={3} />;

  return (
    <div className="space-y-4">
      <button
        onClick={() => setShowCreateModal(true)}
        className="w-full p-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold rounded-2xl shadow-lg shadow-purple-100 hover:shadow-xl hover:from-purple-700 hover:to-indigo-700 transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
      >
        <Newspaper className="w-5 h-5" />
        Create Post
      </button>

      {(!posts || posts.length === 0) ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-dashed border-gray-200">
          <div className="w-16 h-16 bg-purple-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Newspaper className="w-8 h-8 text-purple-300" />
          </div>
          <h3 className="text-lg font-bold text-gray-900">No posts yet</h3>
          <p className="text-sm text-gray-500 max-w-xs mx-auto mt-1">
            Create posts to share updates, promotions, and news with your customers.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map(post => (
            <div key={post.id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                    <Newspaper className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-gray-900">Shop Newsfeed</p>
                    <p className="text-[10px] text-gray-400 flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> {myanmarFormat(post.created_at, 'MMM d, yyyy')}
                    </p>
                  </div>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <button onClick={() => setEditingPost(post)}
                    className="p-1.5 bg-gray-50 rounded-lg hover:bg-gray-100 transition-all">
                    <Edit2 className="w-3.5 h-3.5 text-gray-500" />
                  </button>
                  <button onClick={() => { if (confirm('Delete this post?')) deleteMutation.mutate(post.id); }}
                    className="p-1.5 bg-gray-50 rounded-lg hover:bg-rose-50 transition-all">
                    <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                  </button>
                </div>
              </div>
              <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">{post.content}</p>
              {post.images && Array.isArray(post.images) && post.images.length > 0 && (
                <div className={`grid gap-2 mt-3 ${post.images.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                  {post.images.map((img, i) => (
                    <div key={i} className="aspect-video rounded-xl bg-gray-50 overflow-hidden">
                      <img src={img.startsWith('http') ? img : `https://api.telegramecommerce.shop/telegram/file/${encodeURIComponent(img)}?bot_id=${botId}`}
                        alt="" className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              )}
              <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-50">
                <span className="flex items-center gap-1 text-xs text-gray-400">
                  <Heart className="w-3.5 h-3.5" /> {post.like_count || 0}
                </span>
                <button onClick={() => handleViewComments(post)}
                  className="flex items-center gap-1 text-xs text-gray-400 hover:text-indigo-500 transition-all">
                  <MessageCircle className="w-3.5 h-3.5" /> {post.comment_count || 0}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {(showCreateModal || editingPost) && (
        <PostFormModal
          post={editingPost}
          botId={botId}
          onClose={() => { setShowCreateModal(false); setEditingPost(null); }}
          onSave={(data) => {
            if (editingPost) updateMutation.mutate({ id: editingPost.id, data });
            else createMutation.mutate(data);
          }}
          isPending={createMutation.isPending || updateMutation.isPending}
        />
      )}

      {/* Comments Modal */}
      {commentsPost && (
        <>
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50" onClick={() => setCommentsPost(null)} />
          <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-[32px] z-[60] max-h-[70vh] overflow-y-auto md:max-w-lg md:mx-auto md:bottom-10 md:rounded-[32px] md:shadow-2xl">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-gray-900">Comments ({commentsPost.comment_count || 0})</h2>
                <button onClick={() => setCommentsPost(null)} className="p-2 bg-gray-100 rounded-full active:scale-90 transition-transform">
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>
              {loadingComments ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
                </div>
              ) : comments && comments.length > 0 ? (
                <div className="space-y-3">
                  {comments.map(c => (
                    <div key={c.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                      <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-[11px] font-bold text-indigo-600 flex-shrink-0">
                        {(c.visitor_name || 'G')[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-bold text-gray-700">{c.visitor_name || 'Guest'}</p>
                          <button
                            onClick={() => handleDeleteComment(c.id)}
                            disabled={deletingCommentId === c.id}
                            className="p-1 text-gray-400 hover:text-rose-500 hover:bg-rose-50 rounded transition-all flex-shrink-0">
                            {deletingCommentId === c.id
                              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              : <Trash2 className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                        <p className="text-xs text-gray-600 mt-0.5">{c.content}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">
                          {c.created_at ? myanmarFormat(c.created_at, 'MMM d, yyyy · h:mm a') : ''}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400 text-center py-8">No comments yet.</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function PostFormModal({ post, botId, onClose, onSave, isPending }) {
  const [content, setContent] = useState(post?.content || '');
  const [images, setImages] = useState(post?.images || []);
  const [uploading, setUploading] = useState(false);
  const { addToast } = useToastStore();

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (images.length + files.length > 5) {
      addToast('Maximum 5 images allowed', 'error');
      return;
    }
    setUploading(true);
    try {
      for (const file of files) {
        const result = await uploadImage(file, botId);
        setImages(prev => [...prev, result.file_id || result.id || result.url]);
      }
    } catch (err) {
      addToast('Failed to upload image', 'error');
    }
    setUploading(false);
    e.target.value = '';
  };

  const removeImage = (index) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-[32px] z-[60] max-h-[90vh] overflow-y-auto md:max-w-lg md:mx-auto md:bottom-10 md:rounded-[32px] md:shadow-2xl">
        <div className="p-6 pb-20 md:pb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">{post ? 'Edit Post' : 'Create Post'}</h2>
            <button onClick={onClose} className="p-2 bg-gray-100 rounded-full active:scale-90 transition-transform">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white text-sm font-bold">
                <Newspaper className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900">Shop Newsfeed</p>
                <p className="text-xs text-gray-400">Post to your customers</p>
              </div>
            </div>

            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="What's on your mind?"
              rows={4}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium resize-none"
            />

            {/* Image previews */}
            {images.length > 0 && (
              <div className={`grid gap-2 ${images.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                {images.map((img, i) => (
                  <div key={i} className="relative aspect-video rounded-xl bg-gray-50 overflow-hidden group">
                    <img src={img.startsWith('http') ? img : `https://api.telegramecommerce.shop/telegram/file/${encodeURIComponent(img)}?bot_id=${botId}`}
                      alt="" className="w-full h-full object-cover" />
                    <button onClick={() => removeImage(i)}
                      className="absolute top-2 right-2 p-1.5 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-all text-white">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Upload button */}
            {images.length < 5 && (
              <label className="flex items-center justify-center gap-2 w-full p-4 border-2 border-dashed border-gray-200 rounded-2xl cursor-pointer hover:border-indigo-300 hover:bg-indigo-50/30 transition-all">
                {uploading ? (
                  <Loader2 className="w-5 h-5 text-indigo-500 animate-spin" />
                ) : (
                  <ImageIcon className="w-5 h-5 text-gray-400" />
                )}
                <span className="text-sm font-bold text-gray-500">{uploading ? 'Uploading...' : `Add Photo (${images.length}/5)`}</span>
                <input type="file" accept="image/*" multiple onChange={handleImageUpload} className="hidden" disabled={uploading} />
              </label>
            )}

            <button
              onClick={() => onSave({ content, images })}
              disabled={!content.trim() || isPending || uploading}
              className="w-full px-6 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold rounded-2xl shadow-lg hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
            >
              {isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Newspaper className="w-5 h-5" />}
              {post ? 'Update Post' : 'Publish Post'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
