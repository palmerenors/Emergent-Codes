import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Image,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { postAPI, commentAPI } from '../../src/services/api';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';

export default function PostDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [post, setPost] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newComment, setNewComment] = useState('');

  useEffect(() => {
    fetchPostData();
  }, [id]);

  const fetchPostData = async () => {
    try {
      const [postRes, commentsRes] = await Promise.all([
        postAPI.getById(id as string),
        commentAPI.getByPost(id as string),
      ]);
      setPost(postRes.data);
      setComments(commentsRes.data);
    } catch (error) {
      console.error('Error fetching post:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;

    try {
      await commentAPI.create({ post_id: id as string, content: newComment });
      setNewComment('');
      fetchPostData();
    } catch (error) {
      console.error('Error adding comment:', error);
    }
  };

  const handleLike = async () => {
    try {
      await postAPI.like(id as string);
      fetchPostData();
    } catch (error) {
      console.error('Error liking post:', error);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#FF69B4" />
      </View>
    );
  }

  if (!post) {
    return (
      <View style={styles.centerContainer}>
        <Text>Post not found</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Post</Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.postContainer}>
          <View style={styles.authorInfo}>
            {post.author_picture ? (
              <Image source={{ uri: post.author_picture }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Ionicons name="person" size={20} color="#999" />
              </View>
            )}
            <View>
              <Text style={styles.authorName}>{post.author_name}</Text>
              <Text style={styles.postDate}>
                {format(new Date(post.created_at), 'MMM d, yyyy')}
              </Text>
            </View>
          </View>

          <Text style={styles.postTitle}>{post.title}</Text>
          <Text style={styles.postContent}>{post.content}</Text>

          {post.images && post.images.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {post.images.map((image: string, index: number) => (
                <Image
                  key={index}
                  source={{ uri: image }}
                  style={styles.postImage}
                  resizeMode="cover"
                />
              ))}
            </ScrollView>
          )}

          <View style={styles.actions}>
            <TouchableOpacity style={styles.actionButton} onPress={handleLike}>
              <Ionicons name="heart" size={24} color="#FF69B4" />
              <Text style={styles.actionText}>{post.likes_count} Likes</Text>
            </TouchableOpacity>

            <View style={styles.actionButton}>
              <Ionicons name="chatbubble" size={24} color="#666" />
              <Text style={styles.actionText}>{post.comments_count} Comments</Text>
            </View>
          </View>
        </View>

        <View style={styles.commentsSection}>
          <Text style={styles.commentsTitle}>Comments</Text>
          {comments.map((comment) => (
            <View key={comment.comment_id} style={styles.comment}>
              <View style={styles.commentHeader}>
                {comment.author_picture ? (
                  <Image
                    source={{ uri: comment.author_picture }}
                    style={styles.commentAvatar}
                  />
                ) : (
                  <View style={[styles.commentAvatar, styles.avatarPlaceholder]}>
                    <Ionicons name="person" size={16} color="#999" />
                  </View>
                )}
                <Text style={styles.commentAuthor}>{comment.author_name}</Text>
              </View>
              <Text style={styles.commentContent}>{comment.content}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      <View style={styles.commentInputContainer}>
        <TextInput
          style={styles.commentInput}
          placeholder="Add a comment..."
          value={newComment}
          onChangeText={setNewComment}
          multiline
        />
        <TouchableOpacity
          style={styles.sendButton}
          onPress={handleAddComment}
          disabled={!newComment.trim()}
        >
          <Ionicons
            name="send"
            size={24}
            color={newComment.trim() ? '#FF69B4' : '#CCC'}
          />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: '#FF69B4',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingTop: 48,
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  content: {
    flex: 1,
  },
  postContainer: {
    backgroundColor: 'white',
    padding: 16,
    marginBottom: 8,
  },
  authorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  avatarPlaceholder: {
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  authorName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  postDate: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  postTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  postContent: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
    marginBottom: 16,
  },
  postImage: {
    width: 300,
    height: 200,
    borderRadius: 8,
    marginRight: 8,
  },
  actions: {
    flexDirection: 'row',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 24,
  },
  actionText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  commentsSection: {
    backgroundColor: 'white',
    padding: 16,
  },
  commentsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  comment: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  commentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
  },
  commentAuthor: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  commentContent: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  commentInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  commentInput: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    padding: 12,
    borderRadius: 24,
    fontSize: 14,
    maxHeight: 100,
    marginRight: 8,
  },
  sendButton: {
    padding: 8,
  },
});
