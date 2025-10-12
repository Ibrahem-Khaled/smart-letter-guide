export interface VoiceConnectionState {
  isConnected: boolean;
  isMicEnabled: boolean;
  error?: string;
}

type StateListener = (state: VoiceConnectionState) => void;

/**
 * Realtime WebRTC client for OpenAI Realtime API (browser-only).
 * - Fetches ephemeral key from backend `/api/ephemeral`
 * - Negotiates WebRTC and plays remote audio to provided <audio> element
 */
export class RealtimeClient {
  private peerConnection: RTCPeerConnection | null = null;
  private micStream: MediaStream | null = null;
  private eventsChannel: RTCDataChannel | null = null;
  private remoteAudioElement: HTMLAudioElement;
  private state: VoiceConnectionState = { isConnected: false, isMicEnabled: false };
  private onStateChange?: StateListener;

  constructor(remoteAudioElement: HTMLAudioElement) {
    this.remoteAudioElement = remoteAudioElement;
  }

  onUpdate(callback: StateListener) {
    this.onStateChange = callback;
  }

  private update(partial: Partial<VoiceConnectionState>) {
    this.state = { ...this.state, ...partial };
    this.onStateChange?.(this.state);
  }

  async connect(): Promise<void> {
    if (this.peerConnection) return;
    try {
      this.update({ error: undefined });

      // 1) Get ephemeral key from our backend
      const keyResp = await fetch('/api/ephemeral');
      if (!keyResp.ok) {
        const text = await keyResp.text().catch(() => '');
        throw new Error(`Ephemeral key request failed: ${keyResp.status} ${text}`);
      }
      let keyJson: any = null;
      try {
        keyJson = await keyResp.json();
      } catch {
        throw new Error('Invalid JSON from /api/ephemeral. Is the server running?');
      }
      if (!keyJson?.apiKey) {
        throw new Error('Missing apiKey in /api/ephemeral response');
      }
      const ephemeralKey: string = keyJson.apiKey;

      // 2) Prepare WebRTC PeerConnection
      const pc = new RTCPeerConnection();
      this.peerConnection = pc;

      // Data channel for events (optional)
      this.eventsChannel = pc.createDataChannel('oai-events');
      this.eventsChannel.onmessage = (ev) => {
        // Useful for debugging server events
        try {
          const data = JSON.parse(String(ev.data));
          // eslint-disable-next-line no-console
          console.debug('oai-event:', data);
        } catch {
          // eslint-disable-next-line no-console
          console.debug('oai-event:', ev.data);
        }
      };

      // Remote audio
      pc.ontrack = (event) => {
        const [remoteStream] = event.streams;
        if (remoteStream) {
          this.remoteAudioElement.srcObject = remoteStream;
          this.remoteAudioElement.play().catch(() => {
            // Autoplay might be blocked until user gesture
          });
        }
      };

      // 3) Capture mic and add to connection (prefer low-latency constraints)
      const mic = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
          sampleRate: 48000,
          sampleSize: 16,
          latency: 0.01
        } as any
      });
      this.micStream = mic;
      for (const track of mic.getAudioTracks()) {
        pc.addTrack(track, mic);
      }
      this.update({ isMicEnabled: true });

      // 4) Create and set local offer
      const offer = await pc.createOffer({ offerToReceiveAudio: true });
      await pc.setLocalDescription(offer);

      // 5) Exchange SDP with OpenAI Realtime (WebRTC) using ephemeral key
      const model = 'gpt-realtime';
      const sdpResponse = await fetch(`https://api.openai.com/v1/realtime?model=${encodeURIComponent(model)}` , {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${ephemeralKey}`,
          'Content-Type': 'application/sdp'
        },
        body: offer.sdp || ''
      });
      if (!sdpResponse.ok) {
        const errorText = await sdpResponse.text().catch(() => '');
        throw new Error(`SDP exchange failed: ${sdpResponse.status} ${errorText}`);
      }
      const answerSdp = await sdpResponse.text();
      await pc.setRemoteDescription({ type: 'answer', sdp: answerSdp });

      this.update({ isConnected: true });
    } catch (error: any) {
      this.update({ error: error?.message || 'Connection failed', isConnected: false });
      await this.disconnect();
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      if (this.eventsChannel) {
        try { this.eventsChannel.close(); } catch {}
      }
      this.eventsChannel = null;

      if (this.peerConnection) {
        try { this.peerConnection.getSenders().forEach((s) => s.track?.stop()); } catch {}
        try { this.peerConnection.close(); } catch {}
      }
      this.peerConnection = null;

      if (this.micStream) {
        for (const track of this.micStream.getTracks()) {
          try { track.stop(); } catch {}
        }
      }
      this.micStream = null;

      this.remoteAudioElement.srcObject = null;
    } finally {
      this.update({ isConnected: false, isMicEnabled: false });
    }
  }

  setMicEnabled(enabled: boolean) {
    this.micStream?.getAudioTracks().forEach((t) => { t.enabled = enabled; });
    this.update({ isMicEnabled: !!enabled });
  }

  getState(): VoiceConnectionState {
    return { ...this.state };
  }
}


