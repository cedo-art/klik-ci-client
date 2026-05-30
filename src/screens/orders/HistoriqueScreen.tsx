import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, RefreshControl,
  Image, Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { shadows } from '../../constants/theme';
import { ordersService, deliveryService } from '../../services/api';
import TrackingScreen from '../tracking/TrackingScreen';

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  pending:   { label: 'En attente', color: '#E8A000', bg: '#FFFBEB', icon: 'time' },
  confirmed: { label: 'Confirmée',  color: '#1565C0', bg: '#EBF2FF', icon: 'checkmark-circle' },
  preparing: { label: 'En prépa.',  color: '#7B3FA0', bg: '#F5EBFF', icon: 'construct' },
  picked_up: { label: 'En route',   color: '#0A8C52', bg: '#E8F5EE', icon: 'bicycle' },
  en_route:  { label: 'En route',   color: '#0A8C52', bg: '#E8F5EE', icon: 'bicycle' },
  delivered: { label: 'Livré',      color: '#0A8C52', bg: '#E8F5EE', icon: 'checkmark-done-circle' },
  cancelled: { label: 'Annulée',    color: '#E24B4A', bg: '#FFEBEB', icon: 'close-circle' },
};

const TYPE_CONFIG: Record<string, { label: string; icon: string; color: string }> = {
  standard: { label: 'Standard', icon: 'time-outline',    color: '#888780' },
  rapide:   { label: 'Rapide',   icon: 'flash',           color: '#0A8C52' },
  express:  { label: 'Express',  icon: 'rocket',          color: '#E85200' },
};

