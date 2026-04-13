import { create } from 'zustand';
import NetInfo from '@react-native-community/netinfo';
import { Platform } from 'react-native';

// Safe Native Module Loading for Expo Go Compatibility
let wifiP2P = {};
let isP2PSupported = false;

try {
  wifiP2P = require('react-native-wifi-p2p');
  isP2PSupported = true;
} catch (e) {
  console.log("WiFi P2P Native Module not found. Running in Compatibility Mode (Expo Go).");
}

export { isP2PSupported };

const {
  initialize,
  startDiscoveringPeers,
  stopDiscoveringPeers,
  subscribeOnPeersUpdates,
  connect,
  disconnect,
  getAvailablePeers,
  sendServerData,
  sendClientData
} = wifiP2P || {};

export const useOfflineP2pStore = create((set, get) => ({
  isOnline: true,
  peers: [],
  connectedPeer: null,
  isScanning: false,

  // Monitor general internet connectivity
  initNetworkMonitor: () => {
    NetInfo.addEventListener(state => {
      set({ isOnline: state.isConnected && state.isInternetReachable });
    });
  },

  // Initialize Android WiFi Direct
  initP2P: async () => {
    if (Platform.OS !== 'android' || !isP2PSupported) {
      console.warn("WiFi P2P is not available in this environment.");
      return;
    }
    try {
      if (initialize) await initialize();
      if (subscribeOnPeersUpdates) {
        subscribeOnPeersUpdates(({ devices }) => {
          set({ peers: devices });
        });
      }
    } catch (e) {
      console.warn("Failed to init p2p natively", e.message || e);
    }
  },

  startScan: async () => {
    if (Platform.OS !== 'android') return;
    set({ isScanning: true });
    try {
      await startDiscoveringPeers();
      const status = await getAvailablePeers();
      set({ peers: status.devices || [] });
    } catch (e) {
      console.warn("Error scanning peers", e.message || e);
    } finally {
      set({ isScanning: false });
    }
  },

  stopScan: async () => {
    if (Platform.OS !== 'android') return;
    await stopDiscoveringPeers();
    set({ isScanning: false });
  },

  connectToPeer: async (deviceAddress) => {
    if (Platform.OS !== 'android') return;
    try {
      await connect(deviceAddress);
      set({ connectedPeer: deviceAddress });
    } catch (e) {
      console.warn("Failed to connect to peer", e.message || e);
    }
  },

  disconnectPeer: async () => {
    if (Platform.OS !== 'android') return;
    try {
      await disconnect();
      set({ connectedPeer: null });
    } catch (e) {
      console.warn("Failed to disconnect", e.message || e);
    }
  },

  // Abstracted send method for ChatStore to hook into if network is offline
  sendOfflineMessage: async (encryptedPayloadText) => {
    if (!get().connectedPeer) return false;
    
    // In a real implementation you determine if you are GroupOwner (server) or peer (client)
    // For MVP boilerplate:
    try {
        await sendClientData(encryptedPayloadText);
        return true;
    } catch (e) {
        console.warn("Failed to send offline data", e.message || e);
        return false;
    }
  }
}));
