import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { CustomerTxKind } from '../../types';

export const KIND_STYLE: Record<
  CustomerTxKind,
  { color: string; bg: string; icon: keyof typeof Ionicons.glyphMap }
> = {
  borc: { color: Colors.danger, bg: Colors.dangerLight, icon: 'document-text' },
  tahsilat: { color: Colors.success, bg: Colors.successLight, icon: 'cash' },
  masraf: { color: Colors.fuel, bg: Colors.fuelLight, icon: 'receipt' },
};
