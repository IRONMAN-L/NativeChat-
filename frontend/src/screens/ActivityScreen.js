import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function ActivityScreen() {
    return (
        <View style={styles.container}>
            <Text style={styles.text}>Activity Log Coming Soon</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0F1014',
        alignItems: 'center',
        justifyContent: 'center',
    },
    text: {
        color: '#a0a0a0',
        fontSize: 16,
    }
});
