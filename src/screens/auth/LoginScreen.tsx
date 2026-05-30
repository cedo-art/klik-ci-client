import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator,
  KeyboardAvoidingView, Platform, ScrollView, Image,
} from 'react-native';
import { useAuth } from '../../hooks/useAuth';

const PRIMARY = '#0A8C52';
const AMBER   = '#F5A623';
const GRAY    = '#F5F5F5';
const BORDER  = '#E5E5E5';
const TEXT    = '#1a1a1a';
const LIGHT   = '#888';

export default function LoginScreen() {
  const { sendOtp, verifyOtp } = useAuth();
  const [phone, setPhone]     = useState('');
  const [otp, setOtp]         = useState('');
  const [step, setStep]       = useState<'phone' | 'otp'>('phone');
  const [loading, setLoading] = useState(false);

  const formatPhone = (number: string) => {
  const cleaned = number.replace(/\D/g, '');
  return `+225${cleaned}`; // 0709977031 → +2250709977031
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
          source={require('@/assets/logo.png')}
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
  container:  { flex: 1, backgroundColor: '#fff' },
  scroll:     { flexGrow: 1, padding: 24, justifyContent: 'center' },

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

  separator: { flexDirection: 'row', alignItems: 'center', marginVertical: 24, gap: 10 },
  line:      { flex: 1, height: 1, backgroundColor: BORDER },
  orText:    { fontSize: 13, color: '#bbb' },

  socialButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderRadius: 14, borderWidth: 1, borderColor: BORDER,
    paddingVertical: 14, marginBottom: 10, gap: 10, backgroundColor: '#fff',
  },
  facebookButton: { backgroundColor: '#1877F2', borderColor: '#1877F2' },
  socialIcon:     { fontSize: 20 },
  socialText:     { fontSize: 15, fontWeight: '600', color: TEXT },

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