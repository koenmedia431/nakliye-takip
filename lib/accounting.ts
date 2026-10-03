import type { CustomerTransaction, CustomerTxKind } from '../types';

// ===================== BİÇİMLENDİRME =====================
export function formatMoney(value: number, withSymbol = true): string {
  const negative = value < 0;
  const fixed = Math.abs(value).toFixed(2);
  const [intPart, decPart] = fixed.split('.');
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${negative ? '-' : ''}${grouped},${decPart}${withSymbol ? ' ₺' : ''}`;
}

export function todayStr(offsetDays = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return toDateStr(d);
}

export function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// YYYY-MM-DD -> DD.MM.YYYY
export function formatDate(date: string): string {
  const [y, m, d] = date.split('-');
  return `${d}.${m}.${y}`;
}

// DD.MM.YYYY veya YYYY-MM-DD -> YYYY-MM-DD (geçersizse null)
export function parseDateInput(input: string): string | null {
  const s = input.trim();
  let y: number, m: number, d: number;
  let match = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (match) {
    [y, m, d] = [Number(match[1]), Number(match[2]), Number(match[3])];
  } else {
    match = s.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})$/);
    if (!match) return null;
    [d, m, y] = [Number(match[1]), Number(match[2]), Number(match[3])];
  }
  const date = new Date(y, m - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) return null;
  return toDateStr(date);
}

// "12.500,50" / "12500" / "12500.5" -> sayı
export function parseAmountInput(input: string): number {
  const s = input.trim().replace(/\s|₺|tl/gi, '');
  if (!s) return NaN;
  if (s.includes(',')) return Number(s.replace(/\./g, '').replace(',', '.'));
  if (/^\d{1,3}(\.\d{3})+$/.test(s)) return Number(s.replace(/\./g, ''));
  return Number(s);
}

export const KIND_LABELS: Record<CustomerTxKind, string> = {
  borc: 'İş / Fatura',
  tahsilat: 'Tahsilat',
  masraf: 'Masraf',
};

// ===================== HESAPLAMA =====================
export interface CustomerTotals {
  borc: number;
  tahsilat: number;
  masraf: number;
  balance: number;   // borc - tahsilat (pozitif: müşteri borçlu)
  profit: number;    // borc - masraf
}

export function calcTotals(txs: CustomerTransaction[]): CustomerTotals {
  const t = { borc: 0, tahsilat: 0, masraf: 0 };
  txs.forEach(tx => {
    t[tx.kind] += tx.amount || 0;
  });
  return { ...t, balance: t.borc - t.tahsilat, profit: t.borc - t.masraf };
}

export function sortTx(txs: CustomerTransaction[]): CustomerTransaction[] {
  return [...txs].sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? -1 : 1;
    return createdMs(a) - createdMs(b);
  });
}

function createdMs(tx: CustomerTransaction): number {
  const c = tx.createdAt as unknown;
  return c instanceof Date ? c.getTime() : Date.now();
}

export interface StatementRow {
  tx: CustomerTransaction;
  balance: number;
}

export interface Statement {
  opening: number;     // dönem başı devir
  rows: StatementRow[];
  totalBorc: number;
  totalTahsilat: number;
  closing: number;
}

// Ekstre: sadece iş/fatura ve tahsilatlar; masraflar müşteriye gösterilmez
export function buildStatement(
  txs: CustomerTransaction[],
  from?: string,
  to?: string
): Statement {
  const items = sortTx(txs.filter(t => t.kind !== 'masraf'));
  let opening = 0;
  let running = 0;
  let totalBorc = 0;
  let totalTahsilat = 0;
  const rows: StatementRow[] = [];
  items.forEach(tx => {
    const delta = tx.kind === 'borc' ? tx.amount : -tx.amount;
    if (from && tx.date < from) {
      opening += delta;
      running += delta;
      return;
    }
    if (to && tx.date > to) return;
    running += delta;
    if (tx.kind === 'borc') totalBorc += tx.amount;
    else totalTahsilat += tx.amount;
    rows.push({ tx, balance: running });
  });
  return { opening, rows, totalBorc, totalTahsilat, closing: running };
}

export function balanceLabel(balance: number): string {
  if (Math.abs(balance) < 0.005) return 'Hesap kapalı';
  return balance > 0 ? 'Borçlu' : 'Alacaklı';
}

export function statementToText(
  st: Statement,
  opts: { companyName?: string; customerName: string; from?: string; to?: string }
): string {
  const line = '------------------------------';
  const out: string[] = [];
  out.push(`${opts.companyName ? opts.companyName + ' — ' : ''}HESAP EKSTRESİ`);
  out.push(`Sayın ${opts.customerName}`);
  const period = opts.from
    ? `${formatDate(opts.from)} - ${formatDate(opts.to || todayStr())}`
    : `Tüm hareketler (${formatDate(opts.to || todayStr())} itibarıyla)`;
  out.push(`Dönem: ${period}`);
  out.push(line);
  if (opts.from) out.push(`Devreden bakiye: ${formatMoney(st.opening)}`);
  st.rows.forEach(({ tx, balance }) => {
    const sign = tx.kind === 'borc' ? 'Borç' : 'Ödeme';
    out.push(`${formatDate(tx.date)}  ${tx.description}`);
    out.push(`   ${sign}: ${formatMoney(tx.amount)}   Bakiye: ${formatMoney(balance)}`);
  });
  if (st.rows.length === 0) out.push('Bu dönemde hareket yok.');
  out.push(line);
  out.push(`Toplam borç: ${formatMoney(st.totalBorc)}`);
  out.push(`Toplam ödeme: ${formatMoney(st.totalTahsilat)}`);
  out.push(`GÜNCEL BAKİYE: ${formatMoney(Math.abs(st.closing))} (${balanceLabel(st.closing)})`);
  return out.join('\n');
}

// ===================== SOHBET AYRIŞTIRICI =====================
// Yazılan serbest metinden (ör. "İzmir seferi 12.500 TL", "Ahmet bey 5 bin ödedi",
// "dün otoban 450 masraf") tutar, tür, tarih ve açıklama çıkarır.

export interface ParsedEntry {
  kind: CustomerTxKind;
  amount: number;
  description: string;
  date: string;
  guessed: boolean;  // tür anahtar kelimeden bulunamadıysa true
}

const L = 'a-zA-ZçğıöşüÇĞİÖŞÜâîû';

const MONTHS: Record<string, number> = {
  ocak: 1, şubat: 2, subat: 2, mart: 3, nisan: 4, mayıs: 5, mayis: 5, haziran: 6,
  temmuz: 7, ağustos: 8, agustos: 8, eylül: 9, eylul: 9, ekim: 10, kasım: 11, kasim: 11, aralık: 12, aralik: 12,
};

const MASRAF_STRONG = ['masraf', 'gider', 'harcama', 'harcad', 'ödedim', 'ödedik', 'odedim', 'odedik', 'verdim', 'verdik', 'ödeme yaptım', 'ödeme yaptık'];
const TAHSILAT_STRONG = ['tahsil', 'ödedi', 'odedi', 'ödeme yaptı', 'ödeme geldi', 'para geldi', 'yatırdı', 'yatirdi', 'yatırıldı', 'gönderdi', 'gonderdi', 'havale', 'eft', 'fast', 'avans', 'çek verdi', 'çek geldi', 'senet'];
const MASRAF_NOUNS = ['yakıt', 'yakit', 'mazot', 'motorin', 'benzin', 'otoban', 'otoyol', 'köprü', 'kopru', 'hgs', 'ogs', 'hamal', 'hammal', 'yemek', 'otopark', 'tamir', 'bakım', 'lastik', 'harcırah', 'ceza', 'komisyon', 'şoför', 'sofor', 'yevmiye', 'konaklama', 'otel', 'feribot', 'kantar', 'tartı', 'vize', 'yağ', 'yıkama'];
const TAHSILAT_WEAK = ['aldım', 'aldık', 'alındı', 'aldim', 'aldik', 'alindi', 'ödeme', 'odeme', 'nakit'];
const BORC_WORDS = ['fatura', 'sefer', 'nakliye', 'navlun', 'taşıma', 'tasima', 'borç', 'borc', 'yük', 'yuk', 'iş', 'ücret', 'ucret', 'hizmet', 'kira', 'kesild', 'kestik', 'kesti', 'teslim', 'parsiyel', 'komple'];

function trLower(s: string): string {
  return s.replace(/I/g, 'ı').replace(/İ/g, 'i').toLowerCase();
}

function hasKeyword(text: string, words: string[], keywords: string[]): boolean {
  return keywords.some(k => (k.includes(' ') ? text.includes(k) : words.some(w => w.startsWith(k))));
}

export function detectKind(text: string): CustomerTxKind | null {
  const lower = trLower(text);
  const words = lower.split(new RegExp(`[^${L}]+`)).filter(Boolean);
  if (hasKeyword(lower, words, MASRAF_STRONG)) return 'masraf';
  if (hasKeyword(lower, words, TAHSILAT_STRONG)) return 'tahsilat';
  if (hasKeyword(lower, words, MASRAF_NOUNS)) return 'masraf';
  if (hasKeyword(lower, words, TAHSILAT_WEAK)) return 'tahsilat';
  if (hasKeyword(lower, words, BORC_WORDS)) return 'borc';
  return null;
}

// Metindeki tarihi bulur, metinden çıkarır
function extractDate(text: string): { date: string | null; rest: string } {
  const lower = trLower(text);
  const relative: [RegExp, number][] = [
    [new RegExp(`(^|[^${L}])(evvelsi gün|önceki gün)(?![${L}])`), -2],
    [new RegExp(`(^|[^${L}])(dün)(?![${L}])`), -1],
    [new RegExp(`(^|[^${L}])(bugün)(?![${L}])`), 0],
  ];
  for (const [re, offset] of relative) {
    const m = lower.match(re);
    if (m && m.index !== undefined) {
      const start = m.index + m[1].length;
      return { date: todayStr(offset), rest: text.slice(0, start) + text.slice(start + m[2].length) };
    }
  }

  const build = (d: number, mo: number, y?: number): string | null => {
    const now = new Date();
    let year = y ? (y < 100 ? 2000 + y : y) : now.getFullYear();
    let date = new Date(year, mo - 1, d);
    if (date.getMonth() !== mo - 1 || date.getDate() !== d) return null;
    // Yıl yazılmadıysa ve tarih 1 aydan fazla ileride kalıyorsa geçen yıl kabul et
    if (!y && date.getTime() - now.getTime() > 31 * 86400000) {
      year -= 1;
      date = new Date(year, mo - 1, d);
    }
    return toDateStr(date);
  };

  // 15.09 / 15.09.2026 / 15/09/26
  const numeric = /(^|[^\d.,])(\d{1,2})[./](\d{1,2})(?:[./](\d{4}|\d{2}))?(?![\d])/;
  let m = text.match(numeric);
  if (m && m.index !== undefined) {
    const date = build(Number(m[2]), Number(m[3]), m[4] ? Number(m[4]) : undefined);
    if (date) {
      const start = m.index + m[1].length;
      return { date, rest: text.slice(0, start) + text.slice(m.index + m[0].length) };
    }
  }

  // 15 eylül / 15 eylülde / 15 eylül 2026
  const textual = new RegExp(`(^|[^\\d])(\\d{1,2})\\s+(${Object.keys(MONTHS).join('|')})[${L}]*(?:\\s+(\\d{4}))?`);
  m = lower.match(textual);
  if (m && m.index !== undefined) {
    const date = build(Number(m[2]), MONTHS[m[3]], m[4] ? Number(m[4]) : undefined);
    if (date) {
      const start = m.index + m[1].length;
      return { date, rest: text.slice(0, start) + text.slice(m.index + m[0].length) };
    }
  }
  return { date: null, rest: text };
}

interface AmountMatch {
  value: number;
  start: number;
  end: number;
  score: number;
}

function findAmounts(text: string): AmountMatch[] {
  const re = new RegExp(
    `(\\d{1,3}(?:\\.\\d{3})+|\\d+)(?:,(\\d{1,2}))?(?:\\s*(bin|milyon|k)(?![${L}]))?(?:\\s*(tl|₺|lira|try)(?![${L}]))?`,
    'gi'
  );
  const result: AmountMatch[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    let value = Number(m[1].replace(/\./g, '') + (m[2] ? '.' + m[2] : ''));
    const mult = m[3] ? trLower(m[3]) : '';
    if (mult === 'bin' || mult === 'k') value *= 1000;
    if (mult === 'milyon') value *= 1000000;
    if (!value) continue;
    const score = (m[4] ? 2 : 0) + (mult ? 1 : 0);
    result.push({ value, start: m.index, end: m.index + m[0].length, score });
  }
  return result;
}

function cleanDescription(s: string): string {
  const cleaned = s
    .replace(/\s+/g, ' ')
    .replace(/^[\s,.;:\-–+]+|[\s,.;:\-–+]+$/g, '')
    .trim();
  if (!cleaned) return '';
  const first = cleaned.charAt(0);
  return (first === 'i' ? 'İ' : first === 'ı' ? 'I' : first.toUpperCase()) + cleaned.slice(1);
}

export function parseChatMessage(text: string): ParsedEntry[] {
  const { date: globalDate, rest } = extractDate(text);
  const messageKind = detectKind(rest);

  // Satır, noktalı virgül veya "virgül + boşluk" ile parçala
  const segments = rest.split(/\n|;|,\s+/).map(s => s.trim()).filter(Boolean);

  const entries: ParsedEntry[] = [];
  let pendingDesc = '';
  segments.forEach(seg => {
    const segDate = extractDate(seg);
    const segText = segDate.rest;
    const amounts = findAmounts(segText);
    if (amounts.length === 0) {
      // Tutarsız parça: önceki kaydın açıklamasına ekle, yoksa sonrakine taşı
      const last = entries[entries.length - 1];
      if (last) last.description = cleanDescription(`${last.description}, ${segText}`);
      else pendingDesc = `${pendingDesc} ${segText}`;
      return;
    }
    // En olası tutar: TL/bin ifadesi olan, yoksa en büyüğü
    const best = amounts.reduce((a, b) => (b.score > a.score || (b.score === a.score && b.value > a.value) ? b : a));
    const descRaw = `${pendingDesc} ${segText.slice(0, best.start)} ${segText.slice(best.end)}`;
    pendingDesc = '';
    const kind = detectKind(seg) ?? messageKind;
    entries.push({
      kind: kind ?? 'borc',
      amount: Math.round(best.value * 100) / 100,
      description: cleanDescription(descRaw),
      date: segDate.date ?? globalDate ?? todayStr(),
      guessed: kind === null,
    });
  });

  entries.forEach(e => {
    if (!e.description) e.description = KIND_LABELS[e.kind];
  });
  return entries;
}
