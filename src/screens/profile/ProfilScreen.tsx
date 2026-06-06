import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator,
  TextInput, Modal, Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { shadows } from '../../constants/theme';
import { useAuth } from '../../hooks/useAuth';
import { usersService } from '../../services/api';

interface ProfilScreenProps {
  onClose: () => void;
}

interface Address {
  id: string;
  label: string;
  fullAddress: string;
  commune: string;
  isDefault: boolean;
  latitude?: number;
  longitude?: number;
}

const COMMUNES = ['Cocody', 'Plateau', 'Marcory', 'Yopougon', 'Abobo', 'Adjamé'];
const LABELS = ['Domicile', 'Bureau', 'Autre'];

const SOS_TYPES = [
  { id: 'incendie',    label: 'Incendie / Explosion gaz', icon: 'flame',         color: '#E24B4A', tel: '180', desc: 'Pompiers — Sapeurs-pompiers CI' },
  { id: 'police',      label: 'Vol / Agression',          icon: 'shield-outline', color: '#7B3FA0', tel: '110', desc: 'Police secours' },
  { id: 'samu',        label: 'Urgence médicale',         icon: 'medical',        color: '#1565C0', tel: '185', desc: 'SAMU — Urgences médicales' },
  { id: 'gendarmerie', label: 'Gendarmerie',              icon: 'car-sport',      color: '#E8A000', tel: '170', desc: 'Gendarmerie nationale CI' },
];

