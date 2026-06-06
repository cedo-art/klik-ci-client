import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity,
  StyleSheet, Animated, StatusBar,
  Linking, ActivityIndicator, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
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

const DEFAULT_DEPOT  = { latitude: 5.4006, longitude: -3.9314 };
const DEFAULT_CLIENT = { latitude: 5.3750, longitude: -3.9750 };
const DEFAULT_DRIVER = { latitude: 5.3820, longitude: -3.9820 };

const toNum = (val: any, fallback: number): number => {
  if (val === null || val === undefined || val === '') return fallback;
  const n = parseFloat(String(val));
  return isNaN(n) ? fallback : n;
};

interface TrackingScreenProps {
  orderId?:       string | null;
  modeLivraison?: 'standard' | 'rapide' | 'express';
  onClose:        () => void;
}

export default function TrackingScreen({ orderId, modeLivraison = 'rapide', onClose }: TrackingScreenProps) {
  const insets = useSafeAreaInsets();
  const [loading, setLoading]           = useState(true);
  const [delivery, setDelivery]         = useState<any>(null);
  const [order, setOrder]               = useState<any>(null);
  const [currentStep, setCurrentStep]   = useState(0);
  const [driverCoords, setDriverCoords] = useState(DEFAULT_DRIVER);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const slideUp   = useRef(new Animated.Value(300)).current;
  const mapRef    = useRef<MapView>(null);

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
      if (d.currentLat && d.currentLng) {
        setDriverCoords({
          latitude:  toNum(d.currentLat, DEFAULT_DRIVER.latitude),
          longitude: toNum(d.currentLng, DEFAULT_DRIVER.longitude),
        });
      }
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

  const depotCoords = {
    latitude:  toNum(order?.depot?.latitude,  DEFAULT_DEPOT.latitude),
    longitude: toNum(order?.depot?.longitude, DEFAULT_DEPOT.longitude),
  };
  const clientCoords = {
    latitude:  toNum(order?.deliveryAddress?.latitude,  DEFAULT_CLIENT.latitude),
    longitude: toNum(order?.deliveryAddress?.longitude, DEFAULT_CLIENT.longitude),
  };
  const centerLat = (depotCoords.latitude + clientCoords.latitude) / 2;
  const centerLng = (depotCoords.longitude + clientCoords.longitude) / 2;

  const statusKey   = delivery?.status || 'assigned';
  const statusLabel = STATUS_LABEL[statusKey] || 'En cours';
  const stationName = order?.depot?.name || 'Station Klik';
  const eta         = delivery?.etaMinutes || 20;
  const driverName  = delivery?.driver?.fullName || delivery?.driver?.phone || 'Livreur Klik';
  const driverPhone = delivery?.driver?.phone || '';
  const tricyclePlate = delivery?.driver?.tricyclePlate || '—';

  if (loading) {
    return (
      <View style={[s.root, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#0A8C52" />
        <Text style={{ marginTop: 12, color: '#888', fontSize: 13 }}>Chargement du suivi…</Text>
      </View>
    );
  }

  return (
    <View style={s.root}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      {/* CARTE GOOGLE MAPS */}
      <MapView
        ref={mapRef}
        style={s.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={{
          latitude:       centerLat,
          longitude:      centerLng,
          latitudeDelta:  0.05,
          longitudeDelta: 0.05,
        }}
        showsUserLocation={false}
        showsMyLocationButton={false}
        showsTraffic={false}
        showsBuildings={true}
      >
        <Marker coordinate={depotCoords} title={stationName}>
          <View style={s.stationMarker}>
            <Text style={{ fontSize: 14 }}>⛽</Text>
          </View>
        </Marker>

        <Marker coordinate={clientCoords} title="Votre position">
          <View style={s.clientMarker}>
            <Ionicons name="home" size={14} color="#fff" />
          </View>
        </Marker>

        {currentStep >= 1 && (
          <Marker coordinate={driverCoords} title="Tricycle Klik">
            <View style={s.tricycleMarker}>
              <Text style={{ fontSize: 20 }}>🛺</Text>
            </View>
          </Marker>
        )}

        <Polyline
          coordinates={[depotCoords, driverCoords, clientCoords]}
          strokeColor="#0A8C52"
          strokeWidth={3}
          lineDashPattern={[8, 4]}
        />
      </MapView>

      {/* BOUTON RETOUR */}
      <TouchableOpacity style={[s.backBtn, { top: insets.top + 10 }]} onPress={onClose}>
        <Ionicons name="arrow-back" size={22} color="#0D1F14" />
      </TouchableOpacity>

      {/* BADGE MODE */}
      <View style={[s.modeBadge, { top: insets.top + 10, backgroundColor: `${modeInfo.color}20`, borderColor: modeInfo.color }]}>
        <Text style={s.modeBadgeTxt}>{modeInfo.icon}</Text>
        <Text style={[s.modeBadgeLabel, { color: modeInfo.color }]}>{modeInfo.label}</Text>
      </View>

      {/* BOUTON RAFRAÎCHIR */}
      <TouchableOpacity style={[s.centerBtn, { top: insets.top + 60 }]} onPress={loadDeliveryData}>
        <Ionicons name="refresh" size={20} color="#0A8C52" />
      </TouchableOpacity>

      {/* CARTE INFO BAS */}
      <Animated.View style={[s.infoCard, { paddingBottom: insets.bottom + 16, transform: [{ translateY: slideUp }] }]}>

        <View style={s.etaRow}>
          <View style={s.pulseWrap}>
            <Animated.View style={[s.pulseRing, {
              transform: [{ scale: pulseAnim }],
              opacity: pulseAnim.interpolate({ inputRange: [1, 1.8], outputRange: [0.4, 0] }),
            }]} />
            <View style={s.pulseDot} />
          </View>
          <View style={s.etaInfo}>
            <Text style={s.etaStatus}>{statusLabel}</Text>
            <Text style={s.etaSub}>{stationName} · Cocody</Text>
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

        <View style={s.stepsRow}>
          {STEPS.map((step, i) => (
            <View key={i} style={s.step}>
              <View style={[s.stepDot, i < currentStep && s.stepDotDone, i === currentStep && s.stepDotActive]}>
                {i < currentStep
                  ? <Ionicons name="checkmark" size={10} color="#fff" />
                  : <View style={[s.stepInner, i === currentStep && s.stepInnerActive]} />
                }
              </View>
              {i < STEPS.length - 1 && <View style={[s.stepLine, i < currentStep && s.stepLineDone]} />}
              <Text style={[s.stepLbl, i <= currentStep && s.stepLblActive]}>{step.label}</Text>
            </View>
          ))}
        </View>

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
            <TouchableOpacity style={[s.callBtn, !driverPhone && { backgroundColor: '#ccc' }]} onPress={() => driverPhone && Linking.openURL(`tel:${driverPhone}`)}>
              <Ionicons name="call" size={18} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity style={[s.msgBtn, !driverPhone && { opacity: 0.4 }]} onPress={() => driverPhone && Linking.openURL(`https://wa.me/${driverPhone.replace('+', '')}`)}>
              <Ionicons name="chatbubble" size={18} color="#0A8C52" />
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  map:  { flex: 1 },
  backBtn:   { position: 'absolute', left: 16, width: 42, height: 42, borderRadius: 21, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', ...shadows.md },
  centerBtn: { position: 'absolute', left: 16, width: 42, height: 42, borderRadius: 21, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', ...shadows.md },
  modeBadge: { position: 'absolute', right: 16, flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1 },
  modeBadgeTxt:   { fontSize: 14 },
  modeBadgeLabel: { fontSize: 12, fontWeight: '700' },
  stationMarker:  { width: 38, height: 38, borderRadius: 19, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#F5A623', ...shadows.sm },
  clientMarker:   { width: 36, height: 36, borderRadius: 18, backgroundColor: '#0A8C52', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff' },
  tricycleMarker: { width: 46, height: 46, borderRadius: 23, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', ...shadows.md, borderWidth: 2, borderColor: '#0A8C52' },
  infoCard: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, ...shadows.md },
  etaRow:   { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  pulseWrap:{ width: 20, height: 20, alignItems: 'center', justifyContent: 'center' },
  pulseRing:{ position: 'absolute', width: 20, height: 20, borderRadius: 10, backgroundColor: '#0A8C52' },
  pulseDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#0A8C52' },
  etaInfo:  { flex: 1 },
  etaStatus:{ fontSize: 15, fontWeight: '700', color: '#0D1F14' },
  etaSub:   { fontSize: 11, color: '#888780', marginTop: 2 },
  etaBadge: { backgroundColor: '#E8F5EE', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8, alignItems: 'center' },
  etaNum:   { fontSize: 24, fontWeight: '800', color: '#0A8C52', lineHeight: 26 },
  etaUnit:  { fontSize: 10, color: '#0A8C52', fontWeight: '600' },
  stepsRow:        { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16 },
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
  driverCard:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F5F4F0', borderRadius: 14, padding: 12 },
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
