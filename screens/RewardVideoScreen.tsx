import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { VideoView, useVideoPlayer } from 'expo-video';

import { PrimaryButton } from '../components/PrimaryButton';
import type { DogState } from '../types';

type RewardVideoScreenProps = {
  dogState: DogState;
  videoUrl: string;
  title?: string;
  description?: string;
  onGoHome: () => void;
};

export function RewardVideoScreen({
  dogState,
  videoUrl,
  title = '특별 에피소드',
  description,
  onGoHome,
}: RewardVideoScreenProps) {
  const player = useVideoPlayer({ uri: videoUrl }, (p) => {
    p.loop = false;
    p.muted = false;
    p.play();
  });

  useEffect(() => {
    try {
      player.replace({ uri: videoUrl });
      player.loop = false;
      player.muted = false;
      player.play();
    } catch {
      //
    }
  }, [videoUrl, player]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.emoji}>🎁</Text>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>
          {description ?? `${dogState.name}의 새로운 에피소드가 열렸어요.`}
        </Text>
      </View>

      <View style={styles.videoCard}>
        <VideoView
          player={player}
          style={styles.video}
          contentFit="cover"
          nativeControls
          allowsFullscreen
          allowsPictureInPicture={false}
        />
      </View>

      <View style={styles.bottomSection}>
        <Text style={styles.rewardText}>
          오늘 5km를 걸어서 받은 특별한 보상이야.
        </Text>

        <PrimaryButton label="홈으로 돌아가기" onPress={onGoHome} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    paddingHorizontal: 24,
    paddingTop: 48,
    paddingBottom: 28,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  emoji: {
    fontSize: 44,
    marginBottom: 10,
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 23,
    color: '#CFCFCF',
    textAlign: 'center',
  },
  videoCard: {
    flex: 1,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#151515',
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  bottomSection: {
    marginTop: 20,
  },
  rewardText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#A7A7A7',
    textAlign: 'center',
    marginBottom: 16,
  },
});