const formatDate = (dateStr: string) => {
  const d = new Date(dateStr);
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

interface Props { onClose: () => void; }

export default function HistoriqueScreen({ onClose }: Props) {
  const insets = useSafeAreaInsets();

  const [orders, setOrders]           = useState<any[]>([]);
  const [loading, setLoading]         = useState(true);
  const [refreshing, setRefreshing]   = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');

  // Modal récap livraison
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [deliveryInfo, setDeliveryInfo]   = useState<any>(null);
  const [loadingDelivery, setLoadingDelivery] = useState(false);
  const [showRecap, setShowRecap]         = useState(false);

  // TrackingScreen pour commandes en cours
  const [showTracking, setShowTracking]   = useState(false);
  const [trackingOrderId, setTrackingOrderId] = useState<string | null>(null);
  const [trackingMode, setTrackingMode]   = useState<'standard' | 'rapide' | 'express'>('rapide');

  const FILTERS = [
    { id: 'all',       label: 'Toutes' },
    { id: 'delivered', label: 'Livrées' },
    { id: 'active',    label: 'En cours' },
    { id: 'cancelled', label: 'Annulées' },
  ];

  useEffect(() => { loadOrders(); }, []);

  const loadOrders = async () => {
    try {
      const res = await ordersService.getMyOrders();
      setOrders(res.data);
    } catch { setOrders([]); }
    finally { setLoading(false); setRefreshing(false); }
  };

  const onRefresh = () => { setRefreshing(true); loadOrders(); };

  const isActive = (status: string) =>
    ['pending', 'confirmed', 'preparing', 'picked_up', 'en_route'].includes(status);

  const filteredOrders = orders.filter(o => {
    if (activeFilter === 'all')       return true;
    if (activeFilter === 'delivered') return o.status === 'delivered';
    if (activeFilter === 'active')    return isActive(o.status);
    if (activeFilter === 'cancelled') return o.status === 'cancelled';
    return true;
  });

  const handleOrderPress = async (order: any) => {
    if (isActive(order.status)) {
      // Ouvrir TrackingScreen
      setTrackingOrderId(order.id);
      setTrackingMode(order.type as any || 'rapide');
      setShowTracking(true);
    } else if (order.status === 'delivered') {
      // Ouvrir récap
      setSelectedOrder(order);
      setLoadingDelivery(true);
      setShowRecap(true);
      try {
        const res = await deliveryService.getOrderDelivery(order.id);
        setDeliveryInfo(res.data);
      } catch { setDeliveryInfo(null); }
      finally { setLoadingDelivery(false); }
    }
  };

  // ── TrackingScreen modal ──────────────────────────────────────────────────
  if (showTracking) {
    return (
      <TrackingScreen
        orderId={trackingOrderId}
        modeLivraison={trackingMode}
        onClose={() => setShowTracking(false)}
      />
    );
  }

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      {/* HEADER */}
      <View style={s.header}>
        <TouchableOpacity onPress={onClose} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Mes commandes</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* FILTRES */}
      <View style={s.filtersWrap}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filters}>
          {FILTERS.map(f => (
            <TouchableOpacity
              key={f.id}
              style={[s.filterChip, activeFilter === f.id && s.filterChipActive]}
              onPress={() => setActiveFilter(f.id)}
            >
              <Text style={[s.filterTxt, activeFilter === f.id && s.filterTxtActive]}>{f.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {loading ? (
        <View style={s.loader}><ActivityIndicator size="large" color="#0A8C52" /></View>
      ) : (
        <ScrollView
          style={s.scroll}
          contentContainerStyle={s.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0A8C52']} />}
          showsVerticalScrollIndicator={false}
        >
          {filteredOrders.length === 0 ? (
            <View style={s.empty}>
              <Text style={s.emptyIcon}>📦</Text>
              <Text style={s.emptyTitle}>Aucune commande</Text>
              <Text style={s.emptySub}>Vos commandes apparaîtront ici</Text>
            </View>
          ) : (
            filteredOrders.map((order) => {
              const status    = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
              const typeConf  = TYPE_CONFIG[order.type]    || TYPE_CONFIG.rapide;
              const firstItem = order.items?.[0];
              const active    = isActive(order.status);

              return (
                <TouchableOpacity
                  key={order.id}
                  style={[s.orderCard, active && s.orderCardActive]}
                  activeOpacity={0.85}
                  onPress={() => handleOrderPress(order)}
                >
                  {/* Image produit */}
                  <View style={s.orderImgWrap}>
                    {firstItem?.product?.imageUrl ? (
                      <Image source={{ uri: firstItem.product.imageUrl }} style={s.orderImg} resizeMode="contain" />
                    ) : (
                      <Text style={{ fontSize: 36 }}>🔥</Text>
                    )}
                  </View>

                  {/* Infos */}
                  <View style={s.orderInfo}>
                    <View style={s.orderTop}>
                      <Text style={s.orderTitle} numberOfLines={1}>
                        {firstItem?.product?.name || 'Bouteille de gaz'}
                      </Text>
                      <View style={[s.statusBadge, { backgroundColor: status.bg }]}>
                        <Ionicons name={status.icon as any} size={12} color={status.color} />
                        <Text style={[s.statusTxt, { color: status.color }]}>{status.label}</Text>
                      </View>
                    </View>

                    <Text style={s.orderDate}>{formatDate(order.createdAt)}</Text>

                    <View style={s.orderBottom}>
                      <Text style={s.orderTotal}>{order.totalFcfa?.toLocaleString()} FCFA</Text>
                      <View style={[s.typeBadge, { backgroundColor: `${typeConf.color}15` }]}>
                        <Ionicons name={typeConf.icon as any} size={11} color={typeConf.color} />
                        <Text style={[s.typeTxt, { color: typeConf.color }]}>{typeConf.label}</Text>
                      </View>
                    </View>

                    {/* Indication action */}
                    {active && (
                      <View style={s.followHint}>
                        <Ionicons name="location" size={11} color="#0A8C52" />
                        <Text style={s.followHintTxt}>Appuyer pour suivre</Text>
                      </View>
                    )}
                  </View>

                  <Ionicons
                    name={active ? 'chevron-forward' : 'chevron-forward'}
                    size={18}
                    color="#B4B2A9"
                  />
                </TouchableOpacity>
              );
            })
          )}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      {/* MODAL RÉCAP LIVRAISON */}
      <Modal visible={showRecap} animationType="slide" transparent>
        <View style={s.recapOverlay}>
          <View style={[s.recapCard, { paddingBottom: insets.bottom + 20 }]}>
            {/* Header récap */}
            <View style={s.recapHeader}>
              <View style={s.recapCheck}>
                <Ionicons name="checkmark-circle" size={32} color="#0A8C52" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.recapTitle}>Livraison confirmée ✓</Text>
                <Text style={s.recapSub}>
                  {selectedOrder ? formatDate(selectedOrder.updatedAt) : ''}
                </Text>
              </View>
              <TouchableOpacity onPress={() => { setShowRecap(false); setDeliveryInfo(null); }}>
                <Ionicons name="close" size={24} color="#888" />
              </TouchableOpacity>
            </View>

            {loadingDelivery ? (
              <View style={{ padding: 30, alignItems: 'center' }}>
                <ActivityIndicator color="#0A8C52" />
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Produit */}
                <View style={s.recapSection}>
                  <Text style={s.recapSectionTitle}>Produit</Text>
                  {selectedOrder?.items?.map((item: any) => (
                    <View key={item.id} style={s.recapRow}>
                      {item.product?.imageUrl && (
                        <Image source={{ uri: item.product.imageUrl }} style={s.recapProductImg} resizeMode="contain" />
                      )}
                      <View style={{ flex: 1 }}>
                        <Text style={s.recapProductName}>{item.product?.name}</Text>
                        <Text style={s.recapProductSub}>{item.quantity} × {item.unitPriceFcfa?.toLocaleString()} FCFA</Text>
                      </View>
                      <Text style={s.recapProductPrice}>
                        {((item.unitPriceFcfa || 0) * item.quantity).toLocaleString()} F
                      </Text>
                    </View>
                  ))}
                </View>

                {/* Station */}
                <View style={s.recapSection}>
                  <Text style={s.recapSectionTitle}>Station</Text>
                  <View style={s.recapInfoRow}>
                    <Ionicons name="business" size={16} color="#0A8C52" />
                    <Text style={s.recapInfoTxt}>{selectedOrder?.depot?.name || '—'}</Text>
                  </View>
                  <View style={s.recapInfoRow}>
                    <Ionicons name="location" size={16} color="#888" />
                    <Text style={s.recapInfoTxt}>{selectedOrder?.depot?.address || '—'}</Text>
                  </View>
                </View>

                {/* Adresse livraison */}
                <View style={s.recapSection}>
                  <Text style={s.recapSectionTitle}>Livré à</Text>
                  <View style={s.recapInfoRow}>
                    <Ionicons name="home" size={16} color="#0A8C52" />
                    <Text style={s.recapInfoTxt}>
                      {selectedOrder?.deliveryAddress?.fullAddress || '—'}
                    </Text>
                  </View>
                </View>

                {/* Livreur */}
                {deliveryInfo?.driver && (
                  <View style={s.recapSection}>
                    <Text style={s.recapSectionTitle}>Livreur</Text>
                    <View style={s.recapDriverRow}>
                      <View style={s.recapDriverAvatar}>
                        <Text style={{ fontSize: 20 }}>👨🏿</Text>
                      </View>
                      <View>
                        <Text style={s.recapDriverName}>
                          {deliveryInfo.driver.fullName || deliveryInfo.driver.phone}
                        </Text>
                        <Text style={s.recapDriverSub}>
                          🛺 {deliveryInfo.driver.tricyclePlate || '—'} · Klik Livreur certifié
                        </Text>
                      </View>
                    </View>
                  </View>
                )}

                {/* Total */}
                <View style={s.recapTotal}>
                  <View style={s.recapTotalRow}>
                    <Text style={s.recapTotalLabel}>Produits</Text>
                    <Text style={s.recapTotalVal}>
                      {((selectedOrder?.totalFcfa || 0) - (selectedOrder?.deliveryFeeFcfa || 0)).toLocaleString()} F
                    </Text>
                  </View>
                  <View style={s.recapTotalRow}>
                    <Text style={s.recapTotalLabel}>Livraison</Text>
                    <Text style={s.recapTotalVal}>{selectedOrder?.deliveryFeeFcfa?.toLocaleString()} F</Text>
                  </View>
                  <View style={[s.recapTotalRow, { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#E8E6DF' }]}>
                    <Text style={[s.recapTotalLabel, { fontWeight: '800', color: '#0D1F14' }]}>Total</Text>
                    <Text style={[s.recapTotalVal, { fontWeight: '800', color: '#0A8C52', fontSize: 17 }]}>
                      {selectedOrder?.totalFcfa?.toLocaleString()} FCFA
                    </Text>
                  </View>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: '#F5F4F0' },
  scroll: { flex: 1 },
  content:{ paddingHorizontal: 16, paddingTop: 8 },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  header:      { backgroundColor: '#0D1F14', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14 },
  backBtn:     { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#fff' },

  filtersWrap: { backgroundColor: '#fff', borderBottomWidth: 0.5, borderBottomColor: '#E8E6DF' },
  filters:     { paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  filterChip:  { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 20, backgroundColor: '#F5F4F0', borderWidth: 1, borderColor: '#E8E6DF' },
  filterChipActive: { backgroundColor: '#0A8C52', borderColor: '#0A8C52' },
  filterTxt:   { fontSize: 13, color: '#888780', fontWeight: '500' },
  filterTxtActive: { color: '#fff', fontWeight: '700' },

  empty:      { alignItems: 'center', paddingTop: 80, gap: 10 },
  emptyIcon:  { fontSize: 56 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#0D1F14' },
  emptySub:   { fontSize: 14, color: '#B4B2A9' },

  orderCard:       { backgroundColor: '#fff', borderRadius: 16, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10, ...shadows.sm },
  orderCardActive: { borderWidth: 1.5, borderColor: '#0A8C52' },
  orderImgWrap:    { width: 60, height: 72, alignItems: 'center', justifyContent: 'center' },
  orderImg:        { width: 52, height: 68 },
  orderInfo:       { flex: 1, gap: 4 },
  orderTop:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  orderTitle:      { fontSize: 14, fontWeight: '700', color: '#0D1F14', flex: 1 },
  statusBadge:     { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  statusTxt:       { fontSize: 10, fontWeight: '600' },
  orderDate:       { fontSize: 11, color: '#B4B2A9' },
  orderBottom:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  orderTotal:      { fontSize: 15, fontWeight: '800', color: '#0D1F14' },
  typeBadge:       { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  typeTxt:         { fontSize: 10, fontWeight: '600' },
  followHint:      { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  followHintTxt:   { fontSize: 10, color: '#0A8C52', fontWeight: '600' },

  // Récap modal
  recapOverlay:  { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  recapCard:     { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '90%' },
  recapHeader:   { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
  recapCheck:    { width: 48, height: 48, borderRadius: 24, backgroundColor: '#E8F5EE', alignItems: 'center', justifyContent: 'center' },
  recapTitle:    { fontSize: 16, fontWeight: '800', color: '#0D1F14' },
  recapSub:      { fontSize: 11, color: '#888780', marginTop: 2 },

  recapSection:      { marginBottom: 16 },
  recapSectionTitle: { fontSize: 11, fontWeight: '700', color: '#888780', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 },
  recapRow:          { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  recapProductImg:   { width: 40, height: 50 },
  recapProductName:  { fontSize: 14, fontWeight: '700', color: '#0D1F14' },
  recapProductSub:   { fontSize: 11, color: '#888780', marginTop: 2 },
  recapProductPrice: { fontSize: 14, fontWeight: '700', color: '#0A8C52' },
  recapInfoRow:      { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 6 },
  recapInfoTxt:      { fontSize: 13, color: '#0D1F14', flex: 1 },
  recapDriverRow:    { flexDirection: 'row', alignItems: 'center', gap: 10 },
  recapDriverAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#E8E6DF', alignItems: 'center', justifyContent: 'center' },
  recapDriverName:   { fontSize: 14, fontWeight: '700', color: '#0D1F14' },
  recapDriverSub:    { fontSize: 11, color: '#888780', marginTop: 2 },

  recapTotal:    { backgroundColor: '#F5F4F0', borderRadius: 14, padding: 14, marginBottom: 8 },
  recapTotalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  recapTotalLabel:{ fontSize: 13, color: '#888780' },
  recapTotalVal:  { fontSize: 13, fontWeight: '600', color: '#0D1F14' },
});