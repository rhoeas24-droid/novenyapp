import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useLanguage } from '../src/i18n/LanguageContext';
import plantsData from '../src/data/plants.json';

// Helper: look up full plant data from bundled JSON
const getPlantData = (name: string): any | undefined => {
  return (plantsData as any[]).find((p: any) => p.name === name);
};

const getPlantImage = (name: string): string | undefined => {
  return getPlantData(name)?.image_base64;
};

interface SavedPlant {
  name: string;
  common: string;
  family?: string;
  light?: string;
  temp?: string;
  humidity?: string;
  maintenance?: string;
  diseases?: {
    fungal: Array<{ name: string; symptoms: string; treatment: string }>;
    pests: Array<{ name: string; symptoms: string; treatment: string }>;
    other: Array<{ name: string; symptoms: string; treatment: string }>;
  };
  substrate_group?: string;
  group?: string;
  role?: string;
  propagation?: string;
  avoid?: string;
  cyprus?: string;
  height_cm?: string;
  spread_cm?: string;
}

interface SavedTerrarium {
  id: string;
  name?: string;
  createdAt: string;
  container: {
    shape: string | null;
    opening: string | null;
    size: string | null;
    terrariumType: string | null;
  };
  plants: SavedPlant[];
  summary: {
    terrariumType: string;
    humidityMin: number;
    humidityMax: number;
    unifiedLight: string;
    wateringNote: string;
  };
  substrateRecipe: { name: string; recipe: string } | null;
}

// Helper: generate HTML plant profile for PDF
const plantProfileHtml = (p: SavedPlant & { image_base64?: string }): string => {
  const imgTag = p.image_base64
    ? `<img src="${p.image_base64}" style="width:120px;height:120px;border-radius:12px;object-fit:cover;float:left;margin-right:16px;margin-bottom:8px;" />`
    : '';

  const diseasesHtml = (() => {
    if (!p.diseases) return '';
    const all = [...(p.diseases.fungal || []), ...(p.diseases.pests || []), ...(p.diseases.other || [])];
    if (all.length === 0) return '';
    return `<table style="width:100%;border-collapse:collapse;margin-top:8px;">
      <tr style="background:#FFEBEE;"><th style="text-align:left;padding:4px 8px;font-size:12px;">Betegség/Kártevő</th><th style="text-align:left;padding:4px 8px;font-size:12px;">Tünetek</th><th style="text-align:left;padding:4px 8px;font-size:12px;">Kezelés</th></tr>
      ${all.map(d => `<tr style="border-bottom:1px solid #eee;"><td style="padding:4px 8px;font-size:11px;font-weight:600;color:#C62828;">${d.name}</td><td style="padding:4px 8px;font-size:11px;">${d.symptoms}</td><td style="padding:4px 8px;font-size:11px;">${d.treatment}</td></tr>`).join('')}
    </table>`;
  })();

  const row = (label: string, value: string | undefined) =>
    value && value !== '—' ? `<tr><td style="padding:3px 8px;font-size:12px;color:#666;vertical-align:top;">${label}</td><td style="padding:3px 8px;font-size:12px;">${value}</td></tr>` : '';

  return `<div style="page-break-inside:avoid;border:1px solid #E0E0E0;border-radius:12px;padding:16px;margin-bottom:16px;">
    ${imgTag}
    <h3 style="color:#1B5E20;margin:0 0 2px 0;font-size:16px;">${p.name}</h3>
    <p style="color:#666;margin:0 0 8px 0;font-size:12px;">${p.common || ''} ${p.family ? '· ' + p.family : ''}</p>
    <div style="clear:both;"></div>
    <table style="width:100%;">
      ${row('☀️ Fény', p.light)}${row('🌡️ Hőmérséklet', p.temp)}${row('💧 Páratartalom', p.humidity)}
      ${row('📏 Magasság', p.height_cm ? p.height_cm + ' cm' : undefined)}
      ${row('🎭 Szerep', p.role)}${row('🔧 Gondozás', p.maintenance)}${row('⚠️ Kerülendő', p.avoid)}
    </table>
    ${diseasesHtml}
  </div>`;
};

