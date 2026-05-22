import { StyleSheet, Switch, Text, View } from 'react-native';

import { NEARBY_WALKER_RADIUS_M } from '../constants/nearbyWalkerApi';

type Props = {
  value: boolean;
  onValueChange: (enabled: boolean) => void;
  disabled?: boolean;
  /** 산책 습관 등 밝은 배경 이미지 위 — 설명 글 #ffffff */
  lightDescription?: boolean;
};

export function NearbyWalkerAlertsSwitch({
  value,
  onValueChange,
  disabled = false,
  lightDescription = false,
}: Props) {
  return (
    <View style={[styles.row, disabled && styles.rowDisabled]}>
      <View style={styles.textCol}>
        <Text style={styles.title}>근처 산책자 알림</Text>
        <Text
          style={[
            styles.subtitle,
            lightDescription && styles.subtitleOnLightBg,
          ]}
        >
          산책 중 {NEARBY_WALKER_RADIUS_M}m 이내 이성 walky 유저가 있으면 짖는 소리와
          함께 알려드려요.
        </Text>
        {disabled ? (
          <Text
            style={[
              styles.hint,
              lightDescription && styles.hintOnLightBg,
            ]}
          >
            회원정보에 성별이 있어야 켤 수 있어요.
          </Text>
        ) : null}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ false: '#555', true: '#F59E0B' }}
        thumbColor="#fff"
        ios_backgroundColor="#555"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rowDisabled: {
    opacity: 0.72,
  },
  textCol: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    lineHeight: 17,
    color: '#B8B8B8',
  },
  subtitleOnLightBg: {
    color: '#ffffff',
  },
  hint: {
    marginTop: 6,
    fontSize: 11,
    fontWeight: '600',
    color: '#F59E0B',
  },
  hintOnLightBg: {
    color: '#ffffff',
  },
});
