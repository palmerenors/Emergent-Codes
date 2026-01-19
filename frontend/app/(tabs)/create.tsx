import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { postAPI } from '../../src/services/api';
import { pickImage, takePhoto } from '../../src/utils/imageHelper';
import { Ionicons } from '@expo/vector-icons';

export default function CreatePostScreen() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('pregnancy');
  const [tags, setTags] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const categories = [
    { key: 'pregnancy', label: 'Pregnancy', emoji: '🤰' },
    { key: 'childbirth', label: 'Childbirth', emoji: '👶' },
    { key: 'postpartum', label: 'Postpartum', emoji: '💪' },
    { key: 'baby_milestones', label: 'Baby Milestones', emoji: '🎉' },
    { key: 'general', label: 'General', emoji: '💬' },
  ];

  const handlePickImage = async () => {
    const image = await pickImage();
    if (image) {
      setImages([...images, image]);
    }
  };

  const handleTakePhoto = async () => {
    const photo = await takePhoto();
    if (photo) {
      setImages([...images, photo]);
    }
  };

  const handleRemoveImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!title || !content) {
      Alert.alert('Error', 'Please fill in title and content');
      return;
    }

    try {
      setIsLoading(true);
      const tagsArray = tags.split(',').map((t) => t.trim()).filter(Boolean);
      
      await postAPI.create({
        title,
        content,
        category,
        tags: tagsArray,
        images,
      });

      Alert.alert('Success', 'Your post has been created!', [
        {
          text: 'OK',
          onPress: () => {
            setTitle('');
            setContent('');
            setTags('');
            setImages([]);
            router.push('/(tabs)');
          },
        },
      ]);
    } catch (error: any) {
      Alert.alert(
        'Error',
        error.response?.data?.detail || 'Failed to create post'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.label}>Title</Text>
        <TextInput
          style={styles.input}
          placeholder="Share your experience..."
          value={title}
          onChangeText={setTitle}
          editable={!isLoading}
        />

        <Text style={styles.label}>Content</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Tell your story..."
          value={content}
          onChangeText={setContent}
          multiline
          numberOfLines={6}
          editable={!isLoading}
        />

        <Text style={styles.label}>Category</Text>
        <View style={styles.categoriesGrid}>
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat.key}
              style={[
                styles.categoryOption,
                category === cat.key && styles.categoryOptionActive,
              ]}
              onPress={() => setCategory(cat.key)}
              disabled={isLoading}
            >
              <Text style={styles.categoryEmoji}>{cat.emoji}</Text>
              <Text
                style={[
                  styles.categoryLabel,
                  category === cat.key && styles.categoryLabelActive,
                ]}
              >
                {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Tags (comma separated)</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. tips, advice, support"
          value={tags}
          onChangeText={setTags}
          editable={!isLoading}
        />

        <Text style={styles.label}>Images</Text>
        <View style={styles.imagesContainer}>
          {images.map((image, index) => (
            <View key={index} style={styles.imageWrapper}>
              <Image source={{ uri: image }} style={styles.image} />
              <TouchableOpacity
                style={styles.removeImageButton}
                onPress={() => handleRemoveImage(index)}
              >
                <Ionicons name="close-circle" size={24} color="#FF0000" />
              </TouchableOpacity>
            </View>
          ))}
        </View>

        <View style={styles.imageButtons}>
          <TouchableOpacity
            style={styles.imageButton}
            onPress={handlePickImage}
            disabled={isLoading}
          >
            <Ionicons name="images-outline" size={24} color="#FF69B4" />
            <Text style={styles.imageButtonText}>Pick Image</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.imageButton}
            onPress={handleTakePhoto}
            disabled={isLoading}
          >
            <Ionicons name="camera-outline" size={24} color="#FF69B4" />
            <Text style={styles.imageButtonText}>Take Photo</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.submitButtonText}>Share Post</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  textArea: {
    height: 150,
    textAlignVertical: 'top',
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  categoryOption: {
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 12,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    minWidth: 100,
    alignItems: 'center',
  },
  categoryOptionActive: {
    borderColor: '#FF69B4',
    backgroundColor: '#FFE5F1',
  },
  categoryEmoji: {
    fontSize: 24,
    marginBottom: 4,
  },
  categoryLabel: {
    fontSize: 12,
    color: '#666',
  },
  categoryLabelActive: {
    color: '#FF69B4',
    fontWeight: '600',
  },
  imagesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  imageWrapper: {
    position: 'relative',
    marginRight: 8,
    marginBottom: 8,
  },
  image: {
    width: 100,
    height: 100,
    borderRadius: 8,
  },
  removeImageButton: {
    position: 'absolute',
    top: -8,
    right: -8,
  },
  imageButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
  },
  imageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FF69B4',
  },
  imageButtonText: {
    color: '#FF69B4',
    marginLeft: 8,
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: '#FF69B4',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 32,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
