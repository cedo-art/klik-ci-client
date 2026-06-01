import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Animated, StatusBar,
  Image, Modal, ActivityIndicator,Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { shadows } from '../../constants/theme';
import { useAuth } from '../../hooks/useAuth';
import KlikLogo from '../../components/KlikLogo';
import OrderScreen from '../orders/OrderScreen';
import HistoriqueScreen from '../orders/HistoriqueScreen';
import TrackingScreen from '../tracking/TrackingScreen';
import ProfilScreen from '../profile/ProfilScreen';
import CatalogueScreen from '../catalogue/CatalogueScreen';
import { catalogService } from '../../services/api';

const API_URL = 'http://10.146.237.96:4000';

const TABS = [
  { label: 'Accueil',   icon: 'home-outline',     iconActive: 'home' },
  { label: 'Commandes', icon: 'cube-outline',      iconActive: 'cube' },
  { label: 'Suivi',     icon: 'location-outline',  iconActive: 'location' },
  { label: 'Profil',    icon: 'person-outline',    iconActive: 'person' },
];

const PROMO_BANNERS = [
  { bg: '#0A8C52', title: 'Première livraison',  sub: 'Frais offerts avec le code KLIK1',         cta: 'En profiter' },
  { bg: '#1B3A2D', title: 'Abonnement mensuel',  sub: 'Livraisons illimitées · 5 000 FCFA/mois',  cta: 'Découvrir' },
];

const getBrandColor = (name: string) => {
  const n = (name || '').toLowerCase();
  if (n.includes('total')) return '#E85200';
  if (n.includes('oryx'))  return '#0055A4';
  if (n.includes('shell')) return '#DD1D21';
  if (n.includes('simam')) return '#E8A000';
  return '#0A8C52';
};

const getBrandDesc = (kg: number) => {
  if (kg <= 6)    return '1–2 personnes · Usage quotidien';
  if (kg <= 12.5) return 'Famille · La plus commandée';
  return 'Usage intensif · Professionnel';
};

