import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const STAR_LEVELS = [5, 4, 3, 2, 1];

export default function DriverRatingCard({ averageRating, reviews = [] }) {
  const { counts, totalReviews } = useMemo(() => {
    const map = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    if (Array.isArray(reviews)) {
      for (const item of reviews) {
        const star = Number(item?.rating);
        if (star >= 1 && star <= 5) {
          map[star] = (map[star] || 0) + 1;
        }
      }
    }
    return {
      counts: map,
      totalReviews: Array.isArray(reviews) ? reviews.length : 0,
    };
  }, [reviews]);

  const numericAvg = Number(averageRating ?? 5.0);
  const displayRating = Number.isFinite(numericAvg) ? numericAvg.toFixed(1) : '5.0';

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.titleGroup}>
          <View style={styles.iconBox}>
            <Ionicons name="star" size={20} color="#F59E0B" />
          </View>
          <View>
            <Text style={styles.cardLabel}>ĐÁNH GIÁ SAO CỦA TÀI XẾ</Text>
            <Text style={styles.cardSub}>Căn cứ tính chiết khấu hoa hồng</Text>
          </View>
        </View>
        <View style={styles.totalPill}>
          <Text style={styles.totalPillText}>{totalReviews} lượt</Text>
        </View>
      </View>

      <View style={styles.bodyRow}>
        {/* Số sao trung bình */}
        <View style={styles.summaryBox}>
          <Text style={styles.avgValue}>{displayRating}</Text>
          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map((i) => {
              const iconName =
                numericAvg >= i
                  ? 'star'
                  : numericAvg >= i - 0.5
                    ? 'star-half'
                    : 'star-outline';
              return <Ionicons key={i} name={iconName} size={14} color="#F59E0B" />;
            })}
          </View>
          <Text style={styles.avgCaption}>Sao trung bình</Text>
        </View>

        {/* Phân bổ lượt đánh giá 5 -> 1 sao */}
        <View style={styles.breakdownBox}>
          {STAR_LEVELS.map((star) => {
            const count = counts[star] || 0;
            const percent = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
            return (
              <View key={star} style={styles.barRow}>
                <View style={styles.starLabelGroup}>
                  <Text style={styles.starNum}>{star}</Text>
                  <Ionicons name="star" size={11} color="#F59E0B" />
                </View>
                <View style={styles.barBg}>
                  <View style={[styles.barFill, { width: `${percent}%` }]} />
                </View>
                <Text style={styles.countText}>{count}</Text>
              </View>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  titleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  cardSub: {
    fontSize: 12,
    color: '#0F172A',
    fontWeight: '600',
    marginTop: 2,
  },
  totalPill: {
    backgroundColor: '#F1F5F9',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 20,
  },
  totalPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  bodyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  summaryBox: {
    width: 100,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    backgroundColor: '#FFFBEB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.25)',
  },
  avgValue: {
    fontSize: 30,
    fontWeight: '800',
    color: '#0F172A',
    lineHeight: 34,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 2,
    marginTop: 4,
  },
  avgCaption: {
    fontSize: 11,
    color: '#92400E',
    fontWeight: '600',
    marginTop: 4,
  },
  breakdownBox: {
    flex: 1,
    gap: 6,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  starLabelGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 26,
    justifyContent: 'flex-end',
    gap: 2,
  },
  starNum: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  barBg: {
    flex: 1,
    height: 7,
    backgroundColor: '#F1F5F9',
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    backgroundColor: '#F59E0B',
    borderRadius: 4,
  },
  countText: {
    width: 28,
    textAlign: 'right',
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
});
