import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity,
  StyleSheet, Animated, StatusBar,
  Linking, ActivityIndicator, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { shadows } from '../../constants/theme';
import { deliveryService, ordersService } from '../../services/api';

const STATUS_TO_STEP: Record<string, number> = {
  assigned:        0,
  en_route_depot:  1,
  picked_up:       1,
  en_route_client: 2,
  delivered:       3,
  failed:          0,
};

const STATUS_LABEL: Record<string, string> = {
  assigned:        'Commande confirmée',
  en_route_depot:  'Livreur en route vers la station',
  picked_up:       'Chargement à la station',
  en_route_client: 'Livreur en route vers vous',
  delivered:       'Livré ! 🎉',
  failed:          'Livraison échouée',
};

const STEPS = [
  { label: 'Confirmée',          icon: 'checkmark-circle' },
  { label: 'Chargement station', icon: 'business' },
  { label: 'En route',           icon: 'bicycle' },
  { label: 'Livrée',             icon: 'checkmark-done-circle' },
];

interface TrackingScreenProps {
  orderId?:       string | null;
  modeLivraison?: 'standard' | 'rapide' | 'express';
  onClose:        () => void;
}

export default function TrackingScreen({
  orderId,
  modeLivraison = 'rapide',
  onClose,
}: TrackingScreenProps) {
  const insets = useSafeAreaInsets();

  const [loading, setLoading]           = useState(true);
  const [delivery, setDelivery]         = useState<any>(null);
  const [order, setOrder]               = useState<any>(null);
  const [currentStep, setCurrentStep]   = useState(0);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const slideUp   = useRef(new Animated.Value(300)).current;

  const MODE_CONFIG = {
    standard: { label: 'Standard', color: '#888780', icon: '⏱' },
    rapide:   { label: 'Rapide',   color: '#0A8C52', icon: '⚡' },
    express:  { label: 'Express',  color: '#E85200', icon: '🚀' },
  };
  const modeInfo = MODE_CONFIG[modeLivraison] ?? MODE_CONFIG.rapide;

  useEffect(() => {
    Animated.spring(slideUp, { toValue: 0, useNativeDriver: true, damping: 20, stiffness: 200 }).start();

    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.8, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1,   duration: 1000, useNativeDriver: true }),
      ])
    );
    pulse.start();

    loadDeliveryData();
    const interval = setInterval(loadDeliveryData, 10000);

    return () => { pulse.stop(); clearInterval(interval); };
  }, [orderId]);

  const loadDeliveryData = async () => {
    if (!orderId) { setLoading(false); return; }
    try {
      const deliveryRes = await deliveryService.getOrderDelivery(orderId);
      const d = deliveryRes?.data;
      if (!d) { setLoading(false); return; }
      setDelivery(d);
      setCurrentStep(STATUS_TO_STEP[d.status] ?? 0);

      try {
        const orderRes = await ordersService.getOrderById(orderId);
        setOrder(orderRes?.data ?? null);
      } catch {}

    } catch (err) {
      console.log('Tracking error:', err);
    } finally {
      setLoading(false);
    }
  };

  const statusKey     = delivery?.status || 'assigned';
  const statusLabel   = STATUS_LABEL[statusKey] || 'En cours';
  const stationName   = order?.depot?.name || 'Station Klik';
  const eta           = delivery?.etaMinutes || 20;
  const driverName    = delivery?.driver?.fullName || delivery?.driver?.phone || 'Livreur Klik';
  const driverPhone   = delivery?.driver?.phone || '';
  const tricyclePlate = delivery?.driver?.tricyclePlate || '—';

  if (loading) {
    return (
      <View style={[s.root, { justifyContent: 'center', alignItems: 'center', paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color="#0A8C52" />
        <Text style={{ marginTop: 12, color: '#888', fontSize: 13 }}>Chargement du suivi…</Text>
      </View>
    );
  }

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* HEADER */}
      <View style={s.header}>
        <TouchableOpacity onPress={onClose} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#0D1F14" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Suivi de commande</Text>
        <View style={[s.modeBadge, { backgroundColor: `${modeInfo.color}20` }]}>
          <Text style={s.modeBadgeTxt}>{modeInfo.icon}</Text>
          <Text style={[s.modeBadgeLabel, { color: modeInfo.color }]}>{modeInfo.label}</Text>
        </View>
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 20 }}>

        {/* ETA CARD */}
        <View style={s.etaCard}>
          <View style={s.pulseWrap}>
            <Animated.View style={[s.pulseRing, {
              transform: [{ scale: pulseAnim }],
              opacity: pulseAnim.interpolate({ inputRange: [1, 1.8], outputRange: [0.4, 0] }),
            }]} />
            <View style={s.pulseDot} />
          </View>
          <View style={s.etaInfo}>
            <Text style={s.etaStatus}>{statusLabel}</Text>
            <Text style={s.etaSub}>{stationName}</Text>
          </View>
          {currentStep < 3 ? (
            <View style={s.etaBadge}>
              <Text style={s.etaNum}>{eta}</Text>
              <Text style={s.etaUnit}>min</Text>
            </View>
          ) : (
            <View style={[s.etaBadge, { paddingHorizontal: 10 }]}>
              <Ionicons name="checkmark-circle" size={28} color="#0A8C52" />
            </View>
          )}
        </View>

        {/* CARTE ILLUSTRATION */}
        <View style={s.mapPlaceholder}>
          <Text style={{ fontSize: 48 }}>🛺</Text>
          <Text style={{ fontSize: 16, fontWeight: '700', color: '#0D1F14', marginTop: 8 }}>
            {currentStep === 0 && 'En attente d\'un livreur'}
            {currentStep === 1 && 'Livreur en route vers la station'}
            {currentStep === 2 && 'Livreur en route vers vous'}
            {currentStep === 3 && 'Livraison effectuée !'}
          </Text>
          <Text style={{ fontSize: 12, color: '#888', marginTop: 4 }}>{stationName}</Text>
          <TouchableOpacity style={s.refreshBtn} onPress={loadDeliveryData}>
            <Ionicons name="refresh" size={16} color="#0A8C52" />
            <Text style={{ fontSize: 12, color: '#0A8C52', fontWeight: '600' }}>Actualiser</Text>
          </TouchableOpacity>
        </View>

        {/* STEPS */}
        <View style={s.stepsRow}>
          {STEPS.map((step, i) => (
            <View key={i} style={s.step}>
              <View style={[
                s.stepDot,
                i < currentStep   && s.stepDotDone,
                i === currentStep && s.stepDotActive,
              ]}>
                {i < currentStep
                  ? <Ionicons name="checkmark" size={10} color="#fff" />
                  : <View style={[s.stepInner, i === currentStep && s.stepInnerActive]} />
                }
              </View>
              {i < STEPS.length - 1 && (
                <View style={[s.stepLine, i < currentStep && s.stepLineDone]} />
              )}
              <Text style={[s.stepLbl, i <= currentStep && s.stepLblActive]}>{step.label}</Text>
            </View>
          ))}
        </View>

        {/* LIVREUR */}
        <View style={s.driverCard}>
          <View style={s.driverLeft}>
            <View style={s.driverAvatar}>
              <Text style={{ fontSize: 22 }}>👨🏿</Text>
            </View>
            <View style={s.driverDetails}>
              <Text style={s.driverName}>{driverName}</Text>
              <Text style={s.driverVehicle}>🛺 Tricycle Klik · {tricyclePlate}</Text>
              <View style={s.ratingRow}>
                <Ionicons name="star" size={12} color="#F5A623" />
                <Text style={s.ratingTxt}>4.8 · Livreur certifié Klik</Text>
              </View>
            </View>
          </View>
          <View style={s.driverActions}>
            <TouchableOpacity
              style={[s.callBtn, !driverPhone && { backgroundColor: '#ccc' }]}
              onPress={() => driverPhone && Linking.openURL(`tel:${driverPhone}`)}
            >
              <Ionicons name="call" size={18} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.msgBtn, !driverPhone && { opacity: 0.4 }]}
              onPress={() => driverPhone && Linking.openURL(`https://wa.me/${driverPhone.replace('+', '')}`)}
            >
              <Ionicons name="chatbubble" size={18} color="#0A8C52" />
            </TouchableOpacity>
          </View>
        </View>

      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: '#F5F4F0' },
  scroll: { flex: 1 },

  header:       { backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, ...shadows.sm },
  backBtn:      { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F5F4F0', alignItems: 'center', justifyContent: 'center' },
  headerTitle:  { fontSize: 16, fontWeight: '700', color: '#0D1F14' },
  modeBadge:    { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  modeBadgeTxt:   { fontSize: 14 },
  modeBadgeLabel: { fontSize: 12, fontWeight: '700' },

  etaCard:  { backgroundColor: '#fff', borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12, ...shadows.sm },
  pulseWrap:{ width: 20, height: 20, alignItems: 'center', justifyContent: 'center' },
  pulseRing:{ position: 'absolute', width: 20, height: 20, borderRadius: 10, backgroundColor: '#0A8C52' },
  pulseDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#0A8C52' },
  etaInfo:  { flex: 1 },
  etaStatus:{ fontSize: 15, fontWeight: '700', color: '#0D1F14' },
  etaSub:   { fontSize: 11, color: '#888780', marginTop: 2 },
  etaBadge: { backgroundColor: '#E8F5EE', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8, alignItems: 'center' },
  etaNum:   { fontSize: 24, fontWeight: '800', color: '#0A8C52', lineHeight: 26 },
  etaUnit:  { fontSize: 10, color: '#0A8C52', fontWeight: '600' },

  mapPlaceholder: { backgroundColor: '#fff', borderRadius: 16, padding: 24, alignItems: 'center', marginBottom: 12, ...shadows.sm },
  refreshBtn:     { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, backgroundColor: '#E8F5EE', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8 },

  stepsRow:        { backgroundColor: '#fff', borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12, ...shadows.sm },
  step:            { flex: 1, alignItems: 'center' },
  stepDot:         { width: 24, height: 24, borderRadius: 12, backgroundColor: '#F5F4F0', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#E8E6DF', marginBottom: 4 },
  stepDotDone:     { backgroundColor: '#0A8C52', borderColor: '#0A8C52' },
  stepDotActive:   { backgroundColor: '#F5A623', borderColor: '#F5A623' },
  stepInner:       { width: 8, height: 8, borderRadius: 4, backgroundColor: '#B4B2A9' },
  stepInnerActive: { backgroundColor: '#0D1F14' },
  stepLine:        { position: 'absolute', top: 12, left: '50%', right: '-50%', height: 1.5, backgroundColor: '#E8E6DF' },
  stepLineDone:    { backgroundColor: '#0A8C52' },
  stepLbl:         { fontSize: 9, color: '#B4B2A9', textAlign: 'center' },
  stepLblActive:   { color: '#0A8C52', fontWeight: '600' },

  driverCard:   { backgroundColor: '#fff', borderRadius: 16, padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', ...shadows.sm },
  driverLeft:   { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  driverAvatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: '#E8E6DF', alignItems: 'center', justifyContent: 'center' },
  driverDetails:{ flex: 1 },
  driverName:   { fontSize: 14, fontWeight: '700', color: '#0D1F14' },
  driverVehicle:{ fontSize: 11, color: '#888780', marginTop: 2 },
  ratingRow:    { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  ratingTxt:    { fontSize: 11, color: '#F5A623', fontWeight: '600' },
  driverActions:{ flexDirection: 'row', gap: 8 },
  callBtn:      { width: 40, height: 40, borderRadius: 20, backgroundColor: '#0A8C52', alignItems: 'center', justifyContent: 'center' },
  msgBtn:       { width: 40, height: 40, borderRadius: 20, backgroundColor: '#E8F5EE', alignItems: 'center', justifyContent: 'center' },
});