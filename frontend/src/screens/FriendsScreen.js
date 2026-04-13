import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Image, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import axios from 'axios';
import { useAuthStore } from '../store/authStore';
import { useChatStore } from '../store/chatStore';

import { API_URL } from '../config';

export default function FriendsScreen({ navigation }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const { token, user: currentUser } = useAuthStore();
  const { friends, fetchFriends, isLoadingFriends, groups, fetchGroups } = useChatStore();

  const authHeader = { headers: { Authorization: `Bearer ${token}` } };

  const fetchData = async () => {
    // We already have fetchFriends in ChatStore, but we still need pendingRequests locally for now
    fetchFriends(token); 
    fetchGroups(token);
    try {
      const requestsRes = await axios.get(`${API_URL}/friends/requests/pending`, authHeader).catch(() => ({ data: [] }));
      if (requestsRes.data) {
          setPendingRequests(requestsRes.data);
      }
    } catch (error) {
      console.log('Error fetching pending requests', error);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSearch = async (text) => {
    setSearchQuery(text);
    if (text.length > 2) {
      setIsSearching(true);
      try {
        const response = await axios.get(`${API_URL}/friends/search?q=${text}`, authHeader);
        setSearchResults(response.data);
      } catch (error) {
        console.log('Search error:', error);
      } finally {
        setIsSearching(false);
      }
    } else {
      setSearchResults([]);
    }
  };

  const handleAddFriend = async (recipientId) => {
    try {
      await axios.post(`${API_URL}/friends/request`, { recipientId }, authHeader);
      Alert.alert('Success', 'Friend request sent!');
      handleSearch(searchQuery); // Refresh search results
    } catch (error) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to send request');
    }
  };

  const handleAcceptRequest = async (requestId) => {
    try {
      await axios.put(`${API_URL}/friends/accept`, { requestId }, authHeader);
      Alert.alert('Success', 'Friend request accepted!');
      fetchData(); // Refresh friends list
    } catch (error) {
      Alert.alert('Error', 'Failed to accept request');
    }
  };

  const navigateToChat = (friendUser) => {
    navigation.navigate('Chat', { 
      friendId: friendUser._id || friendUser.id, 
      friendName: friendUser.displayName || friendUser.username || friendUser.email,
      friendProfilePicture: friendUser.profilePicture
    });
  };

  const isAlreadyFriend = (userId) => {
    return friends.some(f => (f._id || f.id) === userId);
  };

  const renderSearchResult = ({ item }) => {
    const isFriend = isAlreadyFriend(item.id || item._id);
    
    return (
      <View style={styles.friendCard}>
        <View style={styles.avatarPlaceholder}>
          <Text style={styles.avatarText}>{item.email?.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.friendName}>{item.displayName || item.username || item.email?.split('@')[0]}</Text>
          <Text style={styles.friendEmail}>{item.email}</Text>
        </View>
        {isFriend ? (
          <TouchableOpacity style={styles.buttonContainer} onPress={() => navigateToChat(item)}>
            <LinearGradient colors={['#00e5ff', '#3d5afe']} style={styles.buttonGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
              <Text style={styles.buttonTextSmall}>Chat</Text>
            </LinearGradient>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.buttonContainer} onPress={() => handleAddFriend(item.id || item._id)}>
            <LinearGradient colors={['#00e5ff', '#3d5afe']} style={styles.buttonGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
              <Text style={styles.buttonTextSmall}>Add</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TextInput
            style={[styles.searchInput, { flex: 1 }]}
            placeholder="Search by email..."
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={handleSearch}
            autoCapitalize="none"
            />
            <TouchableOpacity style={{ marginLeft: 12 }} onPress={() => navigation.navigate('CreateGroup')}>
                <LinearGradient colors={['#00e5ff', '#3d5afe']} style={{ padding: 12, borderRadius: 12 }} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                    <Text style={{ color: '#fff', fontWeight: 'bold' }}>+ Group</Text>
                </LinearGradient>
            </TouchableOpacity>
        </View>
      </View>

      {isLoadingFriends && friends.length === 0 ? (
        <ActivityIndicator color="#4CAF50" style={{ marginTop: 20 }} />
      ) : searchQuery.length > 2 ? (
        <FlatList
          data={searchResults}
          keyExtractor={(item) => item.id || item._id}
          ListHeaderComponent={<Text style={styles.listSectionTitle}>Search Results</Text>}
          renderItem={renderSearchResult}
        />
      ) : (
        <View style={{ flex: 1 }}>
          {pendingRequests.length > 0 && (
            <FlatList
              data={pendingRequests}
              keyExtractor={(item) => item._id}
              style={{ maxHeight: 200 }}
              ListHeaderComponent={<Text style={styles.listSectionTitle}>Incoming Requests</Text>}
              renderItem={({ item }) => (
                <View style={styles.friendCard}>
                  <View style={styles.avatarPlaceholder}>
                    <Text style={styles.avatarText}>{(item.requesterId?.email || 'U').charAt(0).toUpperCase()}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.friendName}>{item.requesterId?.email?.split('@')[0] || 'Unknown User'}</Text>
                    <Text style={styles.friendEmail}>Sent you a request</Text>
                  </View>
                  <TouchableOpacity style={styles.buttonContainer} onPress={() => handleAcceptRequest(item._id)}>
                    <LinearGradient colors={['#00e5ff', '#3d5afe']} style={styles.buttonGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                      <Text style={styles.buttonTextSmall}>Accept</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              )}
            />
          )}

          <FlatList
            data={[...friends].sort((a, b) => (b.isStarred ? 1 : 0) - (a.isStarred ? 1 : 0))}
            keyExtractor={(item) => item._id || item.id}
            ListHeaderComponent={<Text style={styles.listSectionTitle}>Your Friends</Text>}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.friendCard} onPress={() => navigateToChat(item)}>
                <View style={[styles.avatarPlaceholder, item.isStarred && { borderColor: '#FFD700', borderWidth: 2 }]}>
                  {item.profilePicture ? (
                    <Image source={{ uri: item.profilePicture }} style={{ width: 44, height: 44, borderRadius: 22 }} />
                  ) : (
                    <Text style={styles.avatarText}>{item.email?.charAt(0).toUpperCase()}</Text>
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={styles.friendName}>{item.displayName || item.username || item.email?.split('@')[0]}</Text>
                    {item.isStarred && <Ionicons name="star" size={14} color="#FFD700" style={{ marginLeft: 6 }} />}
                  </View>
                  <Text style={styles.friendEmail}>{item.status === 'online' ? '🟢 Online' : '⚪ Offline'}</Text>
                </View>
              </TouchableOpacity>
            )}
            ListEmptyComponent={<Text style={styles.emptyText}>No friends yet. Search above to add some!</Text>}
          />

          <FlatList
            data={groups}
            keyExtractor={(item) => item._id || item.id}
            ListHeaderComponent={<Text style={styles.listSectionTitle}>Your Groups</Text>}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.friendCard} onPress={() => navigation.navigate('GroupChat', { groupId: item._id || item.id, groupName: item.name })}>
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarText}>{item.name?.charAt(0).toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.friendName}>{item.name}</Text>
                  <Text style={styles.friendEmail}>{item.memberIds?.length || 0} Members</Text>
                </View>
              </TouchableOpacity>
            )}
            style={{ marginBottom: 20 }}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F1014',
  },
  header: {
    padding: 16,
    paddingTop: Platform.OS === 'android' ? 40 : 20,
    backgroundColor: '#0F1014',
  },
  searchInput: {
    backgroundColor: '#1A1B22',
    color: '#fff',
    padding: 12,
    borderRadius: 12,
    fontSize: 16,
  },
  listSectionTitle: {
    color: '#8A8D9F',
    fontSize: 12,
    fontWeight: 'bold',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  friendCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1A1B22',
  },
  avatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1A1B22',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  avatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  friendName: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  friendEmail: {
    color: '#8A8D9F',
    fontSize: 14,
  },
  buttonContainer: {
    borderRadius: 6,
    overflow: 'hidden',
  },
  buttonGradient: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignItems: 'center',
  },
  buttonTextSmall: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  emptyText: {
    color: '#888',
    textAlign: 'center',
    marginTop: 32,
    fontSize: 16,
  }
});
