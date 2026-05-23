import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ImageBackground,
  FlatList,
  Dimensions,
  TouchableOpacity,
  Pressable,
  Animated,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { getBreedSelectCardImageSource } from '../constants/breedSelectCardImages';
import type { DogState, Breed } from '../types';
import {
  downloadBreedAssets,
  removeBreedAssets,
} from '../assets/BreedAssetManager';

const { width, height } = Dimensions.get('window');

type BreedItem = {
  id: Breed;
  name: string;
  subtitle: string;
  description: string;
};

type HeartItem = {
  id: number;
  x: number;
  y: number;
  anim: Animated.Value;
};

type BreedSelectScreenProps = {
  dogState: DogState;
  setDogState: React.Dispatch<React.SetStateAction<DogState>>;
  onComplete: (breed: Breed) => void;
};

const DOG_BREEDS: BreedItem[] = [
  {
    id: 'corgi',
    name: '웰시코기',
    subtitle: '장난기 많고 활발한 친구',
    description: '짧은 다리로도 누구보다 신나게 하루를 따라와요.',
  },
  {
    id: 'shiba',
    name: '시바견',
    subtitle: '차분하지만 속정 깊은 친구',
    description: '혼자 있는 듯 보여도, 사실은 늘 곁을 신경 쓰는 아이예요.',
  },
  {
    id: 'retriever',
    name: '리트리버',
    subtitle: '밝고 다정한 산책 친구',
    description: '사람을 좋아하고, 함께 걷는 시간을 가장 행복해해요.',
  },
];