export default function MyTerrariumsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();
  const [terrariums, setTerrariums] = useState<SavedTerrarium[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      loadTerrariums();
    }, [])
  );

  const loadTerrariums = async () => {
    try {
      const data = await AsyncStorage.getItem('saved_terrariums');
      if (data) setTerrariums(JSON.parse(data));
      else setTerrariums([]);
    } catch (e) {
      console.error('Load error:', e);
    }
  };

  const deleteTerrarium = (id: string) => {
    Alert.alert(
      t('deleteTerrarium') || 'Törlés',
      t('confirmDelete') || 'Biztosan törlöd ezt a terráriumot?',
      [
        { text: t('cancel') || 'Mégsem', style: 'cancel' },
        {
          text: t('delete') || 'Törlés',
          style: 'destructive',
          onPress: async () => {
            const updated = terrariums.filter(tr => tr.id !== id);
            setTerrariums(updated);
            await AsyncStorage.setItem('saved_terrariums', JSON.stringify(updated));
          },
        },
      ]
    );
  };

  const exportPDF = async (terrarium: SavedTerrarium) => {
    const typeLabels: Record<string, string> = {
      zart: t('closed'), felzart: t('semiClosed'), nyitott: t('open'),
    };

    // Enrich plants with images and full data from bundle
    const enriched = terrarium.plants.map(p => {
      const bundled = getPlantData(p.name);
      return { ...p, ...bundled, image_base64: getPlantImage(p.name) };
    });

    const plantCards = enriched.map((p, i) => {
      const imgTag = p.image_base64
        ? `<img src="${p.image_base64}" style="width:70px;height:70px;border-radius:8px;object-fit:cover;" />`
        : `<div style="width:70px;height:70px;border-radius:8px;background:#E8F5E9;text-align:center;line-height:70px;">🌿</div>`;
      return `<div style="text-align:center;width:30%;margin-bottom:8px;">${imgTag}<p style="font-size:10px;margin:4px 0;">${i === 0 ? '⭐ ' : ''}${p.name}</p></div>`;
    }).join('');

    const plantProfilesHtml = enriched.map(p => plantProfileHtml(p)).join('');
    const s = terrarium.summary;

    const html = `<html><head><meta charset="utf-8"/><style>
      body{font-family:-apple-system,sans-serif;padding:24px;color:#333;}
      h1{color:#1B5E20;font-size:22px;}h2{color:#388E3C;font-size:16px;margin-top:20px;border-bottom:1px solid #E0E0E0;padding-bottom:4px;}
      .plants-grid{display:flex;flex-wrap:wrap;gap:8px;}.value{color:#555;margin-left:8px;}.recipe{font-style:italic;color:#6D4C41;}
    </style></head><body>
      <h1>🌿 ${terrarium.name || t('yourTerrarium')}</h1>
      <p style="color:#888;font-size:12px;">${new Date(terrarium.createdAt).toLocaleDateString()}</p>
      <h2>🌱 ${t('plants')} (${terrarium.plants.length})</h2>
      <div class="plants-grid">${plantCards}</div>
      <h2>🏠 ${t('terrariumType')}</h2><p class="value">${typeLabels[s.terrariumType] || s.terrariumType}</p>
      ${terrarium.substrateRecipe ? `<h2>🧱 ${t('substrate')}</h2><p><strong>${terrarium.substrateRecipe.name}</strong></p><p class="recipe">${terrarium.substrateRecipe.recipe}</p>` : ''}
      <h2>☀️ ${t('lightRequirements')}</h2><p class="value">${s.unifiedLight}</p>
      <h2>💧 ${t('humidity')}</h2><p class="value">${s.humidityMin}–${s.humidityMax}% RH</p>
      <h2>🚿 ${t('watering') || 'Öntözés'}</h2><p class="value">${t(s.wateringNote as any) || s.wateringNote}</p>
      <div style="page-break-before:always;"></div>
      <h1>📋 ${t('plantProfiles') || 'Növény adatlapok'}</h1>
      ${plantProfilesHtml}
    </body></html>`;

    try {
      const { uri } = await Print.printToFileAsync({ html, base64: false });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: terrarium.name || t('yourTerrarium') });
      }
    } catch (e) {
      console.error('PDF error:', e);
    }
  };

  const typeLabels: Record<string, string> = {
    zart: t('closed'), felzart: t('semiClosed'), nyitott: t('open'),
  };

  return (
    <ScrollView style={[styles.container, { paddingTop: insets.top }]}>
      {terrariums.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="leaf-outline" size={48} color="#ccc" />
          <Text style={styles.emptyText}>{t('noSavedTerrariums') || 'Még nincs mentett terráriumod.'}</Text>
          <TouchableOpacity style={styles.buildBtn} onPress={() => router.push('/builder' as any)}>
            <Text style={styles.buildBtnText}>{t('buildTerrarium')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        terrariums.map(terr => {
          const isExpanded = expandedId === terr.id;
          return (
            <View key={terr.id} style={styles.card}>
              {/* Header — tap to expand/collapse */}
              <TouchableOpacity onPress={() => setExpandedId(isExpanded ? null : terr.id)}>
                <View style={styles.cardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardName}>{terr.name || 'Terrárium'}</Text>
                    <Text style={styles.cardDate}>{new Date(terr.createdAt).toLocaleDateString()}</Text>
                  </View>
                  <Text style={styles.cardType}>{typeLabels[terr.summary.terrariumType] || ''}</Text>
                  <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={20} color="#888" style={{ marginLeft: 8 }} />
                </View>
              </TouchableOpacity>

              {/* Plant thumbnails — tap to open plant detail */}
              <View style={styles.plantRow}>
                {terr.plants.slice(0, 6).map((p) => {
                  const img = getPlantImage(p.name);
                  return (
                    <TouchableOpacity key={p.name} style={styles.thumb} onPress={() => router.push(`/plant/${encodeURIComponent(p.name)}` as any)}>
                      {img ? (
                        <Image source={{ uri: img }} style={styles.thumbImg} />
                      ) : (
                        <View style={[styles.thumbImg, { backgroundColor: '#E8F5E9', justifyContent: 'center', alignItems: 'center' }]}>
                          <Ionicons name="leaf" size={16} color="#81C784" />
                        </View>
                      )}
                      <Text style={styles.thumbName} numberOfLines={1}>{p.name}</Text>
                    </TouchableOpacity>
                  );
                })}
                {terr.plants.length > 6 && <Text style={styles.moreText}>+{terr.plants.length - 6}</Text>}
              </View>

              {/* Quick info — always visible */}
              <Text style={styles.quickInfo}>
                ☀️ {terr.summary.unifiedLight}  •  💧 {terr.summary.humidityMin}–{terr.summary.humidityMax}%
              </Text>

              {/* Expanded detail view */}
              {isExpanded && (
                <View style={styles.detailSection}>
                  {/* Substrate */}
                  {terr.substrateRecipe && (
                    <View style={styles.detailRow}>
                      <Ionicons name="layers" size={16} color="#8B4513" />
                      <View style={{ flex: 1, marginLeft: 8 }}>
                        <Text style={styles.detailLabel}>{terr.substrateRecipe.name}</Text>
                        <Text style={styles.detailValue}>{terr.substrateRecipe.recipe}</Text>
                      </View>
                    </View>
                  )}

                  {/* Watering */}
                  <View style={styles.detailRow}>
                    <Ionicons name="rainy" size={16} color="#0288D1" />
                    <Text style={[styles.detailValue, { marginLeft: 8, flex: 1 }]}>{t(terr.summary.wateringNote as any) || terr.summary.wateringNote}</Text>
                  </View>

                  {/* Per-plant care */}
                  {terr.plants.filter(p => p.maintenance && p.maintenance !== '—').length > 0 && (
                    <View style={{ marginTop: 8 }}>
                      <Text style={styles.detailLabel}>🖐️ {t('careTips')}</Text>
                      {terr.plants.filter(p => p.maintenance && p.maintenance !== '—').map(p => (
                        <View key={p.name} style={{ marginTop: 4 }}>
                          <Text style={styles.perPlantName}>{p.name}</Text>
                          <Text style={styles.detailValue}>{p.maintenance}</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Per-plant issues */}
                  {terr.plants.filter(p => p.diseases && ((p.diseases.fungal?.length || 0) + (p.diseases.pests?.length || 0) + (p.diseases.other?.length || 0) > 0)).length > 0 && (
                    <View style={{ marginTop: 8 }}>
                      <Text style={styles.detailLabel}>⚠️ {t('watchOut')}</Text>
                      {terr.plants.map(p => {
                        const issues = [...(p.diseases?.fungal||[]), ...(p.diseases?.pests||[]), ...(p.diseases?.other||[])];
                        if (issues.length === 0) return null;
                        return (
                          <View key={p.name} style={{ marginTop: 4 }}>
                            <Text style={styles.perPlantName}>{p.name}</Text>
                            {issues.map((d, i) => <Text key={i} style={styles.issueText}>• {d.name}</Text>)}
                          </View>
                        );
                      })}
                    </View>
                  )}
                </View>
              )}

              {/* Actions */}
              <View style={styles.actions}>
                <TouchableOpacity style={styles.actionBtn} onPress={() => exportPDF(terr)}>
                  <Ionicons name="document" size={18} color="#0277BD" />
                  <Text style={[styles.actionText, { color: '#0277BD' }]}>PDF</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionBtn} onPress={() => deleteTerrarium(terr.id)}>
                  <Ionicons name="trash" size={18} color="#C62828" />
                  <Text style={[styles.actionText, { color: '#C62828' }]}>{t('delete') || 'Törlés'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })
      )}
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5', padding: 16 },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyText: { fontSize: 16, color: '#999', marginTop: 12 },
  buildBtn: { marginTop: 20, backgroundColor: '#1B5E20', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  buildBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  cardName: { fontSize: 16, fontWeight: '600', color: '#1B5E20' },
  cardDate: { fontSize: 12, color: '#999', marginTop: 2 },
  cardType: { fontSize: 13, fontWeight: '600', color: '#388E3C' },
  plantRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  thumb: { alignItems: 'center', width: 50 },
  thumbImg: { width: 44, height: 44, borderRadius: 8 },
  thumbName: { fontSize: 9, color: '#2E7D32', marginTop: 2, textAlign: 'center', textDecorationLine: 'underline' },
  moreText: { fontSize: 13, color: '#999', alignSelf: 'center', marginLeft: 4 },
  quickInfo: { fontSize: 12, color: '#666', marginBottom: 8 },
  actions: { flexDirection: 'row', gap: 16, borderTopWidth: 1, borderTopColor: '#EEE', paddingTop: 12 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  actionText: { fontSize: 13, fontWeight: '500' },
  detailSection: { borderTopWidth: 1, borderTopColor: '#EEE', paddingTop: 12, marginTop: 4, marginBottom: 8 },
  detailRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  detailLabel: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 2 },
  detailValue: { fontSize: 13, color: '#555', fontStyle: 'italic', lineHeight: 18 },
  perPlantName: { fontSize: 12, fontWeight: '600', color: '#2E7D32', fontStyle: 'italic' },
  issueText: { fontSize: 12, color: '#C62828', marginLeft: 8 },
});
