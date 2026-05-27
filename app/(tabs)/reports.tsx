import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useData } from '../../hooks/useData';
import { Colors } from '../../constants/colors';
import { Trip, FuelEntry } from '../../types';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CHART_WIDTH = SCREEN_WIDTH - 64;

const MONTHS = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];

type PeriodType = '3ay' | '6ay' | '12ay';

export default function ReportsScreen() {
  const { trips, fuelEntries, vehicles } = useData();
  const [period, setPeriod] = useState<PeriodType>('6ay');

  const periodMonths = period === '3ay' ? 3 : period === '6ay' ? 6 : 12;

  const monthlyData = useMemo(() => {
    const now = new Date();
    const result = [];
    for (let i = periodMonths - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = `${MONTHS[d.getMonth()]}`;

      const monthTrips = trips.filter((t: Trip) => t.date && t.date.startsWith(key));
      const monthFuel = fuelEntries.filter((f: FuelEntry) => f.date && f.date.startsWith(key));

      const km = monthTrips.reduce((s, t) => s + t.distance, 0);
      const liters = monthFuel.reduce((s, f) => s + f.liters, 0);
      const cost = monthFuel.reduce((s, f) => s + f.totalCost, 0);
      const consumption = km > 0 && liters > 0 ? (liters / km) * 100 : 0;
      const revenue = monthTrips.reduce((s, t) => s + (t.revenue || 0), 0);

      result.push({ key, label, km, liters, cost, consumption, tripCount: monthTrips.length, revenue });
    }
    return result;
  }, [trips, fuelEntries, periodMonths]);

  const totals = useMemo(() => ({
    km: monthlyData.reduce((s, m) => s + m.km, 0),
    cost: monthlyData.reduce((s, m) => s + m.cost, 0),
    liters: monthlyData.reduce((s, m) => s + m.liters, 0),
    trips: monthlyData.reduce((s, m) => s + m.tripCount, 0),
    revenue: monthlyData.reduce((s, m) => s + m.revenue, 0),
    avgConsumption: (() => {
      const totalKm = monthlyData.reduce((s, m) => s + m.km, 0);
      const totalL = monthlyData.reduce((s, m) => s + m.liters, 0);
      return totalKm > 0 && totalL > 0 ? (totalL / totalKm) * 100 : 0;
    })(),
  }), [monthlyData]);

  // Bar chart helper
  const maxKm = Math.max(...monthlyData.map(m => m.km), 1);
  const maxCost = Math.max(...monthlyData.map(m => m.cost), 1);

  const BAR_HEIGHT = 120;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Period Selector */}
      <View style={styles.periodRow}>
        {(['3ay', '6ay', '12ay'] as PeriodType[]).map(p => (
          <TouchableOpacity
            key={p}
            style={[styles.periodBtn, period === p && styles.periodBtnActive]}
            onPress={() => setPeriod(p)}
          >
            <Text style={[styles.periodBtnText, period === p && styles.periodBtnTextActive]}>
              Son {p === '3ay' ? '3 Ay' : p === '6ay' ? '6 Ay' : '12 Ay'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Summary Cards */}
      <View style={styles.summaryGrid}>
        <View style={styles.summaryCard}>
          <Ionicons name="navigate-circle" size={22} color={Colors.trip} />
          <Text style={styles.summaryValue}>{totals.km.toLocaleString('tr-TR')}</Text>
          <Text style={styles.summaryLabel}>Toplam KM</Text>
        </View>
        <View style={styles.summaryCard}>
          <Ionicons name="flame" size={22} color={Colors.fuel} />
          <Text style={[styles.summaryValue, { color: Colors.fuel }]}>
            ₺{totals.cost.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}
          </Text>
          <Text style={styles.summaryLabel}>Yakıt Gideri</Text>
        </View>
        <View style={styles.summaryCard}>
          <Ionicons name="cash" size={22} color={Colors.success} />
          <Text style={[styles.summaryValue, { color: Colors.success }]}>
            ₺{totals.revenue.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}
          </Text>
          <Text style={styles.summaryLabel}>Toplam Gelir</Text>
        </View>
        <View style={styles.summaryCard}>
          <Ionicons name="speedometer" size={22} color={Colors.warning} />
          <Text style={[styles.summaryValue, { color: Colors.warning }]}>
            {totals.avgConsumption > 0 ? `${totals.avgConsumption.toFixed(1)}` : '—'}
          </Text>
          <Text style={styles.summaryLabel}>lt/100km</Text>
        </View>
      </View>

      {/* KM Bar Chart */}
      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>Aylık KM</Text>
        <View style={styles.barChart}>
          {monthlyData.map((m, i) => (
            <View key={i} style={styles.barColumn}>
              <Text style={styles.barValue}>
                {m.km > 0 ? (m.km >= 1000 ? `${(m.km / 1000).toFixed(1)}k` : m.km) : ''}
              </Text>
              <View style={styles.barWrapper}>
                <View
                  style={[
                    styles.bar,
                    styles.barKm,
                    { height: Math.max((m.km / maxKm) * BAR_HEIGHT, m.km > 0 ? 4 : 0) },
                  ]}
                />
              </View>
              <Text style={styles.barLabel}>{m.label}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Fuel Cost Bar Chart */}
      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>Aylık Yakıt Gideri (₺)</Text>
        <View style={styles.barChart}>
          {monthlyData.map((m, i) => (
            <View key={i} style={styles.barColumn}>
              <Text style={styles.barValue}>
                {m.cost > 0 ? (m.cost >= 1000 ? `${(m.cost / 1000).toFixed(1)}k` : m.cost.toFixed(0)) : ''}
              </Text>
              <View style={styles.barWrapper}>
                <View
                  style={[
                    styles.bar,
                    styles.barFuel,
                    { height: Math.max((m.cost / maxCost) * BAR_HEIGHT, m.cost > 0 ? 4 : 0) },
                  ]}
                />
              </View>
              <Text style={styles.barLabel}>{m.label}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Monthly Table */}
      <View style={styles.tableCard}>
        <Text style={styles.chartTitle}>Aylık Detay</Text>
        <View style={styles.tableHeader}>
          <Text style={[styles.tableCell, styles.tableHeaderText, { flex: 1.2 }]}>Ay</Text>
          <Text style={[styles.tableCell, styles.tableHeaderText]}>KM</Text>
          <Text style={[styles.tableCell, styles.tableHeaderText]}>Sefer</Text>
          <Text style={[styles.tableCell, styles.tableHeaderText]}>Yakıt ₺</Text>
          <Text style={[styles.tableCell, styles.tableHeaderText]}>lt/100</Text>
        </View>
        {monthlyData.map((m, i) => (
          <View key={i} style={[styles.tableRow, i % 2 === 0 && styles.tableRowAlt]}>
            <Text style={[styles.tableCell, { flex: 1.2, fontWeight: '600', color: Colors.text }]}>{m.label}</Text>
            <Text style={styles.tableCell}>{m.km > 0 ? m.km.toLocaleString('tr-TR') : '—'}</Text>
            <Text style={styles.tableCell}>{m.tripCount}</Text>
            <Text style={[styles.tableCell, { color: Colors.fuel }]}>
              {m.cost > 0 ? m.cost.toFixed(0) : '—'}
            </Text>
            <Text style={[styles.tableCell, { color: Colors.warning }]}>
              {m.consumption > 0 ? m.consumption.toFixed(1) : '—'}
            </Text>
          </View>
        ))}
        {/* Totals */}
        <View style={[styles.tableRow, styles.tableTotals]}>
          <Text style={[styles.tableCell, { flex: 1.2, fontWeight: '800', color: Colors.text }]}>TOPLAM</Text>
          <Text style={[styles.tableCell, { fontWeight: '700' }]}>{totals.km.toLocaleString('tr-TR')}</Text>
          <Text style={[styles.tableCell, { fontWeight: '700' }]}>{totals.trips}</Text>
          <Text style={[styles.tableCell, { fontWeight: '700', color: Colors.fuel }]}>{totals.cost.toFixed(0)}</Text>
          <Text style={[styles.tableCell, { fontWeight: '700', color: Colors.warning }]}>
            {totals.avgConsumption > 0 ? totals.avgConsumption.toFixed(1) : '—'}
          </Text>
        </View>
      </View>

      {/* Vehicle Summary */}
      {vehicles.length > 0 && (
        <View style={styles.tableCard}>
          <Text style={styles.chartTitle}>Araç Bazlı Özet</Text>
          {vehicles.map(v => {
            const vTrips = trips.filter((t: Trip) => t.vehicleId === v.id);
            const vFuel = fuelEntries.filter((f: FuelEntry) => f.vehicleId === v.id);
            const vKm = vTrips.reduce((s, t) => s + t.distance, 0);
            const vCost = vFuel.reduce((s, f) => s + f.totalCost, 0);
            const vLiters = vFuel.reduce((s, f) => s + f.liters, 0);
            const vConsumption = vKm > 0 && vLiters > 0 ? (vLiters / vKm) * 100 : 0;
            return (
              <View key={v.id} style={styles.vehicleSummaryRow}>
                <View style={styles.vehicleSummaryLeft}>
                  <Text style={styles.vehicleSummaryPlate}>{v.plate}</Text>
                  <Text style={styles.vehicleSummaryBrand}>{v.brand} {v.model}</Text>
                </View>
                <View style={styles.vehicleSummaryStats}>
                  <Text style={styles.vehicleStatItem}>
                    <Text style={{ fontWeight: '700' }}>{vKm.toLocaleString('tr-TR')}</Text> km
                  </Text>
                  <Text style={[styles.vehicleStatItem, { color: Colors.fuel }]}>
                    ₺<Text style={{ fontWeight: '700' }}>{vCost.toFixed(0)}</Text>
                  </Text>
                  <Text style={[styles.vehicleStatItem, { color: Colors.warning }]}>
                    <Text style={{ fontWeight: '700' }}>
                      {vConsumption > 0 ? vConsumption.toFixed(1) : '—'}
                    </Text> lt/100
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  periodRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  periodBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: Colors.gray200,
    alignItems: 'center',
    backgroundColor: Colors.white,
  },
  periodBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  periodBtnText: { fontSize: 13, fontWeight: '600', color: Colors.gray500 },
  periodBtnTextActive: { color: Colors.white },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingHorizontal: 16,
    marginBottom: 4,
  },
  summaryCard: {
    width: (SCREEN_WIDTH - 52) / 2,
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  summaryValue: { fontSize: 20, fontWeight: '800', color: Colors.text },
  summaryLabel: { fontSize: 11, color: Colors.textLight, textAlign: 'center' },
  chartCard: {
    backgroundColor: Colors.white,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  chartTitle: { fontSize: 15, fontWeight: '700', color: Colors.text, marginBottom: 16 },
  barChart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
    height: 160,
  },
  barColumn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
  },
  barValue: { fontSize: 9, color: Colors.textLight, textAlign: 'center' },
  barWrapper: {
    width: '100%',
    height: 120,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  bar: {
    width: '80%',
    borderRadius: 4,
    minHeight: 0,
  },
  barKm: { backgroundColor: Colors.trip },
  barFuel: { backgroundColor: Colors.fuel },
  barLabel: { fontSize: 10, color: Colors.textLight, textAlign: 'center' },
  tableCard: {
    backgroundColor: Colors.white,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 2,
    borderBottomColor: Colors.gray100,
    paddingBottom: 8,
    marginBottom: 4,
  },
  tableHeaderText: { fontSize: 11, fontWeight: '700', color: Colors.textLight },
  tableRow: { flexDirection: 'row', paddingVertical: 8 },
  tableRowAlt: { backgroundColor: Colors.gray50, borderRadius: 6 },
  tableTotals: {
    borderTopWidth: 2,
    borderTopColor: Colors.gray200,
    marginTop: 4,
    paddingTop: 10,
  },
  tableCell: {
    flex: 1,
    fontSize: 12,
    color: Colors.gray600,
    textAlign: 'center',
  },
  vehicleSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
  },
  vehicleSummaryLeft: { gap: 2 },
  vehicleSummaryPlate: { fontSize: 15, fontWeight: '700', color: Colors.text },
  vehicleSummaryBrand: { fontSize: 12, color: Colors.textLight },
  vehicleSummaryStats: { gap: 4, alignItems: 'flex-end' },
  vehicleStatItem: { fontSize: 12, color: Colors.textLight },
});
