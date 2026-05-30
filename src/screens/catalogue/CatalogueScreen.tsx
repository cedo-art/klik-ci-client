import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Image, Modal, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { shadows } from '../../constants/theme';
import OrderScreen from '../orders/OrderScreen';
import { catalogService } from '../../services/api';

const BACKOFFICE_URL = 'http://10.254.90.96:4000';

interface CatalogueScreenProps {
  onClose: () => void;
}

const getBrandColor = (name: string) => {
  const n = (name || '').toLowerCase();
  if (n.includes('total')) return '#E85200';
  if (n.includes('oryx'))  return '#0055A4';
  if (n.includes('shell')) return '#DD1D21';
  if (n.includes('simam')) return '#E8A000';
  return '#0A8C52';
};

const getBrandBg = (name: string) => {
  const n = (name || '').toLowerCase();
  if (n.includes('total')) return '#FFF3EB';
  if (n.includes('oryx'))  return '#EBF2FF';
  if (n.includes('shell')) return '#FFEBEB';
  if (n.includes('simam')) return '#FFFBEB';
  return '#E8F5EE';
};

export default function CatalogueScreen({ onClose }: CatalogueScreenProps) {
  const insets = useSafeAreaInsets();
  const [showOrder, setShowOrder]         = useState(false);
  const [orderData, setOrderData]         = useState<any>(null);
  const [loading, setLoading]             = useState(true);
  const [depots, setDepots]               = useState<any[]>([]);
  const [allStocks, setAllStocks]         = useState<any[]>([]);
  const [selectedDepotId, setSelectedDepotId] = useState<string | null>(null);

  useEffect(() => { loadData(); }, []);

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
      if (depotsData.length > 0) setSelectedDepotId(depotsData[0].id);
    } catch {}
    finally { setLoading(false); }
  };

  const filteredStocks = selectedDepotId
    ? allStocks.filter(s => s.depot.id === selectedDepotId)
    : allStocks;

  const byEnsigne: Record<string, any[]> = {};
  filteredStocks.forEach(stock => {
    const brand = stock.product.name.split(' ')[0];
    if (!byEnsigne[brand]) byEnsigne[brand] = [];
    byEnsigne[brand].push(stock);
  });

  const handleCommander = (stock: any) => {
    const color = getBrandColor(stock.product.name);
    setOrderData({
      bottle: {
        id:    stock.product.id,
        brand: stock.product.name,
        kg:    parseFloat(stock.product.weightKg),
        price: stock.product.priceFcfa,
        color,
        image: { uri: stock.product.imageUrl },
      },
      depotId: stock.depot.id,
    });
    setShowOrder(true);
  };

  // Logo enseigne depuis back-office
  const getDepotLogo = (depot: any) =>
    depot?.logoUrl ? { uri: `${BACKOFFICE_URL}${depot.logoUrl}` } : null;

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>

      {/* HEADER */}
      <View style={s.header}>
        <TouchableOpacity onPress={onClose} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Nos bouteilles</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* FILTRE STATIONS */}
      <View style={s.filtersWrap}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filters}>
          <TouchableOpacity
            style={[s.filterChip, !selectedDepotId && s.filterChipActive]}
            onPress={() => setSelectedDepotId(null)}
          >
            <Text style={[s.filterTxt, !selectedDepotId && s.filterTxtActive]}>Toutes</Text>
          </TouchableOpacity>
          {depots.map(depot => {
            const isActive = selectedDepotId === depot.id;
            const color    = getBrandColor(depot.name);
            const logo     = getDepotLogo(depot);
            return (
              <TouchableOpacity
                key={depot.id}
                style={[s.filterChip, isActive && { backgroundColor: color, borderColor: color }]}
                onPress={() => setSelectedDepotId(isActive ? null : depot.id)}
              >
                {/* Logo enseigne depuis back-office */}
                {logo && (
                  <Image source={logo} style={s.filterLogo} resizeMode="contain" />
                )}
                <Text style={[s.filterTxt, isActive && { color: '#fff', fontWeight: '700' }]}>
                  {depot.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color="#0A8C52" size="large" />
          <Text style={{ color: '#888', marginTop: 12, fontSize: 13 }}>Chargement du catalogue…</Text>
        </View>
      ) : (
        <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

          {Object.keys(byEnsigne).length === 0 ? (
            <View style={{ alignItems: 'center', padding: 40 }}>
              <Text style={{ fontSize: 40 }}>😔</Text>
              <Text style={{ fontSize: 15, fontWeight: '700', color: '#0D1F14', marginTop: 12 }}>Aucun produit disponible</Text>
              <Text style={{ fontSize: 13, color: '#888', marginTop: 6 }}>Essayez une autre station</Text>
            </View>
          ) : (
            Object.entries(byEnsigne).map(([brand, stocks]) => {
              const firstStock = stocks[0];
              const color      = getBrandColor(firstStock.product.name);
              const bg         = getBrandBg(firstStock.product.name);
              const depotLogo  = getDepotLogo(firstStock.depot);
              return (
                <View key={brand} style={s.brandSection}>

                  {/* En-tête enseigne avec logo depuis back-office */}
                  <View style={[s.brandHeader, { backgroundColor: bg, borderLeftColor: color }]}>
                    <View style={s.brandImgWrap}>
                      {depotLogo ? (
                        <Image source={depotLogo} style={s.brandImg} resizeMode="contain" />
                      ) : (
                        <Image source={{ uri: firstStock.product.imageUrl }} style={s.brandImg} resizeMode="contain" />
                      )}
                    </View>
                    <View style={s.brandInfo}>
                      <Text style={[s.brandName, { color }]}>{brand}</Text>
                      <Text style={s.brandDepot}>{firstStock.depot.name}</Text>
                      <Text style={s.brandDesc}>{firstStock.depot.address}</Text>
                    </View>
                    <View style={[s.brandBadge, { backgroundColor: color }]}>
                      <Text style={s.brandBadgeTxt}>{stocks.length} ref.</Text>
                    </View>
                  </View>

                  {/* Produits */}
                  {stocks.map((stock) => {
                    const kg = parseFloat(stock.product.weightKg);
                    return (
                      <View key={stock.id} style={s.bottleRow}>
                        <View style={s.bottleLeft}>
                          <View style={[s.kgBadge, { backgroundColor: bg }]}>
                            <Image source={{ uri: stock.product.imageUrl }} style={s.kgImg} resizeMode="contain" />
                          </View>
                          <View style={s.bottleInfo}>
                            <Text style={s.bottleName}>{stock.product.name}</Text>
                            <Text style={s.bottleDesc2}>{kg} kg · {stock.quantity} en stock</Text>
                            <Text style={[s.bottlePrice, { color }]}>{stock.product.priceFcfa.toLocaleString()} FCFA</Text>
                            <Text style={s.bottleDelivery}>+ frais livraison · ~30 min</Text>
                          </View>
                        </View>
                        <TouchableOpacity
                          style={[s.orderBtn, { backgroundColor: color }]}
                          onPress={() => handleCommander(stock)}
                          activeOpacity={0.85}
                        >
                          <Text style={s.orderBtnTxt}>Commander</Text>
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                </View>
              );
            })
          )}

          {/* Info livraison */}
          <View style={s.infoCard}>
            <View style={s.infoRow}>
              <Ionicons name="bicycle" size={18} color="#0A8C52" />
              <Text style={s.infoTxt}>Livraison express en 30 min par tricycle Klik</Text>
            </View>
            <View style={s.infoRow}>
              <Ionicons name="location" size={18} color="#0A8C52" />
              <Text style={s.infoTxt}>Zones : Cocody · Plateau · Marcory</Text>
            </View>
            <View style={s.infoRow}>
              <Ionicons name="shield-checkmark" size={18} color="#0A8C52" />
              <Text style={s.infoTxt}>Bouteilles contrôlées et certifiées</Text>
            </View>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      {/* MODAL COMMANDER */}
      {orderData && (
        <Modal visible={showOrder} animationType="slide" statusBarTranslucent>
          <OrderScreen
            bottle={orderData.bottle}
            depotId={orderData.depotId}
            onClose={() => setShowOrder(false)}
            onSuccess={() => { setShowOrder(false); onClose(); }}
          />
        </Modal>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root:    { flex: 1, backgroundColor: '#F5F4F0' },
  scroll:  { flex: 1 },
  content: { padding: 16 },

  header:      { backgroundColor: '#0D1F14', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14 },
  backBtn:     { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#fff' },

  filtersWrap:      { backgroundColor: '#fff', borderBottomWidth: 0.5, borderBottomColor: '#E8E6DF' },
  filters:          { paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  filterChip:       { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: '#F5F4F0', borderWidth: 1.5, borderColor: '#E8E6DF' },
  filterChipActive: { backgroundColor: '#0D1F14', borderColor: '#0D1F14' },
  filterLogo:       { width: 20, height: 20, borderRadius: 4 },
  filterTxt:        { fontSize: 13, color: '#888780', fontWeight: '500' },
  filterTxtActive:  { color: '#fff', fontWeight: '700' },

  brandSection: { marginBottom: 16 },
  brandHeader:  { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 14, borderLeftWidth: 4, marginBottom: 8, ...shadows.sm },
  brandImgWrap: { width: 56, height: 65, alignItems: 'center', justifyContent: 'center' },
  brandImg:     { width: 52, height: 62 },
  brandInfo:    { flex: 1 },
  brandName:    { fontSize: 18, fontWeight: '800', letterSpacing: -0.5 },
  brandDepot:   { fontSize: 12, color: '#0D1F14', fontWeight: '600', marginTop: 2 },
  brandDesc:    { fontSize: 11, color: '#888780', marginTop: 1 },
  brandBadge:   { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4 },
  brandBadgeTxt:{ fontSize: 10, fontWeight: '700', color: '#fff' },

  bottleRow:     { backgroundColor: '#fff', borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, ...shadows.sm },
  bottleLeft:    { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  kgBadge:       { width: 56, height: 65, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  kgImg:         { width: 48, height: 58 },
  bottleInfo:    { flex: 1 },
  bottleName:    { fontSize: 13, fontWeight: '700', color: '#0D1F14' },
  bottleDesc2:   { fontSize: 11, color: '#888780', marginTop: 2 },
  bottlePrice:   { fontSize: 16, fontWeight: '800', marginTop: 4 },
  bottleDelivery:{ fontSize: 10, color: '#B4B2A9', marginTop: 2 },
  orderBtn:      { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10 },
  orderBtnTxt:   { fontSize: 13, fontWeight: '700', color: '#fff' },

  infoCard: { backgroundColor: '#E8F5EE', borderRadius: 14, padding: 14, gap: 10, marginTop: 8 },
  infoRow:  { flexDirection: 'row', alignItems: 'center', gap: 10 },
  infoTxt:  { fontSize: 13, color: '#065C35', flex: 1 },
});