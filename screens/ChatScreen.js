import React, { useState,useRef,useEffect } from 'react';
import {
  TextInput,
  Text,
  ScrollView,
  StyleSheet,
  View,
  Modal,
  Pressable,
  Image,
  Animated,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';

const WebRTC = Platform.OS === 'web' ? null : require('react-native-webrtc');

function FormattedAssistantMessage({ content }) {
  return (
    <View style={styles.markdownMessage}>
      {content.split('\n').map((line, index) => {
        if (!line.trim()) return <View key={`space-${index}`} style={styles.markdownSpacer} />;
        const listMatch = line.match(/^\s*(\d+)\.\s+(.*)$/);
        const parts = (listMatch ? listMatch[2] : line).split(/(\*\*.*?\*\*)/g);
        return (
          <Text key={`line-${index}`} style={styles.markdownLine}>
            {listMatch && <Text style={styles.markdownListNumber}>{listMatch[1]}. </Text>}
            {parts.map((part, partIndex) => {
              const bold = part.startsWith('**') && part.endsWith('**');
              return <Text key={`part-${partIndex}`} style={bold ? styles.markdownBold : undefined}>{bold ? part.slice(2, -2) : part}</Text>;
            })}
          </Text>
        );
      })}
    </View>
  );
}

export default function ChatScreen() {
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages,setMessages] = useState([]);
  const [voicePopupVisible, setVoicePopupVisible] = useState(false);
  const [attachmentMenuVisible, setAttachmentMenuVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [voiceStatus, setVoiceStatus] = useState('Ready to listen');
  const [micEnabled, setMicEnabled] = useState(true);
  const voiceStreamRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const voiceConnectionStartedRef = useRef(false);
  const orbPulse = useRef(new Animated.Value(0)).current;
  const orbAnimationRef = useRef(null);

  useEffect(() => {
    const isSpeaking = voiceStatus === 'Kissan AI is speaking...';
    orbAnimationRef.current?.stop();
    if (isSpeaking) {
      orbAnimationRef.current = Animated.loop(Animated.sequence([
        Animated.timing(orbPulse, { toValue: 1, duration: 850, useNativeDriver: true }),
        Animated.timing(orbPulse, { toValue: 0, duration: 850, useNativeDriver: true }),
      ]));
      orbAnimationRef.current.start();
    } else {
      Animated.spring(orbPulse, { toValue: 0, useNativeDriver: true, speed: 14 }).start();
    }
    return () => orbAnimationRef.current?.stop();
  }, [voiceStatus, orbPulse]);

  const scrollViewRef = useRef(null);

  useEffect(() => {
    if (!voicePopupVisible) return undefined;
    if (voiceConnectionStartedRef.current) return undefined;
    voiceConnectionStartedRef.current = true;

    let cancelled = false;
    const requestMicrophone = async () => {
      setVoiceStatus('Requesting microphone access...');
      try {
        const stream = Platform.OS === 'web'
          ? await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
          : await WebRTC.mediaDevices.getUserMedia({ audio: true, video: false });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        voiceStreamRef.current = stream;
        setMicEnabled(true);
        setVoiceStatus('Connecting to Kissan AI...');
        await connectRealtime(stream);
      } catch (error) {
        console.error('Microphone permission error:', error);
        setMicEnabled(false);
        setVoiceStatus('Microphone permission is required');
      }
    };

    requestMicrophone();
    return () => { cancelled = true; };
  }, [voicePopupVisible]);

  const connectRealtime = async (stream) => {
    try {
      const serverUrl = process.env.EXPO_PUBLIC_VOICE_SERVER_URL || 'http://localhost:3001';
      console.log('Requesting voice session from:', serverUrl);
      const tokenResponse = await fetch(`${serverUrl}/realtime/session`, { method: 'POST' });
      const tokenData = await tokenResponse.json();

      if (!tokenResponse.ok || !tokenData.value) {
        throw new Error(tokenData.error || 'The voice server did not return a session token.');
      }

      const PeerConnection = Platform.OS === 'web' ? RTCPeerConnection : WebRTC.RTCPeerConnection;
      const SessionDescription = Platform.OS === 'web' ? RTCSessionDescription : WebRTC.RTCSessionDescription;
      const peerConnection = new PeerConnection();
      peerConnectionRef.current = peerConnection;

      stream.getTracks().forEach((track) => peerConnection.addTrack(track, stream));
      peerConnection.addEventListener('track', (event) => {
        setVoiceStatus('Kissan AI is connected');
        if (Platform.OS === 'web' && event.streams?.[0]) {
          const audio = new Audio();
          audio.autoplay = true;
          audio.srcObject = event.streams[0];
          audio.play().catch((error) => console.warn('Could not play voice response:', error));
        }
      });

      const dataChannel = peerConnection.createDataChannel('oai-events');
      dataChannel.addEventListener('open', () => setVoiceStatus('Listening...'));
      dataChannel.addEventListener('message', (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'input_audio_buffer.speech_started') setVoiceStatus('Listening...');
        if (data.type === 'response.created') setVoiceStatus('Kissan AI is speaking...');
        if (data.type === 'response.done') setVoiceStatus('Listening...');
      });

      const offer = await peerConnection.createOffer({ offerToReceiveAudio: true });
      await peerConnection.setLocalDescription(offer);
      const sdpResponse = await fetch('https://api.openai.com/v1/realtime/calls', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${tokenData.value}`,
          'Content-Type': 'application/sdp',
        },
        body: offer.sdp,
      });

      const answerSdp = await sdpResponse.text();
      console.log('OpenAI realtime SDP response:', sdpResponse.status);
      if (!sdpResponse.ok) throw new Error(answerSdp);
      await peerConnection.setRemoteDescription(
        new SessionDescription({ type: 'answer', sdp: answerSdp })
      );
      setVoiceStatus('Listening...');
    } catch (error) {
      console.error('Realtime voice connection error:', error);
      setVoiceStatus('Could not connect to Kissan AI');
    }
  };

  const closeVoiceMode = () => {
    peerConnectionRef.current?.close();
    peerConnectionRef.current = null;
    voiceConnectionStartedRef.current = false;
    voiceStreamRef.current?.getTracks().forEach((track) => track.stop());
    voiceStreamRef.current = null;
    setVoicePopupVisible(false);
    setVoiceStatus('Ready to listen');
  };

  const toggleMicrophone = () => {
    const nextEnabled = !micEnabled;
    voiceStreamRef.current?.getTracks().forEach((track) => { track.enabled = nextEnabled; });
    setMicEnabled(nextEnabled);
    setVoiceStatus(nextEnabled ? 'Microphone is on' : 'Microphone is muted');
  };

  // your other states and functions...

  useEffect(() => {
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollToEnd({ animated: true });
    }
  }, [messages]);


  const handleSend = async () => {
    if (!query) return;

    const attachedImage = selectedImage;
    console.log('Sending chat image bytes:', attachedImage?.base64?.length || 0);

    setLoading(true);
    setResponse('');
    setQuery('');
    setSelectedImage(null);

    setMessages((prev)=>[...prev,{content:query, image: attachedImage?.uri, author:'human'}]);

    try {
      const serverUrl = process.env.EXPO_PUBLIC_VOICE_SERVER_URL || 'http://localhost:3001';
      const res = await fetch(`${serverUrl}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          message: query,
          imageBase64: attachedImage?.base64,
          imageMimeType: attachedImage?.mimeType,
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `Chat request failed (${res.status})`);
      const reply = data.reply;

      setMessages((prev)=>[...prev,{content:reply,author:'ai'}]);
    } catch (err) {
      console.error(err);
      setMessages((prev)=>[...prev,{content:'Unable to connect to Kissan AI. Please try again.',author:'ai'}]);
    }

    setLoading(false);
  };

  const chooseImage = async (source) => {
    setAttachmentMenuVisible(false);
    const permission = source === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) return;

    const result = source === 'camera'
      ? await ImagePicker.launchCameraAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          quality: 0.6,
          width: 1280,
          height: 1280,
          base64: true,
        })
      : await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          quality: 0.6,
          width: 1280,
          height: 1280,
          base64: true,
        });

    if (!result.canceled && result.assets?.[0]) {
      setSelectedImage(result.assets[0]);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>

      <ScrollView
      nativeID="chat-history-scroll-view"
      ref={scrollViewRef} 
      contentContainerStyle={styles.messageList}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag" 
        style={styles.chatBox}>
        {messages.map((i,index)=>{
            return(
                <View key={`${i.author}-${index}`} style={i.author === 'human' ? styles.messageContainer : styles.messageContainer_assistant}>
                  {i.image && <Image source={{ uri: i.image }} style={styles.messageImage} />}
                  {i.author === 'human' ? <Text style={styles.human}>{i.content}</Text> : <FormattedAssistantMessage content={i.content} />}
                </View>
                     
        
        );
        })}
      
      </ScrollView>

      {selectedImage && (
        <View style={styles.imagePreviewRow}>
          <Image source={{ uri: selectedImage.uri }} style={styles.imageThumbnail} />
          <Pressable onPress={() => setSelectedImage(null)} style={styles.removeImageButton}>
            <Text style={styles.removeImageText}>×</Text>
          </Pressable>
        </View>
      )}

      <View style={styles.inputRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add a photo"
          style={styles.addButton}
          onPress={() => setAttachmentMenuVisible(true)}
        >
          <Text style={styles.addButtonText}>+</Text>
        </Pressable>

          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Ask Kissan AI anything..."
            style={styles.input}
            onSubmitEditing={handleSend}
            blurOnSubmit={false}
          />

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open voice mode"
            style={styles.voiceButton}
            onPress={() => setVoicePopupVisible(true)}
          >
            <Image style={styles.voiceIcon} source={require('../assets/voice-mode.png')}/>
          </Pressable>

      </View>

      <Modal
        visible={attachmentMenuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setAttachmentMenuVisible(false)}
      >
        <Pressable style={styles.attachmentBackdrop} onPress={() => setAttachmentMenuVisible(false)}>
          <View style={styles.attachmentMenu}>
            <Text style={styles.attachmentTitle}>Add a photo</Text>
            <Pressable style={styles.attachmentOption} onPress={() => chooseImage('camera')}>
              <Text style={styles.attachmentOptionText}>Take a photo</Text>
            </Pressable>
            <Pressable style={styles.attachmentOption} onPress={() => chooseImage('gallery')}>
              <Text style={styles.attachmentOptionText}>Choose from gallery</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      <Modal
        visible={voicePopupVisible}
        transparent
        animationType="fade"
        onRequestClose={closeVoiceMode}
      >
        <SafeAreaView style={styles.voiceModalPopUp} edges={['top', 'bottom', 'left', 'right']}>
          <View style={styles.voiceHeader}>
            <Pressable onPress={closeVoiceMode} hitSlop={12} style={styles.voiceBackButton}>
                <Image
                  source={require('../assets/down-arrow.png')}
                  style={styles.downArrow}
                />
            </Pressable>
            <View style={styles.voiceHeaderTitle}>
             <Text style={styles.popupTitle}>Voice mode</Text>
            </View>
            
          </View>

          <View style={styles.voiceStage}>
            <Animated.View style={[styles.voiceGlow, {
              transform: [{
                scale: orbPulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] }),
              }],
            }]}>
              <LinearGradient
                colors={['#B8F7D4', '#68D7D0', '#7478F2', '#C46BFF']}
                start={{ x: 0.15, y: 0.1 }}
                end={{ x: 0.85, y: 0.9 }}
                style={styles.voiceOrb}
              >
                <Animated.View style={{ opacity: orbPulse.interpolate({ inputRange: [0, 1], outputRange: [0.65, 1] }) }}>
                <LinearGradient
                  colors={['rgba(255,255,255,0.7)', 'rgba(255,255,255,0)']}
                  start={{ x: 0.15, y: 0.05 }}
                  end={{ x: 0.8, y: 0.8 }}
                  style={styles.orbHighlight}
                />
                </Animated.View>
              </LinearGradient>
            </Animated.View>
            <Text style={styles.voiceStatus}>{voiceStatus}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={micEnabled ? 'Mute microphone' : 'Unmute microphone'}
              onPress={toggleMicrophone}
              style={[styles.micButton, !micEnabled && styles.micButtonMuted]}
            >
              <Image
                source={micEnabled ? require('../assets/sound.png') : require('../assets/no-sound.png')}
                style={styles.micIcon}
              />
            </Pressable>
          </View>

         
            {/* <Pressable
              style={styles.closeButton}
              onPress={() => setVoicePopupVisible(false)}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </Pressable> */}
         
        </SafeAreaView>
      </Modal>
      {/* <Button title={loading ? "Sending..." : "Send"} onPress={handleSend} disabled={loading} /> */}
    </SafeAreaView>
  );
}

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     padding: 20,
//     backgroundColor: 'none',
//     // borderColor:'blue',
//     // borderWidth:10,
//     flexDirection:'column',
//     alignItems:'center'
   
