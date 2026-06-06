import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Animated, StatusBar, Alert,
  ActivityIndicator, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { shadows } from '../../constants/theme';
import { ordersService, paymentsService, usersService } from '../../services/api';
import { MODES_LIVRAISON, ModeLivraison } from '../../types/commande';

interface OrderScreenProps {
  bottle: { id: string; brand: string; kg: number; price: number; color: string; image: any; };
  depotId: string;
  onClose: () => void;
  onSuccess: (orderId: string) => void;
}

const PAYMENT_METHODS = [
  { id: 'orange_money', label: 'Orange Money',      color: '#FF6600', bg: '#FFF3EB', logo: require('../../assets/orange.jpg') },
  { id: 'wave',         label: 'Wave',               color: '#1877F2', bg: '#EBF2FF', logo: require('../../assets/wave.jpg') },
  { id: 'mtn',          label: 'MTN MoMo',           color: '#FFCC00', bg: '#FFFBEB', logo: require('../../assets/mtn.jpg') },
  { id: 'cash',         label: 'Espèces au livreur', color: '#0A8C52', bg: '#E8F5EE', logo: null, emoji: '💵' },
  { id: 'wallet',       label: 'Portefeuille Klik',  color: '#0D1F14', bg: '#F0FAF5', logo: null, emoji: '👛' },
];

