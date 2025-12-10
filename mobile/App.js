import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, FlatList, Alert, ScrollView, Modal, SafeAreaView, Platform } from 'react-native';
import { Audio } from 'expo-av';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import QRCode from 'react-native-qrcode-svg';
import ConfettiCannon from 'react-native-confetti-cannon';
import { THEMES, AVATARS } from './shared/themeConfig';

// CHANGE THIS TO YOUR LOCAL IP ADDRESS IF TESTING ON DEVICE
const API_URL = "http://192.168.1.100:3000";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true, shouldPlaySound: true, shouldSetBadge: false,
  }),
});

export default function App() {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [messages, setMessages] = useState([]);

  // Auth State
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [view, setView] = useState('login'); // login, register, home

  // Effects
  useEffect(() => {
    checkLogin();
  }, []);

  const checkLogin = async () => {
    const t = await AsyncStorage.getItem('token');
    const u = await AsyncStorage.getItem('user');
    if (t && u) {
      setToken(t);
      setUser(JSON.parse(u));
      fetchMessages(t, JSON.parse(u).id);
    }
  };

  const registerForPush = async () => {
    if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
            name: 'default', importance: Notifications.AndroidImportance.MAX
        });
    }
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') return null;
    const tokenData = await Notifications.getExpoPushTokenAsync();
    return tokenData.data;
  };

  const handleAuth = async (endpoint) => {
    try {
      const pushToken = await registerForPush();
      const res = await axios.post(`${API_URL}/${endpoint}`, { username, password, pushToken });

      if (endpoint === 'register') {
        Alert.alert("Success", "Account created! Please login.");
        setView('login');
      } else {
        const { token, ...userData } = res.data;
        await AsyncStorage.setItem('token', token);
        await AsyncStorage.setItem('user', JSON.stringify(userData));
        setToken(token);
        setUser(userData);
        fetchMessages(token, userData.id);
      }
    } catch (e) {
      Alert.alert("Error", e.response?.data?.error || "Connection failed");
    }
  };

  const fetchMessages = async (t, uid) => {
    try {
      const res = await axios.get(`${API_URL}/messages/${uid}`, {
        headers: { Authorization: `Bearer ${t}` }
      });
      setMessages(res.data);
    } catch (e) { console.log(e); }
  };

  const logout = async () => {
    await AsyncStorage.clear();
    setToken(null);
    setUser(null);
    setView('login');
  };

  // Render Logic
  if (!token) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Txtme 👻</Text>
        <TextInput 
          style={styles.input} 
          placeholder="Username" 
          placeholderTextColor="#888"
          value={username} onChangeText={setUsername} 
          autoCapitalize="none"
        />
        <TextInput 
          style={styles.input} 
          placeholder="Password" 
          placeholderTextColor="#888"
          value={password} onChangeText={setPassword} 
          secureTextEntry 
        />

        <TouchableOpacity style={styles.btn} onPress={() => handleAuth(view)}>
          <Text style={styles.btnText}>{view === 'login' ? 'Login' : 'Register'}</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setView(view === 'login' ? 'register' : 'login')}>
          <Text style={{color:'#8A2BE2', marginTop:20}}>
            {view === 'login' ? 'Need an account? Register' : 'Have an account? Login'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  const theme = THEMES[user.theme_id] || THEMES[0];

  return (
    <SafeAreaView style={[styles.container, {backgroundColor: theme.bg}]}>
       <View style={styles.header}>
         <Text style={[styles.title, {color: theme.text}]}>@{user.username}</Text>
         <TouchableOpacity onPress={logout}><Text style={{color:'red'}}>Logout</Text></TouchableOpacity>
       </View>

       <ScrollView contentContainerStyle={{alignItems:'center', padding:20}}>
          <View style={{backgroundColor:'white', padding:10, borderRadius:10}}>
             <QRCode value={`http://YOUR_LOCAL_IP:5173/?u=${user.username}`} size={150} />
          </View>
          <Text style={{color:theme.text, marginTop:10}}>Share this QR to get messages!</Text>
       </ScrollView>

       <FlatList
         data={messages}
         keyExtractor={item => item.id.toString()}
         style={{width:'100%', paddingHorizontal:20}}
         renderItem={({item}) => (
           <View style={[styles.card, {backgroundColor: theme.card}]}>
             <Text style={{color: theme.text}}>{item.type === 'audio' ? '🎤 Voice Message' : item.content}</Text>
             <Text style={{color: '#888', fontSize:10, marginTop:5}}>
               {new Date(item.created_at).toLocaleString()}
             </Text>
           </View>
         )}
         ListEmptyComponent={<Text style={{color:'#888', textAlign:'center', marginTop:20}}>No messages yet...</Text>}
       />
       <TouchableOpacity 
         style={[styles.refreshBtn, {backgroundColor:theme.accent}]} 
         onPress={() => fetchMessages(token, user.id)}>
         <Text style={{color:'white'}}>Refresh</Text>
       </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a1a', justifyContent: 'center', alignItems: 'center' },
  header: { width:'100%', flexDirection:'row', justifyContent:'space-between', padding:20, marginTop:30 },
  title: { fontSize: 30, fontWeight: 'bold', color: '#fff', marginBottom: 20 },
  input: { width: '80%', padding: 15, backgroundColor: '#333', borderRadius: 10, color: '#fff', marginBottom: 15 },
  btn: { width: '80%', padding: 15, backgroundColor: '#8A2BE2', borderRadius: 10, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: 'bold' },
  card: { padding: 20, marginVertical: 8, borderRadius: 10, width: '100%' },
  refreshBtn: { position:'absolute', bottom:30, padding:15, borderRadius:30, elevation:5 }
});