//   },
//   chatBox: {
//     flex: 1,
//     marginBottom: 10,
//     flexDirection:'column',
//     // borderColor:'black',
//     // borderWidth:2,
//     width:'100%',
    
//   },
//   assistant: {
//     fontSize: 16,
//     marginVertical: 10,
//     color: '#333',
//     textAlign:'left'
//   },
//   input: {
//     borderColor: '#ccc',
//     borderWidth: 1,
//     borderRadius: 8,
//     padding: 10,
//     marginBottom: 0,
//     borderRadius:25,
//     width:'96%',
//     minHeight:'6%'
//   },

//   human:{
//     fontSize:16,
//     marginVertical:10,
//     textAlign:'right',
//     borderColor:'black',
//     borderwidth:2
//   },
//   messageContainer:{
//     flex:1,
//     padding:5,
//     borderColor:'black',
//     borderWidth:2,
//     minWidth:'auto',
//     maxWidth:'50%',
//     alignSelf:'flex-end',
//     borderRadius:20,
//     alignItems:'center',
//     marginRight:5,
//     paddingTop:5,
//     paddingBottom:5,
//     paddingRight:5,
//   },
//    messageContainer_assistant:{
//     paddingTop:5,
//     paddingBottom:5,
//     paddingLeft:10,
//     borderColor:'black',
//     borderWidth:2,
//     minWidth:'auto',
//     maxWidth:'50%',
//     borderRadius:20,
//     marginLeft:5
//   }