export default function ProfilScreen({ onClose }: ProfilScreenProps) {
  const { user, logout } = useAuth();
  const insets = useSafeAreaInsets();
  const [addresses, setAddresses]           = useState<Address[]>([]);
  const [loading, setLoading]               = useState(true);
  const [showAddAddress, setShowAddAddress] = useState(false);
  const [showSOS, setShowSOS]               = useState(false);
  const [locating, setLocating]             = useState(false);
  const [mapCoords, setMapCoords]           = useState<{ lat: number; lng: number } | null>(null);
  const [hasKlikPass]                       = useState(false);
  const [newAddress, setNewAddress]         = useState({ label: 'Domicile', fullAddress: '', commune: 'Cocody' });
  const [savingAddress, setSavingAddress]   = useState(false);

  useEffect(() => { loadAddresses(); }, []);

  const loadAddresses = async () => {
    try {
      const res = await usersService.getAddresses();
      setAddresses(res?.data ?? []);
    } catch {
      setAddresses([]);
    } finally {
      setLoading(false);
    }
  };

  const useCurrentLocation = async () => {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission refusée', 'Autorisez la localisation dans les paramètres');
        return;
      }
      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const geocode  = await Location.reverseGeocodeAsync({
        latitude:  location.coords.latitude,
        longitude: location.coords.longitude,
      });
      const place   = geocode[0];
      const address = `${place?.street || ''} ${place?.district || place?.subregion || ''}`.trim();
      const commune = place?.city || place?.subregion || 'Abidjan';
      setMapCoords({ lat: location.coords.latitude, lng: location.coords.longitude });
      setNewAddress(p => ({
        ...p,
        fullAddress: address || 'Position GPS détectée',
        commune: COMMUNES.includes(commune) ? commune : 'Cocody',
      }));
    } catch {
      Alert.alert('Erreur', 'Impossible de récupérer la position');
    } finally {
      setLocating(false);
    }
  };

  const handleAddAddress = async () => {
    if (!newAddress.fullAddress.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer une adresse');
      return;
    }
    setSavingAddress(true);
    try {
      await usersService.createAddress({
        ...newAddress,
        latitude:  mapCoords?.lat,
        longitude: mapCoords?.lng,
      });
      await loadAddresses();
      setShowAddAddress(false);
      setMapCoords(null);
      setNewAddress({ label: 'Domicile', fullAddress: '', commune: 'Cocody' });
    } catch {
      Alert.alert('Erreur', "Impossible d'ajouter l'adresse");
    } finally {
      setSavingAddress(false);
    }
  };

  const handleDeleteAddress = (id: string) => {
    Alert.alert('Supprimer', 'Voulez-vous vraiment supprimer cette adresse ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer', style: 'destructive',
        onPress: async () => {
          try { await usersService.deleteAddress(id); await loadAddresses(); }
          catch { Alert.alert('Erreur', 'Impossible de supprimer'); }
        },
      },
    ]);
  };

  const handleSOS = (type: typeof SOS_TYPES[0]) => {
    Alert.alert(
      `🚨 Appeler le ${type.label} ?`,
      `Vous allez appeler le ${type.tel} (${type.desc}).`,
      [
        { text: 'Annuler', style: 'cancel' },
        { text: `Appeler le ${type.tel}`, style: 'destructive', onPress: () => { setShowSOS(false); Linking.openURL(`tel:${type.tel}`); } },
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert('Déconnexion', 'Voulez-vous vraiment vous déconnecter ?', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Déconnexion', style: 'destructive', onPress: logout },
    ]);
  };

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>

      <View style={s.header}>
        <TouchableOpacity onPress={onClose} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Mon profil</Text>
        <TouchableOpacity style={s.sosHeaderBtn} onPress={() => setShowSOS(true)}>
          <Ionicons name="warning" size={16} color="#fff" />
          <Text style={s.sosHeaderTxt}>SOS</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

        <View style={s.profileCard}>
          <View style={s.avatar}>
            <Text style={s.avatarTxt}>{user?.phone?.slice(-2) || 'K'}</Text>
          </View>
          <View style={s.profileInfo}>
            <Text style={s.profileName}>{user?.fullName || 'Client Klik'}</Text>
            <Text style={s.profilePhone}>{user?.phone}</Text>
            <View style={s.verifiedBadge}>
              <Ionicons name="checkmark-circle" size={14} color="#0A8C52" />
              <Text style={s.verifiedTxt}>Compte vérifié</Text>
            </View>
          </View>
          <TouchableOpacity style={s.editBtn}>
            <Ionicons name="pencil" size={18} color="#0A8C52" />
          </TouchableOpacity>
        </View>

        <View style={s.statsRow}>
          <View style={s.statCard}><Text style={s.statNum}>0</Text><Text style={s.statLbl}>Commandes</Text></View>
          <View style={s.statDivider} />
          <View style={s.statCard}><Text style={s.statNum}>0</Text><Text style={s.statLbl}>Portefeuille</Text></View>
          <View style={s.statDivider} />
          <View style={s.statCard}><Text style={s.statNum}>0</Text><Text style={s.statLbl}>Points</Text></View>
        </View>

        {hasKlikPass ? (
          <View style={s.klikpassActive}>
            <View style={s.klikpassLeft}>
              <View style={s.klikpassBadge}>
                <Ionicons name="flash" size={14} color="#fff" />
                <Text style={s.klikpassBadgeTxt}>KlikPass Actif</Text>
              </View>
              <Text style={s.klikpassRenewal}>Renouvellement le 20 juin 2026</Text>
              <Text style={s.klikpassCount}>12 livraisons ce mois</Text>
            </View>
            <Ionicons name="checkmark-circle" size={28} color="#0A8C52" />
          </View>
        ) : (
          <View style={s.klikpassBanner}>
            <View style={s.klikpassBannerTop}>
              <View style={s.klikpassIcon}><Ionicons name="flash" size={22} color="#F5A623" /></View>
              <View>
                <Text style={s.klikpassBannerTitle}>KlikPass</Text>
                <Text style={s.klikpassBannerPrice}>5 000 F/mois</Text>
              </View>
            </View>
            <View style={s.klikpassFeatures}>
              {['Livraisons illimitées au tarif Standard', 'Priorité sur les courses Express', 'Rappel stock automatique'].map((feat, i) => (
                <View key={i} style={s.klikpassFeatureRow}>
                  <Ionicons name="checkmark-circle" size={14} color="#9FE1CB" />
                  <Text style={s.klikpassFeatureTxt}>{feat}</Text>
                </View>
              ))}
            </View>
            <TouchableOpacity style={s.klikpassBtn} onPress={() => Alert.alert('KlikPass', 'Abonnement bientôt disponible !')}>
              <Text style={s.klikpassBtnTxt}>S'abonner — 5 000 F/mois</Text>
              <Ionicons name="arrow-forward" size={16} color="#0D1F14" />
            </TouchableOpacity>
          </View>
        )}

        <View style={s.section}>
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>Mes adresses</Text>
            <TouchableOpacity onPress={() => setShowAddAddress(true)} style={s.addBtn}>
              <Ionicons name="add" size={18} color="#0A8C52" />
              <Text style={s.addBtnTxt}>Ajouter</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <ActivityIndicator color="#0A8C52" style={{ marginTop: 20 }} />
          ) : addresses.length === 0 ? (
            <View style={s.emptyAddress}>
              <Ionicons name="location-outline" size={36} color="#B4B2A9" />
              <Text style={s.emptyTxt}>Aucune adresse enregistrée</Text>
              <TouchableOpacity style={s.addFirstBtn} onPress={() => setShowAddAddress(true)}>
                <Text style={s.addFirstBtnTxt}>+ Ajouter une adresse</Text>
              </TouchableOpacity>
            </View>
          ) : (
            addresses.map((addr) => {
              const lat = parseFloat(String(addr.latitude));
              const lng = parseFloat(String(addr.longitude));
              return (
                <View key={addr.id} style={s.addressCard}>
                  {!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0 && (
                    <View style={[s.addrMapWrap, { backgroundColor: '#E8F5EE', alignItems: 'center', justifyContent: 'center' }]}>
                      <Text style={{ fontSize: 24 }}>📍</Text>
                      <Text style={{ fontSize: 11, color: '#0A8C52', fontWeight: '600', marginTop: 2 }}>
                        {lat.toFixed(4)}, {lng.toFixed(4)}
                      </Text>
                    </View>
                  )}
                  <View style={s.addressBody}>
                    <View style={s.addressIcon}>
                      <Ionicons name={addr.label === 'Domicile' ? 'home' : addr.label === 'Bureau' ? 'business' : 'location'} size={20} color="#0A8C52" />
                    </View>
                    <View style={s.addressInfo}>
                      <View style={s.addressTop}>
                        <Text style={s.addressLabel}>{addr.label}</Text>
                        {addr.isDefault && (
                          <View style={s.defaultBadge}><Text style={s.defaultBadgeTxt}>Par défaut</Text></View>
                        )}
                      </View>
                      <Text style={s.addressFull}>{addr.fullAddress}</Text>
                      <Text style={s.addressCommune}>{addr.commune}</Text>
                    </View>
                    <TouchableOpacity onPress={() => handleDeleteAddress(addr.id)} style={s.deleteBtn}>
                      <Ionicons name="trash-outline" size={18} color="#E24B4A" />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>Paramètres</Text>
          {[
            { icon: 'wallet-outline',           label: 'Mon Portefeuille',  sub: '0 FCFA disponible',  color: '#0A8C52' },
            { icon: 'notifications-outline',    label: 'Notifications',     sub: 'Activées',            color: '#1565C0' },
            { icon: 'shield-checkmark-outline', label: 'Confidentialité',   sub: 'Gérer mes données',   color: '#7B3FA0' },
            { icon: 'help-circle-outline',      label: 'Aide & Support',    sub: 'FAQ, Contact',        color: '#E8A000' },
            { icon: 'star-outline',             label: "Noter l'app",       sub: 'Donnez votre avis',   color: '#F5A623' },
          ].map((item, i) => (
            <TouchableOpacity key={i} style={s.menuItem} activeOpacity={0.7}>
              <View style={[s.menuIcon, { backgroundColor: `${item.color}20` }]}>
                <Ionicons name={item.icon as any} size={20} color={item.color} />
              </View>
              <View style={s.menuInfo}>
                <Text style={s.menuLabel}>{item.label}</Text>
                <Text style={s.menuSub}>{item.sub}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#B4B2A9" />
            </TouchableOpacity>
          ))}
        </View>

        <Text style={s.version}>Klik CI v1.0.0 — Phase pilote Abidjan</Text>

        <TouchableOpacity style={s.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color="#E24B4A" />
          <Text style={s.logoutTxt}>Se déconnecter</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* MODAL SOS */}
      <Modal visible={showSOS} animationType="slide" transparent statusBarTranslucent>
        <View style={s.sosOverlay}>
          <View style={[s.sosModal, { paddingBottom: insets.bottom + 20 }]}>
            <View style={s.sosModalHeader}>
              <View style={s.sosModalIcon}><Ionicons name="warning" size={26} color="#fff" /></View>
              <View style={{ flex: 1 }}>
                <Text style={s.sosModalTitle}>Urgence — Appel secours</Text>
                <Text style={s.sosModalSub}>Sélectionnez le service d'urgence</Text>
              </View>
              <TouchableOpacity onPress={() => setShowSOS(false)} style={s.sosCloseBtn}>
                <Ionicons name="close" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
            <View style={s.sosBody}>
              {SOS_TYPES.map(type => (
                <TouchableOpacity key={type.id} style={[s.sosTypeBtn, { borderColor: type.color }]} onPress={() => handleSOS(type)} activeOpacity={0.85}>
                  <View style={[s.sosTypeIcon, { backgroundColor: `${type.color}20` }]}>
                    <Ionicons name={type.icon as any} size={22} color={type.color} />
                  </View>
                  <View style={s.sosTypeInfo}>
                    <Text style={s.sosTypeLabel}>{type.label}</Text>
                    <Text style={s.sosTypeDesc}>{type.desc}</Text>
                  </View>
                  <View style={[s.sosTelBadge, { backgroundColor: type.color }]}>
                    <Text style={s.sosTelTxt}>{type.tel}</Text>
                  </View>
                </TouchableOpacity>
              ))}
              <View style={s.sosWarning}>
                <Ionicons name="information-circle" size={14} color="#E24B4A" />
                <Text style={s.sosWarningTxt}>Utilisez uniquement en cas de réelle urgence.</Text>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL AJOUTER ADRESSE */}
      <Modal visible={showAddAddress} animationType="slide" transparent>
        <View style={s.modalOverlay}>
          <View style={[s.modalCard, { paddingBottom: insets.bottom + 20 }]}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Nouvelle adresse</Text>
              <TouchableOpacity onPress={() => { setShowAddAddress(false); setMapCoords(null); setNewAddress({ label: 'Domicile', fullAddress: '', commune: 'Cocody' }); }}>
                <Ionicons name="close" size={24} color="#0D1F14" />
              </TouchableOpacity>
            </View>

            <Text style={s.inputLabel}>Type d'adresse</Text>
            <View style={s.labelRow}>
              {LABELS.map(label => (
                <TouchableOpacity key={label} style={[s.labelChip, newAddress.label === label && s.labelChipActive]} onPress={() => setNewAddress(p => ({ ...p, label }))}>
                  <Text style={[s.labelChipTxt, newAddress.label === label && s.labelChipTxtActive]}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity style={s.geoBtn} onPress={useCurrentLocation} disabled={locating}>
              {locating ? <ActivityIndicator size="small" color="#0A8C52" /> : <Ionicons name="navigate" size={18} color="#0A8C52" />}
              <Text style={s.geoBtnTxt}>{locating ? 'Détection...' : 'Utiliser ma position actuelle'}</Text>
            </TouchableOpacity>

            {mapCoords && (
              <View style={[s.miniMapWrap, { backgroundColor: '#E8F5EE', alignItems: 'center', justifyContent: 'center' }]}>
                <Text style={{ fontSize: 32 }}>📍</Text>
                <Text style={{ fontSize: 12, color: '#0A8C52', fontWeight: '600', marginTop: 4 }}>Position détectée</Text>
                <Text style={{ fontSize: 10, color: '#888', marginTop: 2 }}>
                  {mapCoords.lat.toFixed(5)}, {mapCoords.lng.toFixed(5)}
                </Text>
              </View>
            )}

            <Text style={s.inputLabel}>Adresse complète</Text>
            <TextInput
              style={s.input}
              placeholder="Ex: Angré 7ème tranche, Rue des Fleurs"
              placeholderTextColor="#B4B2A9"
              value={newAddress.fullAddress}
              onChangeText={v => setNewAddress(p => ({ ...p, fullAddress: v }))}
              multiline
            />

            <Text style={s.inputLabel}>Commune</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
              <View style={s.communeRow}>
                {COMMUNES.map(commune => (
                  <TouchableOpacity key={commune} style={[s.communeChip, newAddress.commune === commune && s.communeChipActive]} onPress={() => setNewAddress(p => ({ ...p, commune }))}>
                    <Text style={[s.communeChipTxt, newAddress.commune === commune && s.communeChipTxtActive]}>{commune}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <TouchableOpacity style={[s.saveBtn, savingAddress && { opacity: 0.7 }]} onPress={handleAddAddress} disabled={savingAddress}>
              {savingAddress ? <ActivityIndicator color="#0D1F14" /> : <Text style={s.saveBtnTxt}>Enregistrer l'adresse</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F5F4F0' },
  scroll: { flex: 1 },
  content: { padding: 16 },
  header: { backgroundColor: '#0D1F14', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#fff' },
  sosHeaderBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#E24B4A', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  sosHeaderTxt: { fontSize: 12, fontWeight: '800', color: '#fff' },
  profileCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 12, ...shadows.sm },
  avatar: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#0A8C52', alignItems: 'center', justifyContent: 'center' },
  avatarTxt: { fontSize: 22, fontWeight: '800', color: '#fff' },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 16, fontWeight: '700', color: '#0D1F14' },
  profilePhone: { fontSize: 13, color: '#888780', marginTop: 2 },
  verifiedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  verifiedTxt: { fontSize: 11, color: '#0A8C52', fontWeight: '600' },
  editBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#E8F5EE', alignItems: 'center', justifyContent: 'center' },
  statsRow: { backgroundColor: '#fff', borderRadius: 16, padding: 16, flexDirection: 'row', marginBottom: 16, ...shadows.sm },
  statCard: { flex: 1, alignItems: 'center' },
  statNum: { fontSize: 22, fontWeight: '800', color: '#0D1F14' },
  statLbl: { fontSize: 11, color: '#888780', marginTop: 2 },
  statDivider: { width: 1, backgroundColor: '#E8E6DF', marginHorizontal: 8 },
  klikpassBanner: { backgroundColor: '#0D1F14', borderRadius: 16, padding: 16, marginBottom: 20, ...shadows.md },
  klikpassBannerTop: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  klikpassIcon: { width: 46, height: 46, borderRadius: 23, backgroundColor: '#1B3A2D', alignItems: 'center', justifyContent: 'center' },
  klikpassBannerTitle: { fontSize: 20, fontWeight: '800', color: '#fff' },
  klikpassBannerPrice: { fontSize: 13, color: '#F5A623', fontWeight: '600', marginTop: 2 },
  klikpassFeatures: { gap: 8, marginBottom: 16 },
  klikpassFeatureRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  klikpassFeatureTxt: { fontSize: 13, color: 'rgba(255,255,255,0.8)' },
  klikpassBtn: { backgroundColor: '#F5A623', borderRadius: 12, padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  klikpassBtnTxt: { fontSize: 14, fontWeight: '800', color: '#0D1F14' },
  klikpassActive: { backgroundColor: '#E8F5EE', borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, borderWidth: 1.5, borderColor: '#0A8C52', ...shadows.sm },
  klikpassLeft: { gap: 4 },
  klikpassBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#0A8C52', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4, alignSelf: 'flex-start' },
  klikpassBadgeTxt: { fontSize: 12, fontWeight: '700', color: '#fff' },
  klikpassRenewal: { fontSize: 12, color: '#0A8C52', marginTop: 4 },
  klikpassCount: { fontSize: 11, color: '#888780' },
  section: { marginBottom: 20 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#0D1F14' },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  addBtnTxt: { fontSize: 13, color: '#0A8C52', fontWeight: '600' },
  emptyAddress: { alignItems: 'center', padding: 24, gap: 8, backgroundColor: '#fff', borderRadius: 16 },
  emptyTxt: { fontSize: 14, color: '#B4B2A9' },
  addFirstBtn: { backgroundColor: '#0A8C52', borderRadius: 12, paddingHorizontal: 20, paddingVertical: 10, marginTop: 8 },
  addFirstBtnTxt: { fontSize: 13, fontWeight: '700', color: '#fff' },
  addressCard: { backgroundColor: '#fff', borderRadius: 16, marginBottom: 10, overflow: 'hidden', ...shadows.sm },
  addrMapWrap: { height: 80, width: '100%' },
  addressBody: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  addressIcon: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#E8F5EE', alignItems: 'center', justifyContent: 'center' },
  addressInfo: { flex: 1 },
  addressTop: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  addressLabel: { fontSize: 14, fontWeight: '700', color: '#0D1F14' },
  defaultBadge: { backgroundColor: '#E8F5EE', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2 },
  defaultBadgeTxt: { fontSize: 10, color: '#0A8C52', fontWeight: '600' },
  addressFull: { fontSize: 12, color: '#888780' },
  addressCommune: { fontSize: 11, color: '#B4B2A9', marginTop: 2 },
  deleteBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#FFEBEB', alignItems: 'center', justifyContent: 'center' },
  menuItem: { backgroundColor: '#fff', borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8, ...shadows.sm },
  menuIcon: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  menuInfo: { flex: 1 },
  menuLabel: { fontSize: 14, fontWeight: '600', color: '#0D1F14' },
  menuSub: { fontSize: 12, color: '#888780', marginTop: 2 },
  version: { fontSize: 11, color: '#B4B2A9', textAlign: 'center', marginBottom: 16 },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#fff', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#FFEBEB', ...shadows.sm },
  logoutTxt: { fontSize: 15, fontWeight: '700', color: '#E24B4A' },
  sosOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sosModal: { backgroundColor: '#F5F4F0', borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden' },
  sosModalHeader: { backgroundColor: '#E24B4A', padding: 20, flexDirection: 'row', alignItems: 'center', gap: 12 },
  sosModalIcon: { width: 46, height: 46, borderRadius: 23, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  sosModalTitle: { fontSize: 17, fontWeight: '800', color: '#fff' },
  sosModalSub: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  sosCloseBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  sosBody: { padding: 16, gap: 10 },
  sosTypeBtn: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14, padding: 14, borderWidth: 1.5, backgroundColor: '#fff' },
  sosTypeIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  sosTypeInfo: { flex: 1 },
  sosTypeLabel: { fontSize: 13, fontWeight: '700', color: '#0D1F14' },
  sosTypeDesc: { fontSize: 11, color: '#888780', marginTop: 2 },
  sosTelBadge: { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5 },
  sosTelTxt: { fontSize: 14, fontWeight: '800', color: '#fff' },
  sosWarning: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, backgroundColor: '#FFEBEB', borderRadius: 10, padding: 10 },
  sosWarningTxt: { fontSize: 11, color: '#791F1F', flex: 1, lineHeight: 15 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#0D1F14' },
  inputLabel: { fontSize: 13, color: '#888780', marginBottom: 8, fontWeight: '500' },
  labelRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  labelChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: '#E8E6DF', backgroundColor: '#fff' },
  labelChipActive: { borderColor: '#0A8C52', backgroundColor: '#E8F5EE' },
  labelChipTxt: { fontSize: 13, color: '#888780', fontWeight: '500' },
  labelChipTxtActive: { color: '#0A8C52', fontWeight: '700' },
  geoBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#E8F5EE', borderRadius: 12, padding: 12, marginBottom: 16, borderWidth: 1, borderColor: '#0A8C52' },
  geoBtnTxt: { fontSize: 13, color: '#0A8C52', fontWeight: '600', flex: 1 },
  miniMapWrap: { borderRadius: 12, overflow: 'hidden', height: 110, marginBottom: 16, ...shadows.sm },
  input: { backgroundColor: '#F5F4F0', borderRadius: 12, padding: 14, fontSize: 14, color: '#0D1F14', marginBottom: 16, borderWidth: 1, borderColor: '#E8E6DF', minHeight: 60 },
  communeRow: { flexDirection: 'row', gap: 8, paddingRight: 16 },
  communeChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: '#E8E6DF', backgroundColor: '#fff' },
  communeChipActive: { borderColor: '#0A8C52', backgroundColor: '#E8F5EE' },
  communeChipTxt: { fontSize: 13, color: '#888780', fontWeight: '500' },
  communeChipTxtActive: { color: '#0A8C52', fontWeight: '700' },
  saveBtn: { backgroundColor: '#F5A623', borderRadius: 14, padding: 16, alignItems: 'center' },
  saveBtnTxt: { fontSize: 15, fontWeight: '800', color: '#0D1F14' },
});