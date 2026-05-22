import { StyleSheet, Switch, Text, View } from 'react-native';

type Props = {
  value: boolean;
  onValueChange: (enabled: boolean) => void;
  disabled?: boolean;
};

/** 산책 화면 상단용 — 작은 근처 산책자 알림 토글 */
export function WalkNearbyAlertsToggle({
  value,
  onValueChange,
  disabled = false,
}: Props) {
  return (
    <View style={[styles.wrap, disabled && styles.wrapDisabled]}>
      <Text style={styles.label}>근처 알림</Text>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ false: 'rgba(255,255,255,0.35)', true: '#F59E0B' }}
        thumbColor="#fff"
        ios_backgroundColor="rgba(255,255,255,0.25)"
        style={styles.switch}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  wrapDisabled: {
    opacity: 0.65,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.92)',
  },
  switch: {
    transform: [{ scaleX: 0.82 }, { scaleY: 0.82 }],
  },
});