// });

const styles = StyleSheet.create({
  container: {
    flex: 1,
  
    backgroundColor: 'white',
    // borderColor: 'blue',
    // borderWidth: 10,
    flexDirection: 'column',
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
  },

  chatBox: {
    paddingTop:10,
    flex: 1,
    marginBottom: 0,
    flexDirection: 'column',
    // borderColor: 'black',
    // borderWidth: 2,
    width: '100%',
    
    borderColor:'black',
    borderWidth: 1,
    backgroundColor:'white'
  },

  assistant: {
    fontSize: 16,
    marginVertical: 10,
    color: '#333',
    textAlign: 'left',
    margin:10
  },



  inputRow: {
    minHeight: 56,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 0,
    padding:2,
    paddingHorizontal:20,
    borderColor:'black',
    borderWidth:1
  },
  addButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E8F3FE',
  },
  addButtonText: {
    color: '#2E7D32',
    fontSize: 27,
    lineHeight: 30,
    fontWeight: '500',
  },
  imagePreviewRow: {
    width: '100%',
    paddingHorizontal: 20,
    paddingBottom: 8,
    position: 'relative',
  },
  imageThumbnail: {
    width: 64,
    height: 64,
    borderRadius: 10,
  },
  removeImageButton: {
    position: 'absolute',
    left: 74,
    top: -8,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#333',
  },
  removeImageText: {
    color: '#fff',
    fontSize: 18,
    lineHeight: 20,
  },
  attachmentBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    padding: 20,
  },
  attachmentMenu: {
    borderRadius: 20,
    padding: 20,
    backgroundColor: '#fff',
  },
  attachmentTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
    color: '#222',
  },
  attachmentOption: {
    paddingVertical: 15,
  },
  attachmentOptionText: {
    fontSize: 16,
    color: '#2E7D32',
  },

  input: {
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 25,
    padding: 10,
    marginBottom: 0,
    flex: 1,
    minHeight: '6%',
  },

  voiceButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#2E7D32',
    alignItems: 'center',
    justifyContent: 'center',
  },
  voiceIcon: {
    fontSize: 24,
    width:20,
    height:20
  },

  voiceModalPopUp: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 1)',
    alignItems: 'center',
    justifyContent: 'flex-start',
    flexDirection: 'column',
  },
  voiceHeader: {
    width: '100%',
    height: 56,
    backgroundColor: 'white',
    flexDirection: 'row',
    alignItems: 'center',

  },
  voiceHeaderTitle: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 32,
  
  },
  voiceBackButton: {
    padding: 14,
    zIndex: 2,
  },
  voicePopup: {
    width: '100%',
    borderRadius: 20,
    padding: 20,
    backgroundColor: '#fff',
    alignItems: 'center',
    height:'100%',
  },
  popupTitle: {
    fontSize: 22,
    fontWeight: '440',
    color: '#222',
    
  },
  downArrow: {
    width: 24,
    height: 24,
  },
  popupText: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    marginBottom: 22,
  },
  voiceStage: {
    width: '100%',
    flex: 1,
    marginTop: 4,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderRadius: 28,
    overflow: 'hidden',
  },
  voiceGlow: {
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: 'rgba(116, 120, 242, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#8B7CFF',
    shadowOpacity: 0.8,
    shadowRadius: 45,
    shadowOffset: { width: 0, height: 0 },
    elevation: 18,
  },
  voiceOrb: {
    width: 190,
    height: 190,
    borderRadius: 95,
    overflow: 'hidden',
  },
  orbHighlight: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  voiceStatus: {
    marginTop: 28,
    color: '#555',
    fontSize: 15,
  },
  micButton: {
    width: 64,
    height: 64,
    marginTop: 18,
    borderRadius: 32,
    backgroundColor: '#2E7D32',
    alignItems: 'center',
    justifyContent: 'center',
  },
  micButtonMuted: {
    backgroundColor: '#777',
  },
  micIcon: {
    width: 30,
    height: 30,
    resizeMode: 'contain',
  },
  closeButton: {
    borderRadius: 22,
    paddingVertical: 11,
    paddingHorizontal: 28,
    backgroundColor: '#2E7D32',
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  human: {
    fontSize: 16,
    textAlign: 'right',
  },
  messageContainer: {
    // paddingVertical: 5,
    // paddingRight: 5,
    borderColor: 'rgba(0,0,0,0.1)',
    borderWidth: 2,
    minWidth: 'auto',
    maxWidth: '50%',
    borderRadius: 20,
    marginRight: 10,
    alignSelf: 'flex-end',
    alignItems: 'center',
    backgroundColor: '#E8F3FE',
    padding:10,
    textAlign:'center'
  },
  messageContainer_assistant: {
    // paddingTop: 5,
    // paddingBottom: 5,
    // paddingLeft: 10,
    borderColor: 'rgba(0,0,0,0.2)',
    borderWidth: 2,
    minWidth: 'auto',
    maxWidth: '60%',
    borderRadius: 20,
    marginLeft: 10,
    alignSelf: 'flex-start',      // added to align left
  },
  messageImage: {
    width: 180,
    height: 140,
    borderRadius: 12,
    marginBottom: 6,
    resizeMode: 'cover',
  },
  messageList: {
    paddingBottom: 12,
    gap: 12,
  },
  markdownMessage: {
    padding: 10,
  },
  markdownLine: {
    color: '#333',
    fontSize: 16,
    lineHeight: 23,
  },
  markdownBold: {
    fontWeight: '700',
  },
  markdownListNumber: {
    fontWeight: '700',
  },
  markdownSpacer: {
    height: 8,
  },
});