export default function OrderScreen({ bottle, depotId, onClose, onSuccess }: OrderScreenProps) {
  const insets = useSafeAreaInsets();
  const [step, setStep]               = useState<'address' | 'delivery' | 'payment' | 'confirm'>('address');
  const [quantity, setQuantity]       = useState(1);
  const [selectedAddress, setSelectedAddress] = useState<any>(null);
  const [selectedPayment, setSelectedPayment] = useState<string>('orange_money');
  const [selectedMode, setSelectedMode]       = useState<ModeLivraison>('rapide');
  const [addresses, setAddresses]     = useState<any[]>([]);
  const [loading, setLoading]         = useState(false);
  const [loadingAddresses, setLoadingAddresses] = useState(true);
  const [locating, setLocating]       = useState(false);
  const [mapCoords, setMapCoords]     = useState<{ lat: number; lng: number } | null>(null);
  const slideAnim = useRef(new Animated.Value(600)).current;

  const currentMode = MODES_LIVRAISON.find(m => m.mode === selectedMode)!;
  const subtotal    = bottle.price * quantity;
  const total       = subtotal + currentMode.priceFcfa;

  useEffect(() => {
    loadAddresses();
    Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, damping: 20, stiffness: 200 }).start();
  }, []);

  const loadAddresses = async () => {
    try {
      const res = await usersService.getAddresses();
      setAddresses(res.data);
      if (res.data.length > 0) setSelectedAddress(res.data[0]);
    } catch { setAddresses([]); }
    finally { setLoadingAddresses(false); }
  };

  const useCurrentLocation = async () => {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') { Alert.alert('Permission refusée', 'Activez la localisation'); return; }
      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const geocode  = await Location.reverseGeocodeAsync({ latitude: location.coords.latitude, longitude: location.coords.longitude });
      const place    = geocode[0];
      const address  = `${place?.street || ''} ${place?.district || place?.subregion || ''}`.trim();
      const commune  = place?.city || place?.subregion || 'Abidjan';
      setMapCoords({ lat: location.coords.latitude, lng: location.coords.longitude });
      setSelectedAddress({
        id: 'current', label: 'Position actuelle',
        fullAddress: address || 'Position GPS détectée',
        commune, latitude: location.coords.latitude,
        longitude: location.coords.longitude, isCurrentLocation: true,
      });
    } catch { Alert.alert('Erreur', 'Impossible de récupérer votre position'); }
    finally { setLocating(false); }
  };

  const handleOrder = async () => {
    if (!selectedAddress) { Alert.alert('Adresse requise', 'Sélectionnez votre position'); return; }
    setLoading(true);
    try {
      const orderRes = await ordersService.createOrder({
        depotId,
        deliveryAddressId: selectedAddress.id === 'current' ? null : selectedAddress.id,
        type: selectedMode,
        items: [{ productId: bottle.id, quantity }],
      });
      await paymentsService.initiatePayment({ orderId: orderRes.data.id, method: selectedPayment, amount: total });
      onSuccess(orderRes.data.id);
    } catch (error: any) {
      Alert.alert('Erreur', error.response?.data?.message || 'Impossible de passer la commande');
    } finally { setLoading(false); }
  };

  const STEPS       = ['address', 'delivery', 'payment', 'confirm'];
  const currentStep = STEPS.indexOf(step);
  const selectedMethod = PAYMENT_METHODS.find(m => m.id === selectedPayment)!;

  return (
    <Animated.View style={[s.root, { transform: [{ translateY: slideAnim }] }]}>
      <StatusBar barStyle="light-content" backgroundColor="#0D1F14" />

      <View style={[s.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={onClose} style={s.closeBtn}>
          <Ionicons name="close" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Commander</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={s.progress}>
        {['Adresse', 'Délai', 'Paiement', 'Confirmation'].map((label, i) => (
          <View key={i} style={s.progressItem}>
            <View style={[s.progressDot, i <= currentStep && s.progressDotActive, i < currentStep && s.progressDotDone]}>
              {i < currentStep ? <Ionicons name="checkmark" size={11} color="#fff" /> : <Text style={[s.progressNum, i <= currentStep && s.progressNumActive]}>{i + 1}</Text>}
            </View>
            <Text style={[s.progressLbl, i <= currentStep && s.progressLblActive]}>{label}</Text>
            {i < 3 && <View style={[s.progressLine, i < currentStep && s.progressLineDone]} />}
          </View>
        ))}
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

        <View style={s.summaryCard}>
          <View style={[s.summaryImgContainer, { backgroundColor: `${bottle.color}20` }]}>
            <View style={[s.summaryImgGlow, { backgroundColor: `${bottle.color}15` }]} />
            <Image source={bottle.image} style={s.summaryImg} resizeMode="contain" />
          </View>
          <View style={s.summaryInfo}>
            <Text style={[s.summaryBrand, { color: bottle.color }]}>{bottle.brand.split(' ')[0].toUpperCase()}</Text>
            <Text style={s.summaryKg}>{bottle.kg} kg</Text>
          </View>
          <View style={s.summaryPrices}>
            <Text style={s.summaryQty}>{quantity > 1 ? `${quantity} × ` : ''}{bottle.price.toLocaleString()} F</Text>
            <Text style={s.summaryDelivery}>+ {currentMode.priceFcfa.toLocaleString()} F liv.</Text>
            <Text style={[s.summaryTotal, { color: bottle.color }]}>{total.toLocaleString()} FCFA</Text>
          </View>
        </View>

        {step === 'address' && (
          <View>
            <Text style={s.stepTitle}>Quantité</Text>
            <View style={s.qtyCard}>
              <View style={s.qtyLeft}>
                <Image source={bottle.image} style={s.qtyImg} resizeMode="contain" />
                <View>
                  <Text style={s.qtyName}>{bottle.brand}</Text>
                  <Text style={s.qtyKg}>{bottle.price.toLocaleString()} F/u</Text>
                </View>
              </View>
              <View style={s.qtyControls}>
                <TouchableOpacity style={[s.qtyBtn, quantity <= 1 && s.qtyBtnDisabled]} onPress={() => setQuantity(q => Math.max(1, q - 1))} disabled={quantity <= 1}>
                  <Ionicons name="remove" size={18} color={quantity <= 1 ? '#ccc' : '#0D1F14'} />
                </TouchableOpacity>
                <Text style={s.qtyNum}>{quantity}</Text>
                <TouchableOpacity style={[s.qtyBtn, quantity >= 5 && s.qtyBtnDisabled]} onPress={() => setQuantity(q => Math.min(5, q + 1))} disabled={quantity >= 5}>
                  <Ionicons name="add" size={18} color={quantity >= 5 ? '#ccc' : '#0D1F14'} />
                </TouchableOpacity>
              </View>
            </View>

            <Text style={[s.stepTitle, { marginTop: 20 }]}>Adresse de livraison</Text>
            <TouchableOpacity style={[s.geoBtn, selectedAddress?.isCurrentLocation && s.geoBtnActive]} onPress={useCurrentLocation} disabled={locating}>
              {locating ? <ActivityIndicator size="small" color="#0A8C52" /> : <Ionicons name="navigate" size={20} color="#0A8C52" />}
              <View style={{ flex: 1 }}>
                <Text style={s.geoBtnTitle}>Utiliser ma position actuelle</Text>
                <Text style={s.geoBtnSub}>{selectedAddress?.isCurrentLocation ? `📍 ${selectedAddress.fullAddress}` : 'GPS — détection automatique'}</Text>
              </View>
              {selectedAddress?.isCurrentLocation && <Ionicons name="checkmark-circle" size={22} color="#0A8C52" />}
            </TouchableOpacity>

            {mapCoords && (
              <View style={s.mapWrap}>
                <MapView
                  style={s.map}
                  provider={PROVIDER_GOOGLE}
                  region={{ latitude: mapCoords.lat, longitude: mapCoords.lng, latitudeDelta: 0.01, longitudeDelta: 0.01 }}
                  scrollEnabled={false}
                  zoomEnabled={false}
                >
                  <Marker coordinate={{ latitude: mapCoords.lat, longitude: mapCoords.lng }} title="Votre position">
                    <View style={s.posMarker}>
                      <Ionicons name="location" size={20} color="#fff" />
                    </View>
                  </Marker>
                </MapView>
              </View>
            )}

            {loadingAddresses ? (
              <ActivityIndicator color="#0A8C52" style={{ marginTop: 20 }} />
            ) : addresses.length > 0 && (
              <View style={{ marginTop: 12 }}>
                <Text style={s.savedLabel}>Adresses enregistrées</Text>
                {addresses.map((addr) => (
                  <TouchableOpacity key={addr.id} style={[s.addressCard, selectedAddress?.id === addr.id && s.addressCardSelected]} onPress={() => { setSelectedAddress(addr); setMapCoords(null); }}>
                    <View style={s.addressIcon}>
                      <Ionicons name={addr.label === 'Domicile' ? 'home' : addr.label === 'Bureau' ? 'business' : 'location'} size={20} color={selectedAddress?.id === addr.id ? '#0A8C52' : '#B4B2A9'} />
                    </View>
                    <View style={s.addressInfo}>
                      <Text style={s.addressLabel}>{addr.label}</Text>
                      <Text style={s.addressFull}>{addr.fullAddress}</Text>
                      <Text style={s.addressCommune}>{addr.commune}</Text>
                    </View>
                    {selectedAddress?.id === addr.id && <Ionicons name="checkmark-circle" size={24} color="#0A8C52" />}
                  </TouchableOpacity>
                ))}
              </View>
            )}
            <TouchableOpacity style={s.addNewAddress}>
              <Ionicons name="add-circle-outline" size={20} color="#0A8C52" />
              <Text style={s.addNewAddressTxt}>Ajouter une nouvelle adresse</Text>
            </TouchableOpacity>
            <View style={s.zoneInfo}>
              <Ionicons name="information-circle" size={16} color="#0A8C52" />
              <Text style={s.zoneInfoTxt}>Livraison disponible à Cocody, Plateau et Marcory</Text>
            </View>
          </View>
        )}

        {step === 'delivery' && (
          <View>
            <Text style={s.stepTitle}>Délai de livraison</Text>
            <Text style={s.stepSubtitle}>Choisissez votre mode de livraison</Text>
            {MODES_LIVRAISON.map((mode) => {
              const isSelected = selectedMode === mode.mode;
              return (
                <TouchableOpacity key={mode.mode} style={[s.modeCard, isSelected && s.modeCardSelected]} onPress={() => setSelectedMode(mode.mode)} activeOpacity={0.85}>
                  <View style={[s.modeIconWrap, { backgroundColor: isSelected ? '#0A8C52' : '#F5F4F0' }]}>
                    <Text style={s.modeIcon}>{mode.icon}</Text>
                  </View>
                  <View style={s.modeInfo}>
                    <View style={s.modeTopRow}>
                      <Text style={[s.modeLabel, isSelected && { color: '#0A8C52' }]}>{mode.label}</Text>
                      {mode.mode === 'rapide' && <View style={s.popularBadge}><Text style={s.popularTxt}>Populaire</Text></View>}
                    </View>
                    <Text style={s.modeDelai}>{mode.delai}</Text>
                    <Text style={s.modeDesc}>{mode.description}</Text>
                  </View>
                  <View style={s.modePriceWrap}>
                    <Text style={[s.modePrice, isSelected && { color: '#0A8C52' }]}>{mode.priceFcfa.toLocaleString()} F</Text>
                    <View style={[s.modeRadio, isSelected && { borderColor: '#0A8C52' }]}>
                      {isSelected && <View style={s.modeRadioInner} />}
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
            <View style={s.priceSummary}>
              <View style={s.priceSummaryRow}>
                <Text style={s.priceSummaryLbl}>{quantity} × {bottle.brand}</Text>
                <Text style={s.priceSummaryVal}>{subtotal.toLocaleString()} F</Text>
              </View>
              <View style={s.priceSummaryRow}>
                <Text style={s.priceSummaryLbl}>Frais livraison {currentMode.label}</Text>
                <Text style={s.priceSummaryVal}>{currentMode.priceFcfa.toLocaleString()} F</Text>
              </View>
              <View style={s.priceDivider} />
              <View style={s.priceSummaryRow}>
                <Text style={[s.priceSummaryLbl, { fontWeight: '700', color: '#0D1F14' }]}>Total</Text>
                <Text style={[s.priceSummaryVal, { fontWeight: '800', color: bottle.color, fontSize: 18 }]}>{total.toLocaleString()} FCFA</Text>
              </View>
            </View>
            <View style={s.zoneInfo}>
              <Ionicons name="flash" size={16} color="#0A8C52" />
              <Text style={s.zoneInfoTxt}>Votre commande {bottle.brand} sera prise en charge par la station la plus proche</Text>
            </View>
          </View>
        )}

        {step === 'payment' && (
          <View>
            <Text style={s.stepTitle}>Mode de paiement</Text>
            {PAYMENT_METHODS.map((method) => {
              const isSelected = selectedPayment === method.id;
              return (
                <TouchableOpacity key={method.id} style={[s.paymentCard, isSelected && { borderColor: method.color, backgroundColor: method.bg }]} onPress={() => setSelectedPayment(method.id)}>
                  <View style={[s.paymentLogoWrap, { backgroundColor: isSelected ? '#fff' : '#F5F4F0' }]}>
                    {method.logo ? <Image source={method.logo} style={s.paymentLogoImg} resizeMode="contain" /> : <Text style={s.paymentEmoji}>{method.emoji}</Text>}
                  </View>
                  <Text style={[s.paymentLabel, isSelected && { color: method.color, fontWeight: '700' }]}>{method.label}</Text>
                  <View style={[s.paymentRadio, isSelected && { borderColor: method.color }]}>
                    {isSelected && <View style={[s.paymentRadioInner, { backgroundColor: method.color }]} />}
                  </View>
                </TouchableOpacity>
              );
            })}
            <View style={s.secureNote}>
              <Ionicons name="shield-checkmark" size={16} color="#0A8C52" />
              <Text style={s.secureNoteTxt}>Paiement 100% sécurisé via CinetPay</Text>
            </View>
          </View>
        )}

        {step === 'confirm' && (
          <View>
            <Text style={s.stepTitle}>Récapitulatif</Text>
            <View style={s.confirmCard}>
              <View style={s.confirmRow}>
                <Text style={s.confirmLabel}>📦 Produit</Text>
                <Text style={s.confirmValue}>{bottle.brand}</Text>
              </View>
              <View style={s.confirmDivider} />
              <View style={s.confirmRow}>
                <Text style={s.confirmLabel}>📍 Adresse</Text>
                <View style={{ alignItems: 'flex-end', flexShrink: 1, marginLeft: 12 }}>
                  <Text style={s.confirmValue}>{selectedAddress?.label}</Text>
                  <Text style={s.confirmSub}>{selectedAddress?.fullAddress}</Text>
                </View>
              </View>
              <View style={s.confirmDivider} />
              <View style={s.confirmRow}>
                <Text style={s.confirmLabel}>🚴 Mode</Text>
                <View style={{ alignItems: 'flex-end', flexShrink: 1, marginLeft: 12 }}>
                  <Text style={[s.confirmValue, { color: '#0A8C52' }]}>{currentMode.icon} {currentMode.label}</Text>
                  <Text style={s.confirmSub}>{currentMode.delai} · {currentMode.priceFcfa.toLocaleString()} F</Text>
                </View>
              </View>
              <View style={s.confirmDivider} />
              <View style={s.confirmRow}>
                <Text style={s.confirmLabel}>💳 Paiement</Text>
                <View style={s.confirmPayRow}>
                  {selectedMethod.logo && <Image source={selectedMethod.logo} style={s.confirmPayLogo} resizeMode="contain" />}
                  <Text style={[s.confirmValue, { color: selectedMethod.color }]}>{selectedMethod.label}</Text>
                </View>
              </View>
              <View style={s.confirmDivider} />
              <View style={[s.confirmRow, { paddingVertical: 6 }]}>
                <Text style={s.confirmLabel}>{quantity} × {bottle.brand}</Text>
                <Text style={s.confirmValue}>{subtotal.toLocaleString()} F</Text>
              </View>
              <View style={[s.confirmRow, { paddingVertical: 6 }]}>
                <Text style={s.confirmLabel}>Livraison {currentMode.label}</Text>
                <Text style={s.confirmValue}>{currentMode.priceFcfa.toLocaleString()} F</Text>
              </View>
              <View style={s.confirmDivider} />
              <View style={s.confirmRow}>
                <Text style={[s.confirmLabel, { fontWeight: '700', color: '#0D1F14', fontSize: 15 }]}>Total</Text>
                <Text style={[s.confirmValue, { fontWeight: '800', color: bottle.color, fontSize: 20 }]}>{total.toLocaleString()} FCFA</Text>
              </View>
            </View>
            <View style={s.deliveryInfo}>
              {[
                { icon: 'bicycle',          txt: `Livreur Klik · ${currentMode.label} ${currentMode.delai}` },
                { icon: 'shield-checkmark', txt: 'Bouteille contrôlée et certifiée' },
                { icon: 'refresh',          txt: 'Retour bouteille vide pris en charge' },
              ].map((item, i) => (
                <View key={i} style={s.deliveryInfoRow}>
                  <Ionicons name={item.icon as any} size={18} color="#0A8C52" />
                  <Text style={s.deliveryInfoTxt}>{item.txt}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      <View style={[s.footer, { paddingBottom: insets.bottom + 12 }]}>
        {step !== 'address' && (
          <TouchableOpacity style={s.backBtn} onPress={() => {
            if (step === 'delivery') setStep('address');
            else if (step === 'payment') setStep('delivery');
            else if (step === 'confirm') setStep('payment');
          }}>
            <Ionicons name="arrow-back" size={20} color="#0D1F14" />
          </TouchableOpacity>
        )}
        <TouchableOpacity style={[s.nextBtn, loading && { opacity: 0.7 }]} onPress={() => {
          if (step === 'address') {
            if (!selectedAddress) { Alert.alert('Adresse requise', 'Sélectionnez ou détectez votre position'); return; }
            setStep('delivery');
          } else if (step === 'delivery') {
            setStep('payment');
          } else if (step === 'payment') {
            setStep('confirm');
          } else {
            handleOrder();
          }
        }} disabled={loading}>
          {loading ? <ActivityIndicator color="#0D1F14" /> : (
            <>
              <Text style={s.nextBtnTxt}>
                {step === 'address' ? 'Choisir le délai' : step === 'delivery' ? 'Choisir le paiement' : step === 'payment' ? 'Confirmer' : 'Passer la commande 🛵'}
              </Text>
              <Ionicons name="arrow-forward" size={18} color="#0D1F14" />
            </>
          )}
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F5F4F0' },
  scroll: { flex: 1 },
  content: { padding: 16 },
  header: { backgroundColor: '#0D1F14', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 14 },
  closeBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#fff' },
  progress: { backgroundColor: '#0D1F14', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingBottom: 16, paddingHorizontal: 12 },
  progressItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  progressDot: { width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.2)' },
  progressDotActive: { backgroundColor: '#F5A623', borderColor: '#F5A623' },
  progressDotDone: { backgroundColor: '#0A8C52', borderColor: '#0A8C52' },
  progressNum: { fontSize: 10, color: 'rgba(255,255,255,0.5)', fontWeight: '600' },
  progressNumActive: { color: '#0D1F14' },
  progressLbl: { fontSize: 9, color: 'rgba(255,255,255,0.4)' },
  progressLblActive: { color: '#fff', fontWeight: '600' },
  progressLine: { width: 14, height: 1.5, backgroundColor: 'rgba(255,255,255,0.15)', marginHorizontal: 2 },
  progressLineDone: { backgroundColor: '#0A8C52' },
  summaryCard: { backgroundColor: '#0D1F14', borderRadius: 20, padding: 14, flexDirection: 'row', alignItems: 'center', marginBottom: 20, ...shadows.md, overflow: 'hidden' },
  summaryImgContainer: { width: 80, height: 90, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginRight: 12, position: 'relative' },
  summaryImgGlow: { position: 'absolute', width: 70, height: 70, borderRadius: 35, top: 10 },
  summaryImg: { width: 72, height: 86, backgroundColor: 'transparent' },
  summaryInfo: { flex: 1 },
  summaryBrand: { fontSize: 11, fontWeight: '800', letterSpacing: 1.5, marginBottom: 2 },
  summaryKg: { fontSize: 28, fontWeight: '900', color: '#fff', lineHeight: 30 },
  summaryPrices: { alignItems: 'flex-end' },
  summaryQty: { fontSize: 12, color: 'rgba(255,255,255,0.5)' },
  summaryDelivery: { fontSize: 10, color: 'rgba(255,255,255,0.35)', marginTop: 1 },
  summaryTotal: { fontSize: 17, fontWeight: '800', marginTop: 6 },
  stepTitle: { fontSize: 18, fontWeight: '700', color: '#0D1F14', marginBottom: 12 },
  stepSubtitle: { fontSize: 13, color: '#888780', marginBottom: 16 },
  qtyCard: { backgroundColor: '#fff', borderRadius: 16, padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, ...shadows.sm },
  qtyLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  qtyImg: { width: 44, height: 52, backgroundColor: 'transparent' },
  qtyName: { fontSize: 14, fontWeight: '700', color: '#0D1F14' },
  qtyKg: { fontSize: 12, color: '#888780', marginTop: 2 },
  qtyControls: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#F5F4F0', borderRadius: 12, padding: 4 },
  qtyBtn: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', ...shadows.sm },
  qtyBtnDisabled: { opacity: 0.4 },
  qtyNum: { fontSize: 18, fontWeight: '800', color: '#0D1F14', minWidth: 24, textAlign: 'center' },
  geoBtn: { backgroundColor: '#fff', borderRadius: 14, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 2, borderColor: 'transparent', ...shadows.sm },
  geoBtnActive: { borderColor: '#0A8C52' },
  geoBtnTitle: { fontSize: 14, fontWeight: '700', color: '#0D1F14' },
  geoBtnSub: { fontSize: 11, color: '#888780', marginTop: 2 },
  mapWrap: { marginTop: 12, borderRadius: 14, overflow: 'hidden', height: 160, ...shadows.sm },
  map: { flex: 1 },
  posMarker: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#0A8C52', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff' },
  savedLabel: { fontSize: 12, color: '#888780', marginBottom: 8, marginTop: 12 },
  addressCard: { backgroundColor: '#fff', borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10, borderWidth: 2, borderColor: 'transparent', ...shadows.sm },
  addressCardSelected: { borderColor: '#0A8C52' },
  addressIcon: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#F5F4F0', alignItems: 'center', justifyContent: 'center' },
  addressInfo: { flex: 1 },
  addressLabel: { fontSize: 14, fontWeight: '700', color: '#0D1F14' },
  addressFull: { fontSize: 12, color: '#888780', marginTop: 2 },
  addressCommune: { fontSize: 11, color: '#B4B2A9', marginTop: 1 },
  addNewAddress: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 14, marginBottom: 8 },
  addNewAddressTxt: { fontSize: 14, color: '#0A8C52', fontWeight: '600' },
  zoneInfo: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#E8F5EE', borderRadius: 12, padding: 12, marginTop: 8 },
  zoneInfoTxt: { fontSize: 12, color: '#065C35', flex: 1 },
  modeCard: { backgroundColor: '#fff', borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10, borderWidth: 2, borderColor: 'transparent', ...shadows.sm },
  modeCardSelected: { borderColor: '#0A8C52', backgroundColor: '#F0FAF5' },
  modeIconWrap: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  modeIcon: { fontSize: 22 },
  modeInfo: { flex: 1 },
  modeTopRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  modeLabel: { fontSize: 15, fontWeight: '700', color: '#0D1F14' },
  popularBadge: { backgroundColor: '#F5A623', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  popularTxt: { fontSize: 9, fontWeight: '700', color: '#0D1F14' },
  modeDelai: { fontSize: 12, color: '#0A8C52', fontWeight: '600' },
  modeDesc: { fontSize: 11, color: '#888780', marginTop: 1 },
  modePriceWrap: { alignItems: 'flex-end', gap: 6 },
  modePrice: { fontSize: 14, fontWeight: '800', color: '#0D1F14' },
  modeRadio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#B4B2A9', alignItems: 'center', justifyContent: 'center' },
  modeRadioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#0A8C52' },
  priceSummary: { backgroundColor: '#fff', borderRadius: 14, padding: 14, marginTop: 12, marginBottom: 12, ...shadows.sm },
  priceSummaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  priceSummaryLbl: { fontSize: 13, color: '#888780' },
  priceSummaryVal: { fontSize: 13, color: '#0D1F14', fontWeight: '600' },
  priceDivider: { height: 0.5, backgroundColor: '#E8E6DF', marginVertical: 4 },
  paymentCard: { backgroundColor: '#fff', borderRadius: 14, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 10, borderWidth: 2, borderColor: 'transparent', ...shadows.sm },
  paymentLogoWrap: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  paymentLogoImg: { width: 36, height: 36, borderRadius: 8 },
  paymentEmoji: { fontSize: 26 },
  paymentLabel: { flex: 1, fontSize: 15, color: '#0D1F14', fontWeight: '500' },
  paymentRadio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: '#B4B2A9', alignItems: 'center', justifyContent: 'center' },
  paymentRadioInner: { width: 10, height: 10, borderRadius: 5 },
  secureNote: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#E8F5EE', borderRadius: 12, padding: 12, marginTop: 8 },
  secureNoteTxt: { fontSize: 12, color: '#065C35' },
  confirmCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 16, ...shadows.sm },
  confirmRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 },
  confirmLabel: { fontSize: 13, color: '#888780' },
  confirmValue: { fontSize: 13, color: '#0D1F14', fontWeight: '600', textAlign: 'right', flexShrink: 1 },
  confirmSub: { fontSize: 11, color: '#B4B2A9', marginTop: 2, textAlign: 'right' },
  confirmPayRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  confirmPayLogo: { width: 24, height: 24, borderRadius: 4 },
  confirmDivider: { height: 0.5, backgroundColor: '#E8E6DF' },
  deliveryInfo: { backgroundColor: '#fff', borderRadius: 16, padding: 16, gap: 12, ...shadows.sm },
  deliveryInfoRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  deliveryInfoTxt: { fontSize: 13, color: '#0D1F14' },
  footer: { backgroundColor: '#fff', borderTopWidth: 0.5, borderTopColor: '#E8E6DF', paddingHorizontal: 16, paddingTop: 12, flexDirection: 'row', gap: 10, ...shadows.md },
  backBtn: { width: 48, height: 52, borderRadius: 14, backgroundColor: '#F5F4F0', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E8E6DF' },
  nextBtn: { flex: 1, backgroundColor: '#F5A623', borderRadius: 14, height: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  nextBtnTxt: { fontSize: 15, fontWeight: '800', color: '#0D1F14' },
});