export function BreedSelectScreen({
  dogState,
  setDogState,
  onComplete,
}: BreedSelectScreenProps) {
  const initialIndex = DOG_BREEDS.findIndex(
    item => item.id === dogState.breed
  );

  const [currentIndex, setCurrentIndex] = useState(
    initialIndex >= 0 ? initialIndex : 0
  );

  const [hearts, setHearts] = useState<HeartItem[]>([]);
  const [downloading, setDownloading] = useState(false);

  const flatListRef = useRef<FlatList<BreedItem>>(null);

  const selectedBreed = DOG_BREEDS[currentIndex];

  const handleScrollEnd = (
    event: NativeSyntheticEvent<NativeScrollEvent>
  ) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / width);

    if (index >= 0 && index < DOG_BREEDS.length) {
      setCurrentIndex(index);
    }
  };

  const handlePet = (event: any) => {
    const { locationX, locationY } = event.nativeEvent;

    const id = Date.now();
    const anim = new Animated.Value(0);

    setHearts(prev => [
      ...prev,
      {
        id,
        x: locationX,
        y: locationY,
        anim,
      },
    ]);

    Animated.timing(anim, {
      toValue: 1,
      duration: 900,
      useNativeDriver: true,
    }).start(() => {
      setHearts(prev => prev.filter(heart => heart.id !== id));
    });
  };

  const handleSelectBreed = async () => {
    if (downloading) return;

    const previousBreed = dogState.breed;
    const nextBreed = selectedBreed.id;

    try {
      setDownloading(true);

      if (previousBreed && previousBreed !== nextBreed) {
        await removeBreedAssets(previousBreed);
      }

      await downloadBreedAssets(nextBreed);

      setDogState(prev => ({
        ...prev,
        breed: nextBreed,
      }));

      onComplete(nextBreed);
    } catch (error) {
      console.log('breed asset download error:', error);

      const detail =
        error instanceof Error ? error.message : '알 수 없는 오류';

      Alert.alert(
        '다운로드 실패',
        `강아지 영상을 다운로드하지 못했어요.\n\n${detail}\n\n서버(walky.co.kr)의 dogs/{견종}/manifest.json 이 깨져 있으면 FTP로 올바른 JSON을 다시 올려 주세요.`
      );
    } finally {
      setDownloading(false);
    }
  };

  const renderBreedCard = ({ item }: { item: BreedItem }) => {
    return (
      <View style={styles.slide}>
        <ImageBackground
          source={getBreedSelectCardImageSource(item.id)}
          style={styles.dogCard}
          imageStyle={styles.dogCardImage}
          resizeMode="cover"
        >
          <Pressable style={styles.dogTouchArea} onPress={handlePet}>
            {hearts.map(heart => {
              const translateY = heart.anim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, -80],
              });

              const opacity = heart.anim.interpolate({
                inputRange: [0, 0.7, 1],
                outputRange: [1, 1, 0],
              });

              const scale = heart.anim.interpolate({
                inputRange: [0, 0.3, 1],
                outputRange: [0.6, 1.2, 1],
              });

              return (
                <Animated.Text
                  key={heart.id}
                  style={[
                    styles.heart,
                    {
                      left: heart.x - 12,
                      top: heart.y - 12,
                      opacity,
                      transform: [{ translateY }, { scale }],
                    },
                  ]}
                >
                  ♥
                </Animated.Text>
              );
            })}
          </Pressable>

          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.35)', 'rgba(0,0,0,0.78)']}
            locations={[0.35, 0.65, 1]}
            style={styles.cardTextGradient}
            pointerEvents="none"
          />

          <View style={styles.cardTextBlock} pointerEvents="none">
            <Text style={styles.breedName}>{item.name}</Text>
            <Text style={styles.breedSubtitle}>{item.subtitle}</Text>
            <Text style={styles.breedDescription}>{item.description}</Text>
          </View>
        </ImageBackground>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>함께 걸을 친구를 만나보세요</Text>
        <Text style={styles.caption}>
          마음이 가는 아이를 쓰다듬어보고 선택해 주세요
        </Text>
      </View>

      <FlatList
        ref={flatListRef}
        data={DOG_BREEDS}
        keyExtractor={item => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        renderItem={renderBreedCard}
        onMomentumScrollEnd={handleScrollEnd}
        scrollEnabled={!downloading}
      />

      <View style={styles.indicatorWrap}>
        {DOG_BREEDS.map((item, index) => (
          <View
            key={item.id}
            style={[
              styles.indicator,
              currentIndex === index && styles.indicatorActive,
            ]}
          />
        ))}
      </View>

      <TouchableOpacity
        activeOpacity={0.85}
        style={[
          styles.startButton,
          downloading && styles.startButtonDisabled,
        ]}
        onPress={handleSelectBreed}
        disabled={downloading}
      >
        {downloading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color="#FFFFFF" />
            <Text style={styles.startButtonText}> 영상 다운로드 중...</Text>
          </View>
        ) : (
          <Text style={styles.startButtonText}>이 아이와 시작하기</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF7EF',
    paddingTop: 64,
    paddingBottom: 36,
  },

  header: {
    paddingHorizontal: 28,
    marginBottom: 16,
  },

  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#2B211C',
    lineHeight: 34,
  },

  caption: {
    marginTop: 10,
    fontSize: 15,
    color: '#8A7467',
    lineHeight: 22,
  },

  slide: {
    width,
    alignItems: 'center',
    justifyContent: 'center',
  },

  dogCard: {
    width: width * 0.82,
    minHeight: height * 0.56,
    borderRadius: 36,
    overflow: 'hidden',
    backgroundColor: '#E8DDD4',
    justifyContent: 'flex-end',

    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 5,
  },

  dogCardImage: {
    borderRadius: 36,
  },

  dogTouchArea: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'visible',
  },

  cardTextGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '58%',
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
  },

  cardTextBlock: {
    paddingHorizontal: 24,
    paddingBottom: 28,
    paddingTop: 16,
    zIndex: 2,
  },

  heart: {
    position: 'absolute',
    fontSize: 28,
    color: '#FF6B8A',
    fontWeight: '700',
  },

  breedName: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },

  breedSubtitle: {
    marginTop: 8,
    fontSize: 16,
    fontWeight: '600',
    color: '#FCD9B8',
  },

  breedDescription: {
    marginTop: 12,
    fontSize: 15,
    lineHeight: 22,
    color: 'rgba(255,255,255,0.92)',
  },

  indicatorWrap: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 18,
    marginBottom: 24,
  },

  indicator: {
    width: 7,
    height: 7,
    borderRadius: 99,
    backgroundColor: '#E2CFC4',
    marginHorizontal: 5,
  },

  indicatorActive: {
    width: 22,
    backgroundColor: '#D98B5F',
  },

  startButton: {
    marginHorizontal: 28,
    height: 58,
    borderRadius: 999,
    backgroundColor: '#2B211C',
    alignItems: 'center',
    justifyContent: 'center',

    shadowColor: '#000',
    shadowOpacity: 0.14,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },

  startButtonDisabled: {
    opacity: 0.75,
  },

  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  startButtonText: {
    fontSize: 17,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});