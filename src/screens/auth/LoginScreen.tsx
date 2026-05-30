import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator,
  KeyboardAvoidingView, Platform, ScrollView, Image,
} from 'react-native';
import { useAuth } from '../../hooks/useAuth';

const PRIMARY = '#0A8C52';
const GRAY    = '#F5F5F5';
const BORDER  = '#E5E5E5';
const TEXT    = '#1a1a1a';
const LIGHT   = '#888';

const LOGO_URI = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/4QL4RXhpZgAATU0AKgAAAAgABAE7AAIAAAAPAAABSodpAAQAAAABAAABWpydAAEAAAAeAAAC0uocAAcAAAEMAAAAPgAAAAAc6gAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQ2VkcmljLmRqb2hvcmUAAAAFkAMAAgAAABQAAAKokAQAAgAAABQAAAK8kpEAAgAAAAMzNwAAkpIAAgAAAAMzNwAA6hwABwAAAQwAAAGcAAAAABzqAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAyMDI2OjA1OjE4IDE0OjEwOjM4ADIwMjY6MDU6MTggMTQ6MTA6MzgAAABDAGUAZAByAGkAYwAuAGQAagBvAGgAbwByAGUAAAD/4QQhaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wLwA8P3hwYWNrZXQgYmVnaW49J++7vycgaWQ9J1c1TTBNcENlaGlIenJlU3pOVGN6a2M5ZCc/Pg0KPHg6eG1wbWV0YSB4bWxuczp4PSJhZG9iZTpuczptZXRhLyIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIj48eG1wOkNyZWF0ZURhdGU+MjAyNi0wNS0xOFQxNDoxMDozOC4zNjY8L3htcDpDcmVhdGVEYXRlPjwvcmRmOkRlc2NyaXB0aW9uPjwvcmRmOlJERj48L3g6eG1wbWV0YT4NCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCjw/eHBhY2tldCBlbmQ9J3cnPz7/2wBDAAcFBQYFBAcGBQYIBwcIChELCgkJChUPEAwRGBUaGRgVGBcbHichGx0lHRcYIi4iJSgpKywrGiAvMy8qMicqKyr/2wBDAQcICAoJChQLCxQqHBgcKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKir/wAARCACNAI0DASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJma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';

export default function LoginScreen() {
  const { sendOtp, verifyOtp } = useAuth();
  const [phone, setPhone]     = useState('');
  const [otp, setOtp]         = useState('');
  const [step, setStep]       = useState<'phone' | 'otp'>('phone');
  const [loading, setLoading] = useState(false);

  const formatPhone = (number: string) => {
    const cleaned = number.replace(/\D/g, '');
    return `+225${cleaned}`;
  };

  const handleSendOtp = async () => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length < 9 || cleaned.length > 10) {
      Alert.alert('Erreur', 'Entrez un numéro valide (ex: 07 00 00 00 00)');
      return;
    }
    setLoading(true);
    try {
      await sendOtp(formatPhone(phone));
      setStep('otp');
    } catch (error: any) {
      Alert.alert('Erreur', error.response?.data?.message || 'Erreur envoi OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.length !== 6) {
      Alert.alert('Erreur', 'Le code OTP doit contenir 6 chiffres');
      return;
    }
    setLoading(true);
    try {
      await verifyOtp(formatPhone(phone), otp);
    } catch (error: any) {
      Alert.alert('Erreur', error.response?.data?.message || 'Code invalide');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

        {/* HEADER */}
        <View style={styles.header}>
          <Image
            source={{ uri: LOGO_URI }}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.tagline}>Livraison de gaz butane à domicile</Text>
        </View>

        <View style={styles.form}>
          {step === 'phone' ? (
            <>
              <Text style={styles.title}>Connexion</Text>
              <Text style={styles.subtitle}>Entrez votre numéro pour recevoir un code</Text>

              <Text style={styles.label}>Numéro de téléphone</Text>
              <View style={styles.phoneRow}>
                <View style={styles.flag}>
                  <Text style={styles.flagText}>🇨🇮 +225</Text>
                </View>
                <TextInput
                  style={styles.phoneInput}
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                  placeholder="07 00 00 00 00"
                  placeholderTextColor="#aaa"
                  maxLength={10}
                />
              </View>

              <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={handleSendOtp}
                disabled={loading}
              >
                {loading
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.buttonText}>📲 Recevoir le code</Text>
                }
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.title}>Vérification</Text>
              <Text style={styles.subtitle}>
                Code WhatsApp envoyé au{'\n'}
                <Text style={styles.phoneHighlight}>+225 {phone}</Text>
              </Text>

              <Text style={styles.label}>Code à 6 chiffres</Text>
              <TextInput
                style={styles.otpInput}
                value={otp}
                onChangeText={setOtp}
                keyboardType="numeric"
                maxLength={6}
                placeholder="· · · · · ·"
                placeholderTextColor="#ccc"
                autoFocus
              />

              <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={handleVerifyOtp}
                disabled={loading}
              >
                {loading
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.buttonText}>✅ Valider le code</Text>
                }
              </TouchableOpacity>

              <TouchableOpacity style={styles.resendButton} onPress={handleSendOtp} disabled={loading}>
                <Text style={styles.resendText}>🔄 Renvoyer le code</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.backButton} onPress={() => { setStep('phone'); setOtp(''); }}>
                <Text style={styles.backText}>← Changer de numéro</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  scroll:    { flexGrow: 1, padding: 24, justifyContent: 'center' },

  header:  { alignItems: 'center', marginBottom: 36 },
  logo:    { width: 180, height: 90 },
  tagline: { fontSize: 14, color: LIGHT, textAlign: 'center', marginTop: 8 },

  form:     {},
  title:    { fontSize: 26, fontWeight: 'bold', color: TEXT, marginBottom: 6 },
  subtitle: { fontSize: 14, color: LIGHT, marginBottom: 24, lineHeight: 20 },
  label:    { fontSize: 13, color: LIGHT, marginBottom: 8, fontWeight: '600' },

  phoneRow:  { flexDirection: 'row', marginBottom: 16, gap: 10 },
  flag:      {
    backgroundColor: GRAY, borderRadius: 12,
    borderWidth: 1, borderColor: BORDER,
    paddingHorizontal: 14, justifyContent: 'center',
  },
  flagText:  { fontSize: 15, color: TEXT, fontWeight: '600' },
  phoneInput: {
    flex: 1, backgroundColor: GRAY, borderRadius: 12,
    borderWidth: 1, borderColor: BORDER,
    paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 18, color: TEXT, fontWeight: '600',
  },

  button: {
    backgroundColor: PRIMARY, borderRadius: 14,
    paddingVertical: 16, alignItems: 'center',
    shadowColor: PRIMARY, shadowOpacity: 0.3,
    shadowRadius: 8, shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText:     { color: '#fff', fontSize: 17, fontWeight: '700' },

  phoneHighlight: { color: PRIMARY, fontWeight: '700' },
  otpInput: {
    borderWidth: 2, borderColor: PRIMARY, borderRadius: 14,
    paddingVertical: 18, paddingHorizontal: 16,
    fontSize: 36, color: TEXT,
    backgroundColor: '#F0FAF5', textAlign: 'center',
    letterSpacing: 16, marginBottom: 20, fontWeight: '700',
  },
  resendButton: { alignItems: 'center', marginTop: 16 },
  resendText:   { color: PRIMARY, fontSize: 14, fontWeight: '600' },
  backButton:   { alignItems: 'center', marginTop: 12 },
  backText:     { color: '#aaa', fontSize: 13 },
});