import 'react-native-get-random-values';
import nacl from 'tweetnacl';
import naclUtil from 'tweetnacl-util';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Store keys locally
export const generateAndStoreKeyPair = async () => {
    // Generate an asymmetric key pair for Diffie-Hellman Key Exchange (Curve25519)
    const keyPair = nacl.box.keyPair();
    
    // Convert to Base64 strings for storage
    const publicKeyBase64 = naclUtil.encodeBase64(keyPair.publicKey);
    const privateKeyBase64 = naclUtil.encodeBase64(keyPair.secretKey);

    await AsyncStorage.setItem('publicKey', publicKeyBase64);
    await AsyncStorage.setItem('privateKey', privateKeyBase64); // Highly sensitive!

    return publicKeyBase64; // Only send this to the server
};

// Retrieve our keys
export const getMyKeys = async () => {
    const pub = await AsyncStorage.getItem('publicKey');
    const priv = await AsyncStorage.getItem('privateKey');
    
    if (!pub || !priv) return null;

    return {
        publicKey: naclUtil.decodeBase64(pub),
        secretKey: naclUtil.decodeBase64(priv)
    };
};

// Encrypt a message for a specific friend using their public key
export const encryptMessage = async (messageText, friendPublicKeyBase64) => {
    const myKeys = await getMyKeys();
    if (!myKeys) throw new Error('My keys not found');

    const friendPublicKey = naclUtil.decodeBase64(friendPublicKeyBase64);
    
    // Generate a one-time nonce
    const nonce = nacl.randomBytes(nacl.box.nonceLength);
    const messageUint8 = naclUtil.decodeUTF8(messageText);

    // Encrypt the message
    const encryptedMessage = nacl.box(
        messageUint8,
        nonce,
        friendPublicKey,
        myKeys.secretKey
    );

    // We must send both the ciphertext and the nonce to the recipient
    // So we encode them combined, separated by a colon, or just as an object
    const ciphertextBase64 = naclUtil.encodeBase64(encryptedMessage);
    const nonceBase64 = naclUtil.encodeBase64(nonce);

    return JSON.stringify({ ciphertext: ciphertextBase64, nonce: nonceBase64 });
};

// Decrypt a message received from a friend
export const decryptMessage = async (encryptedPayloadString, friendPublicKeyBase64) => {
    try {
        const payload = JSON.parse(encryptedPayloadString);
        const myKeys = await getMyKeys();
        if (!myKeys) throw new Error('My keys not found');

        const friendPublicKey = naclUtil.decodeBase64(friendPublicKeyBase64);
        const ciphertext = naclUtil.decodeBase64(payload.ciphertext);
        const nonce = naclUtil.decodeBase64(payload.nonce);

        // Decrypt using our private key and their public key
        const decryptedMessage = nacl.box.open(
            ciphertext,
            nonce,
            friendPublicKey,
            myKeys.secretKey
        );

        if (!decryptedMessage) {
            throw new Error('Failed to decrypt message - Key mismatch or bad payload');
        }

        return naclUtil.encodeUTF8(decryptedMessage);
    } catch (e) {
        console.error('Decryption error:', e);
        return "[Decryption Failed]";
    }
};