export default function HomeScreen() {
  const { user } = useAuth();
  const insets   = useSafeAreaInsets();

  const [activeTab, setActiveTab]           = useState(0);
  const [activeBanner, setActiveBanner]     = useState(0);
  const [activeOrder, setActiveOrder]       = useState(false);
  const [lastOrderId, setLastOrderId]       = useState<string | null>(null);
  const [showOrder, setShowOrder]           = useState(false);
  const [showHistorique, setShowHistorique] = useState(false);
  const [showTracking, setShowTracking]     = useState(false);
  const [showProfil, setShowProfil]         = useState(false);
  const [showCatalogue, setShowCatalogue]   = useState(false);

  const [depots, setDepots]               = useState<any[]>([]);
  const [allStocks, setAllStocks]         = useState<any[]>([]);
  const [selectedDepot, setSelectedDepot] = useState<any>(null);
  const [selectedStock, setSelectedStock] = useState<any>(null);
  const [loadingData, setLoadingData]     = useState(true);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeIn    = useRef(new Animated.Value(0)).current;
  const slideUp   = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    loadData();
    Animated.parallel([
      Animated.timing(fadeIn,  { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(slideUp, { toValue: 0, useNativeDriver: true, damping: 18, stiffness: 200 }),
    ]).start();
    const timer = setInterval(() => setActiveBanner(p => (p + 1) % PROMO_BANNERS.length), 3500);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.7, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1,   duration: 1000, useNativeDriver: true }),
      ])
    );
    if (activeOrder) pulse.start();
    return () => pulse.stop();
  }, [activeOrder]);

  const loadData = async () => {
    try {
      const depotsRes  = await catalogService.getDepots();
      const depotsData = depotsRes.data;
      setDepots(depotsData);

      const all: any[] = [];
      for (const depot of depotsData) {
        try {
          const stockRes = await catalogService.getDepotStock(depot.id);
          const stocks   = stockRes.data
            .filter((s: any) => s.quantity > 0)
            .map((s: any) => ({ ...s, depot }));
          all.push(...stocks);
        } catch {}
      }
      setAllStocks(all);

      if (depotsData.length > 0) {
        setSelectedDepot(depotsData[0]);
        const firstStocks = all.filter(s => s.depot.id === depotsData[0].id);
        if (firstStocks.length > 0) setSelectedStock(firstStocks[0]);
      }
    } catch (err) {
      console.log('Erreur:', err);
    } finally {
      setLoadingData(false);
    }
  };

  const TAB_HEIGHT    = 60 + insets.bottom;
  const selectedColor = selectedStock ? getBrandColor(selectedStock.product.name) : '#0A8C52';
  const depotStocks   = allStocks.filter(s => s.depot.id === selectedDepot?.id);
  const otherStocks   = allStocks.filter(s => s.depot.id !== selectedDepot?.id);

  const getDepotLogo = (depot: any) =>
  depot?.logoUrl
    ? { uri: depot.logoUrl.startsWith('http') ? depot.logoUrl : `${API_URL}${depot.logoUrl}` }
    : null;

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor="#0D1F14" translucent={false} />

      {/* HEADER */}
      <View style={[s.header, { paddingTop: insets.top + 10 }]}>
        <KlikLogo variant="dark" width={100} showTagline={false} />
        <TouchableOpacity style={s.locPill}>
          <Ionicons name="location" size={13} color="#F5A623" />
          <Text style={s.locZone}>{selectedDepot?.commune || selectedDepot?.name || 'Abidjan'}</Text>
          <Ionicons name="chevron-down" size={12} color="#9FE1CB" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={[s.content, { paddingBottom: TAB_HEIGHT + 16 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* SEARCH */}
        <View style={s.searchWrap}>
          <Ionicons name="search" size={16} color="#B4B2A9" />
          <Text style={s.searchPlaceholder}>Rechercher une bouteille, une marque…</Text>
        </View>

        {/* PROMO BANNER */}
        <View style={[s.promoBanner, { backgroundColor: PROMO_BANNERS[activeBanner].bg }]}>
          <View style={s.promoContent}>
            <Text style={s.promoTitle}>{PROMO_BANNERS[activeBanner].title}</Text>
            <Text style={s.promoSub}>{PROMO_BANNERS[activeBanner].sub}</Text>
            <TouchableOpacity style={s.promoCta}>
              <Text style={s.promoCtaTxt}>{PROMO_BANNERS[activeBanner].cta} →</Text>
            </TouchableOpacity>
          </View>
          <Text style={s.promoEmoji}>🔥</Text>
          <View style={s.promoDots}>
            {PROMO_BANNERS.map((_, i) => (
              <View key={i} style={[s.dot, i === activeBanner && s.dotActive]} />
            ))}
          </View>
        </View>

        {/* BOUTEILLES */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>Nos bouteilles</Text>
          <TouchableOpacity onPress={() => setShowCatalogue(true)}>
            <Text style={s.seeAll}>Tout voir</Text>
          </TouchableOpacity>
        </View>

        {loadingData ? (
          <View style={{ paddingVertical: 30, alignItems: 'center' }}>
            <ActivityIndicator color="#0A8C52" size="large" />
            <Text style={{ color: '#888', marginTop: 10, fontSize: 13 }}>Chargement des produits…</Text>
          </View>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.bottlesScroll}>
          {depotStocks.map((stock) => {
  const isSelected = selectedStock?.id === stock.id;
  const color = getBrandColor(stock.product.name);
  const kg    = parseFloat(stock.product.weightKg);
  const logo  = getDepotLogo(selectedDepot);
  return (
    <TouchableOpacity key={stock.id} activeOpacity={0.9} onPress={() => setSelectedStock(stock)}>
      <View style={[s.bottleCard, isSelected && { borderColor: color, borderWidth: 2.5 }]}>
        {isSelected && (
          <View style={[s.bottleCheck, { backgroundColor: color }]}>
            <Ionicons name="checkmark" size={12} color="#fff" />
          </View>
        )}
        {logo && (
          <Image source={logo} style={{ width: 50, height: 22, marginBottom: 6 }} resizeMode="contain" />
        )}
        <View style={s.bottleImgWrap}>
          <Image source={{ uri: stock.product.imageUrl }} style={s.bottleImg} resizeMode="contain" />
        </View>
        <Text style={[s.bottleBrand, { color }]}>{stock.product.name.split(' ')[0].toUpperCase()}</Text>
        <Text style={s.bottleKg}>{kg} kg</Text>
        <Text style={s.bottleDesc}>{getBrandDesc(kg)}</Text>
        <Text style={[s.bottlePrice, isSelected && { color }]}>{stock.product.priceFcfa.toLocaleString()} FCFA</Text>
        <View style={s.stockBadgeSmall}>
          <View style={[s.stockDotSmall, { backgroundColor: stock.quantity > 10 ? '#0A8C52' : '#F5A623' }]} />
          <Text style={s.stockTxtSmall}>{stock.quantity} restantes</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
})}

            {otherStocks.length > 0 && (
              <View style={s.arrowSep}>
                <View style={s.arrowLine} />
                <Ionicons name="chevron-forward" size={22} color="#0A8C52" />
                <View style={s.arrowLine} />
              </View>
            )}

            {otherStocks.map((stock) => {
              const isSelected = selectedStock?.id === stock.id;
              const color = getBrandColor(stock.product.name);
              const kg    = parseFloat(stock.product.weightKg);
              const logo  = getDepotLogo(stock.depot);
              return (
                <TouchableOpacity
                  key={`${stock.id}-other`}
                  activeOpacity={0.9}
                  onPress={() => { setSelectedDepot(stock.depot); setSelectedStock(stock); }}
                >
                  <View style={[s.bottleCard, s.bottleCardOther, isSelected && { borderColor: color, borderWidth: 2.5 }]}>
                    <View style={[s.stationBadge, { backgroundColor: `${color}15` }]}>
                      {logo ? (
                        <Image source={logo} style={s.stationBadgeLogo} resizeMode="contain" />
                      ) : (
                        <Text style={{ fontSize: 10 }}>⛽</Text>
                      )}
                      <Text style={[s.stationBadgeTxt, { color }]} numberOfLines={1}>{stock.depot.name}</Text>
                    </View>
                    <View style={s.bottleImgWrap}>
                      <Image source={{ uri: stock.product.imageUrl }} style={s.bottleImg} resizeMode="contain" />
                    </View>
                    <Text style={[s.bottleBrand, { color }]}>{stock.product.name.split(' ')[0].toUpperCase()}</Text>
                    <Text style={s.bottleKg}>{kg} kg</Text>
                    <Text style={s.bottleDesc}>{getBrandDesc(kg)}</Text>
                    <Text style={[s.bottlePrice, isSelected && { color }]}>{stock.product.priceFcfa.toLocaleString()} FCFA</Text>
                    <View style={s.stockBadgeSmall}>
                      <View style={[s.stockDotSmall, { backgroundColor: stock.quantity > 10 ? '#0A8C52' : '#F5A623' }]} />
                      <Text style={s.stockTxtSmall}>{stock.quantity} restantes</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {/* COMMANDE RAPIDE */}
        {selectedStock && (
          <View style={s.quickOrder}>
            <View style={s.qoLeft}>
              <Text style={s.qoLabel}>SÉLECTION · {selectedDepot?.name}</Text>
              <Text style={s.qoName}>{selectedStock.product.name}</Text>
              <View style={s.qoDetails}>
                <Text style={[s.qoPrice, { color: selectedColor }]}>{selectedStock.product.priceFcfa.toLocaleString()} FCFA</Text>
                <View style={s.qoDivider} />
                <Text style={s.qoDelivery}>+ 500 F livraison</Text>
              </View>
              <View style={s.qoMeta}>
                <View style={s.qoMetaChip}>
                  <Text style={s.qoMetaTxt}>⚡ Rapide · 1 000 F</Text>
                </View>
              </View>
            </View>
            <TouchableOpacity style={s.qoBtn} activeOpacity={0.85} onPress={() => setShowOrder(true)}>
              <Text style={s.qoBtnTxt}>Commander</Text>
              <Text style={s.qoBtnArrow}>→</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* COMMANDE EN COURS */}
        {activeOrder && (
          <View>
            <View style={s.sectionHeader}>
              <Text style={s.sectionTitle}>Commande en cours</Text>
              <TouchableOpacity onPress={() => setShowTracking(true)}>
                <Text style={s.seeAll}>Suivre →</Text>
              </TouchableOpacity>
            </View>
            <View style={s.trackCard}>
              <View style={s.trackTop}>
                <View style={s.trackLeft2}>
                  <View style={s.pulseWrap}>
                    <Animated.View style={[s.pulseRing, {
                      transform: [{ scale: pulseAnim }],
                      opacity: pulseAnim.interpolate({ inputRange: [1, 1.7], outputRange: [0.5, 0] }),
                    }]} />
                    <View style={s.pulseDot} />
                  </View>
                  <View>
                    <Text style={s.trackStatus}>En cours</Text>
                    <Text style={s.trackSubTxt}>Appuyez sur "Suivre" pour voir le livreur</Text>
                  </View>
                </View>
                <TouchableOpacity style={s.etaBadge} onPress={() => setShowTracking(true)}>
                  <Ionicons name="location" size={18} color="#0A8C52" />
                  <Text style={s.etaUnit}>Suivre</Text>
                </TouchableOpacity>
              </View>
              <View style={s.stepsRow}>
                {['Confirmée', 'Préparée', 'En route', 'Livrée'].map((step, i) => (
                  <View key={i} style={s.step}>
                    <View style={[s.stepDot, i < 2 && s.stepDotDone, i === 2 && s.stepDotActive]}>
                      {i < 2 && <Ionicons name="checkmark" size={10} color="#fff" />}
                    </View>
                    <Text style={[s.stepLbl, i < 2 && s.stepLblDone]}>{step}</Text>
                  </View>
                ))}
              </View>
              <View style={s.progressBar}>
                <View style={s.progressFill} />
              </View>
            </View>
          </View>
        )}

        {/* STATIONS PARTENAIRES */}
        <View style={[s.sectionHeader, { marginTop: 20 }]}>
          <Text style={s.sectionTitle}>Stations partenaires</Text>
        </View>

        {depots.map((depot) => {
          const isSelected = selectedDepot?.id === depot.id;
          const color      = getBrandColor(depot.name);
          const logo       = getDepotLogo(depot);
          const stockCount = allStocks.filter(s => s.depot.id === depot.id).length;
          return (
            <TouchableOpacity
              key={depot.id}
              style={[s.stationCard, isSelected && { borderColor: '#0A8C52', borderWidth: 2 }]}
              onPress={() => {
                setSelectedDepot(depot);
                const first = allStocks.find(s => s.depot.id === depot.id);
                if (first) setSelectedStock(first);
              }}
            >
              <View style={s.stationLogoWrap}>
                {logo ? (
                  <Image source={logo} style={s.stationLogoImg} resizeMode="contain" />
                ) : (
                  <Text style={{ fontSize: 22 }}>⛽</Text>
                )}
              </View>
              <View style={s.stationInfo}>
                <Text style={[s.stationName, isSelected && { color: '#0A8C52' }]}>{depot.name}</Text>
                <View style={s.stationMeta}>
                  <Ionicons name="location" size={11} color="#888780" />
                  <Text style={s.stationMetaTxt}>{depot.address}</Text>
                </View>
                {depot.commune && (
                  <Text style={{ fontSize: 11, color, fontWeight: '600', marginTop: 2 }}>{depot.commune}</Text>
                )}
              </View>
              <View style={[s.stockBadge, { backgroundColor: stockCount > 0 ? '#E8F5EE' : '#FFEBEB' }]}>
                <View style={[s.stockDot, { backgroundColor: stockCount > 0 ? '#0A8C52' : '#E24B4A' }]} />
                <Text style={[s.stockTxt, { color: stockCount > 0 ? '#0A8C52' : '#E24B4A' }]}>
                  {stockCount > 0 ? 'Disponible' : 'Rupture'}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* TAB BAR */}
      <View style={[s.tabBar, { paddingBottom: insets.bottom || 10, height: TAB_HEIGHT }]}>
        {TABS.map((tab, i) => {
          const isActive = activeTab === i;
          return (
            <TouchableOpacity key={i} style={s.tab} activeOpacity={0.7}
              onPress={() => {
                if (i === 1) setShowHistorique(true);
                else if (i === 2) {
                  if (lastOrderId) {
                    setShowTracking(true);
                  } else {
                    setShowHistorique(true); // redirige vers historique
                  }
                }
                else if (i === 3) setShowProfil(true);
                else setActiveTab(i);
              }}
            >
              <View style={[s.tabIconWrap, isActive && s.tabIconWrapActive]}>
                <Ionicons name={(isActive ? tab.iconActive : tab.icon) as any} size={22} color={isActive ? '#0A8C52' : '#B4B2A9'} />
              </View>
              <Text style={[s.tabLbl, isActive && s.tabLblActive]}>{tab.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* MODALS */}
      <Modal visible={showCatalogue} animationType="slide">
        <CatalogueScreen onClose={() => setShowCatalogue(false)} />
      </Modal>

      {selectedStock && selectedDepot && (
        <Modal visible={showOrder} animationType="slide" statusBarTranslucent>
          <OrderScreen
            bottle={{
              id:    selectedStock.product.id,
              brand: selectedStock.product.name,
              kg:    parseFloat(selectedStock.product.weightKg),
              price: selectedStock.product.priceFcfa,
              color: selectedColor,
              image: { uri: selectedStock.product.imageUrl },
            }}
            depotId={selectedDepot.id}
            onClose={() => setShowOrder(false)}
            onSuccess={(orderId: string) => {
              setShowOrder(false);
              setActiveOrder(true);
              setLastOrderId(orderId);
            }}
          />
        </Modal>
      )}

      <Modal visible={showHistorique} animationType="slide">
        <HistoriqueScreen onClose={() => setShowHistorique(false)} />
      </Modal>

      <Modal visible={showTracking} animationType="slide">
        <TrackingScreen
          orderId={lastOrderId}
          onClose={() => setShowTracking(false)}
        />
      </Modal>

      <Modal visible={showProfil} animationType="slide">
        <ProfilScreen onClose={() => setShowProfil(false)} />
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: '#F5F4F0' },
  scroll: { flex: 1 },
  content:{ paddingHorizontal: 16 },

  header:  { backgroundColor: '#0D1F14', paddingHorizontal: 20, paddingBottom: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  locPill: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', borderRadius: 20, paddingVertical: 6, paddingHorizontal: 12 },
  locZone: { fontSize: 12, color: '#9FE1CB', fontWeight: '600', marginHorizontal: 3 },

  searchWrap:        { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', marginTop: 14, marginBottom: 12, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, gap: 10, ...shadows.sm },
  searchPlaceholder: { fontSize: 13, color: '#B4B2A9', flex: 1 },

  promoBanner:  { borderRadius: 16, padding: 18, flexDirection: 'row', alignItems: 'center', marginBottom: 20, overflow: 'hidden', minHeight: 110 },
  promoContent: { flex: 1 },
  promoTitle:   { fontSize: 16, fontWeight: '800', color: '#fff', marginBottom: 4 },
  promoSub:     { fontSize: 11, color: 'rgba(255,255,255,0.75)', marginBottom: 10, lineHeight: 16 },
  promoCta:     { backgroundColor: '#F5A623', alignSelf: 'flex-start', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6 },
  promoCtaTxt:  { fontSize: 11, fontWeight: '700', color: '#0D1F14' },
  promoEmoji:   { fontSize: 52, marginLeft: 8 },
  promoDots:    { position: 'absolute', bottom: 10, right: 14, flexDirection: 'row', gap: 4 },
  dot:          { width: 5, height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.3)' },
  dotActive:    { backgroundColor: '#F5A623', width: 16 },

  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle:  { fontSize: 16, fontWeight: '700', color: '#0D1F14' },
  seeAll:        { fontSize: 12, color: '#0A8C52', fontWeight: '600' },

  bottlesScroll:   { gap: 12, paddingRight: 4, marginBottom: 16, alignItems: 'flex-start' },
  bottleCard:      { width: 145, backgroundColor: '#fff', borderRadius: 16, padding: 14, borderWidth: 2, borderColor: 'transparent', position: 'relative', ...shadows.sm },
  bottleCardOther: { opacity: 0.9 },
  bottleCheck:     { position: 'absolute', top: 10, right: 10, width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', zIndex: 1 },
  bottleImgWrap:   { height: 120, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  bottleImg:       { width: 90, height: 115 },
  bottleBrand:     { fontSize: 11, fontWeight: '700', letterSpacing: 0.3, marginBottom: 2 },
  bottleKg:        { fontSize: 26, fontWeight: '800', color: '#0D1F14', lineHeight: 28 },
  bottleDesc:      { fontSize: 10, color: '#B4B2A9', marginTop: 2, marginBottom: 6 },
  bottlePrice:     { fontSize: 13, fontWeight: '700', color: '#888780' },
  stockBadgeSmall: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  stockDotSmall:   { width: 5, height: 5, borderRadius: 3 },
  stockTxtSmall:   { fontSize: 9, color: '#888780' },

  stationBadge:    { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 3, marginBottom: 6 },
  stationBadgeLogo:{ width: 14, height: 14, borderRadius: 3 },
  stationBadgeTxt: { fontSize: 9, fontWeight: '700', flex: 1 },

  arrowSep:  { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6, gap: 4, alignSelf: 'stretch' },
  arrowLine: { flex: 1, width: 1, backgroundColor: '#E8E6DF' },

  quickOrder: { backgroundColor: '#0D1F14', borderRadius: 18, padding: 18, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
  qoLeft:     { flex: 1 },
  qoLabel:    { fontSize: 9, color: 'rgba(255,255,255,0.35)', letterSpacing: 1.5, marginBottom: 4 },
  qoName:     { fontSize: 16, fontWeight: '800', color: '#fff', marginBottom: 6 },
  qoDetails:  { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  qoPrice:    { fontSize: 15, fontWeight: '700' },
  qoDivider:  { width: 1, height: 14, backgroundColor: 'rgba(255,255,255,0.2)' },
  qoDelivery: { fontSize: 11, color: 'rgba(255,255,255,0.5)' },
  qoMeta:     { flexDirection: 'row', gap: 8 },
  qoMetaChip: { backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  qoMetaTxt:  { fontSize: 10, color: 'rgba(255,255,255,0.6)' },
  qoBtn:      { backgroundColor: '#F5A623', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, alignItems: 'center' },
  qoBtnTxt:   { fontSize: 13, fontWeight: '800', color: '#0D1F14' },
  qoBtnArrow: { fontSize: 18, color: '#0D1F14', marginTop: 2 },

  trackCard:    { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 4, ...shadows.sm },
  trackTop:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  trackLeft2:   { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  pulseWrap:    { width: 20, height: 20, alignItems: 'center', justifyContent: 'center' },
  pulseRing:    { position: 'absolute', width: 20, height: 20, borderRadius: 10, backgroundColor: '#0A8C52' },
  pulseDot:     { width: 10, height: 10, borderRadius: 5, backgroundColor: '#0A8C52' },
  trackStatus:  { fontSize: 15, fontWeight: '700', color: '#0D1F14' },
  trackSubTxt:  { fontSize: 11, color: '#888780', marginTop: 1 },
  etaBadge:     { backgroundColor: '#E8F5EE', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8, alignItems: 'center', gap: 2 },
  etaUnit:      { fontSize: 10, color: '#0A8C52', fontWeight: '600' },
  stepsRow:     { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  step:         { alignItems: 'center', gap: 4, flex: 1 },
  stepDot:      { width: 22, height: 22, borderRadius: 11, backgroundColor: '#F5F4F0', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#E8E6DF' },
  stepDotDone:  { backgroundColor: '#0A8C52', borderColor: '#0A8C52' },
  stepDotActive:{ backgroundColor: '#F5A623', borderColor: '#F5A623' },
  stepLbl:      { fontSize: 9, color: '#B4B2A9', textAlign: 'center' },
  stepLblDone:  { color: '#0A8C52' },
  progressBar:  { height: 3, backgroundColor: '#F5F4F0', borderRadius: 2 },
  progressFill: { height: 3, width: '50%', backgroundColor: '#0A8C52', borderRadius: 2 },

  stationCard:    { backgroundColor: '#fff', borderRadius: 14, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8, borderWidth: 1, borderColor: '#E8E6DF', ...shadows.sm },
  stationLogoWrap:{ width: 52, height: 52, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F5F5F5', padding: 4 },
  stationLogoImg: { width: 44, height: 44 },
  stationInfo:    { flex: 1 },
  stationName:    { fontSize: 13, fontWeight: '700', color: '#0D1F14' },
  stationMeta:    { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  stationMetaTxt: { fontSize: 11, color: '#888780' },
  stockBadge:     { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 4 },
  stockDot:       { width: 6, height: 6, borderRadius: 3 },
  stockTxt:       { fontSize: 10, fontWeight: '600' },

  tabBar:           { backgroundColor: '#fff', borderTopWidth: 0.5, borderTopColor: '#E8E6DF', flexDirection: 'row', paddingTop: 8, ...shadows.md },
  tab:              { flex: 1, alignItems: 'center', gap: 3 },
  tabIconWrap:      { width: 44, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  tabIconWrapActive:{ backgroundColor: '#E8F5EE' },
  tabLbl:           { fontSize: 10, color: '#B4B2A9' },
  tabLblActive:     { color: '#0A8C52', fontWeight: '700' },
});