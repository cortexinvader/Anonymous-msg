import { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import confetti from 'canvas-confetti';
import QRCode from 'qrcode.react';
import { THEMES, AVATARS, LOGO_SVG } from '../../shared/themeConfig.js';

const API_URL = import.meta.env.VITE_API_URL || "https://anonymous-msg-c0v6.onrender.com";

export default function App() {
  const [user, setUser] = useState(null);
  const [text, setText] = useState("");
  const [burnAfter, setBurnAfter] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const mediaRecorder = useRef(null);
  const params = new URLSearchParams(location.search);
  const username = params.get('u');

  useEffect(() => {
    if (username) axios.get(`${API_URL}/u/${username}`).then(r => setUser(r.data)).catch(() => {});
  }, [username]);

  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder.current = new MediaRecorder(stream);
    const chunks = [];
    mediaRecorder.current.ondataavailable = e => chunks.push(e.data);
    mediaRecorder.current.onstop = () => setAudioBlob(new Blob(chunks, { type: 'audio/mp3' }));
    mediaRecorder.current.start();
    setIsRecording(true);
  };

  const stopRecording = () => {
    mediaRecorder.current?.stop();
    setIsRecording(false);
  };

  const send = async () => {
    if (!user) return;
    const form = new FormData();
    form.append('recipientId', user.id);
    form.append('type', audioBlob ? 'audio' : 'text');
    form.append('content', text);
    form.append('burnAfter', burnAfter);
    if (audioBlob) form.append('audio', audioBlob, 'voice.mp3');
    await axios.post(`${API_URL}/send`, form);
    confetti({ particleCount: 200, spread: 80, origin: { y: 0.6 } });
    setText(""); setAudioBlob(null); setBurnAfter(0);
    alert("Sent!");
  };

  if (!username) return <div style={{color:'black',textAlign:'center',paddingTop:'30vh'}}>Add ?u=yourname to URL</div>;
  if (!user) return <div style={{color:'black',textAlign:'center',paddingTop:'30vh'}}>Loading user...</div>;

  const theme = THEMES[user.theme_id] || THEMES[0];
  const avatar = AVATARS[user.avatar_id % AVATARS.length];

  return (
    <div style={{ minHeight:'100vh', background: theme.bg, color: theme.text, padding: '20px', fontFamily: 'sans-serif' }}>
      <div style={{textAlign:'center', paddingTop:40}}>
        <div dangerouslySetInnerHTML={{__html: LOGO_SVG}} style={{width:100,height:100,margin:'0 auto'}} />
        <h2 style={{margin:'10px 0'}}>Send to <b>@{user.username}</b> {avatar}</h2>
      </div>

      <div style={{maxWidth:420,margin:'30px auto', background:theme.card, padding:25, borderRadius:20}}>
        <textarea
          placeholder="Secret message..."
          rows={5}
          value={text}
          onChange={e=>setText(e.target.value)}
          style={{width:'93%', background:'transparent', color:theme.text, border:'1px solid #555', padding:10, borderRadius:10, fontSize:16}}
        />

        <div style={{margin:'20px 0', display:'flex', gap:10, flexWrap:'wrap', justifyContent:'center'}}>
          {[0, 5, 10, 30].map(v => (
            <button key={v} onClick={()=>setBurnAfter(v)} style={{
              padding:'8px 15px', borderRadius:8, border:'none',
              background: burnAfter===v ? theme.accent : '#555', color: 'white'
            }}>{v === 0 ? 'Keep' : v+'s'}</button>
          ))}
        </div>

        <div style={{margin:'15px 0', textAlign:'center'}}>
          <button onClick={isRecording?stopRecording:startRecording} style={{fontSize:16, padding:'10px 20px', borderRadius:20, border:'none', background:isRecording?'red':'#444', color:'white'}}>
            {isRecording ? 'Stop Recording' : '🎤 Record Voice'}
          </button>
          {audioBlob && <p>Audio Ready</p>}
        </div>

        <button onClick={send} style={{
          width:'100%', padding:15, background:theme.accent, color:'white',
          border:'none', borderRadius:30, fontSize:18, fontWeight:'bold', marginTop:10
        }}>SEND ANONYMOUSLY</button>
      </div>
    </div>
  );
}
