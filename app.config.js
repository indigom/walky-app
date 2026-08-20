const appJson = require('./app.json');

/** Google 공식 테스트 앱 ID — 운영 시 EXPO_PUBLIC_ADMOB_* 로 실제 AdMob 앱 ID 지정 */
const ADMOB_ANDROID_APP_ID =
  process.env.EXPO_PUBLIC_ADMOB_ANDROID_APP_ID?.trim() ||
  'ca-app-pub-3940256099942544~3347511713';
const ADMOB_IOS_APP_ID =
  process.env.EXPO_PUBLIC_ADMOB_IOS_APP_ID?.trim() ||
  'ca-app-pub-3940256099942544~1458002511';

const plugins = appJson.expo.plugins.filter(
  (plugin) =>
    plugin !== 'react-native-google-mobile-ads' &&
    !(Array.isArray(plugin) && plugin[0] === 'react-native-google-mobile-ads')
);

plugins.push([
  'react-native-google-mobile-ads',
  {
    androidAppId: ADMOB_ANDROID_APP_ID,
    iosAppId: ADMOB_IOS_APP_ID,
  },
]);

module.exports = {
  expo: {
    ...appJson.expo,
    plugins,
  },
};
