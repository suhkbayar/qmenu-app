import React, { useCallback, useEffect, useState, useMemo, memo } from 'react';
import { View, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Icon, Menu, Text } from 'react-native-paper';
import { useCallStore } from '@/src/store/cart.store';
import { useTranslation } from 'react-i18next';
import { getStorage, setStorage } from '@/src/store/storage';
import { Image } from './ui/Image';
import GiftHeaderButton from '@/src/components/GiftHeaderButton';
import SitTogetherButton from '@/src/components/SitTogetherButton';
import { IMenuCategory } from '@/src/types';
import { defaultColor, accentColor } from '@/src/constants/Colors';
import { useThemeStore } from '@/src/store/theme.store';
import { useLazyQuery, useMutation, useQuery } from '@apollo/client';
import { UPDATE_PROFILE } from '@/src/graphql/mutations/register';
import { GET_BRANCH, ME } from '@/src/graphql/queries';
import { isEmpty } from 'lodash';

interface Country {
  label: string;
  value: string;
  i18n: string;
  path: any;
}

interface Props {
  categories: IMenuCategory[];
  activeIndex: number;
  activeParentId?: string | null;
  activeCategoryId?: string | null;
  collapsedMenu: boolean;
  setCollapsedMenu: React.Dispatch<React.SetStateAction<boolean>>;
  refreshLanguage: () => void;
}

export const countryList: Country[] = [
  { label: 'English', value: 'US', i18n: 'en', path: require('../../assets/lang/US.png') },
  { label: 'Монгол', value: 'MN', i18n: 'mn', path: require('../../assets/lang/MN.png') },
  { label: 'Svenska', value: 'SV', i18n: 'sv', path: require('../../assets/lang/SV.png') },
  { label: 'Россия', value: 'RU', i18n: 'ru', path: require('../../assets/lang/RU.png') },
  { label: '대한민국', value: 'KR', i18n: 'ko', path: require('../../assets/lang/KO.png') },
  { label: '中国', value: 'CN', i18n: 'zh', path: require('../../assets/lang/ZH.png') },
  { label: 'Deutschland', value: 'DE', i18n: 'de', path: require('../../assets/lang/DE.png') },
  { label: '日本', value: 'JP', i18n: 'ja', path: require('../../assets/lang/JA.png') },
  { label: 'France', value: 'FR', i18n: 'fr', path: require('../../assets/lang/FR.png') },
  { label: 'Uzbek', value: 'UZ', i18n: 'uz', path: require('../../assets/lang/UZ.png') },
];

const countryByLang = countryList.reduce<Record<string, Country>>((map, c) => {
  map[c.i18n] = c;
  return map;
}, {});

const findCategoryName = (categories: IMenuCategory[], id: string | null | undefined): string | null => {
  if (!id) return null;
  for (const cat of categories) {
    if (cat.id === id) return cat.name;
    const child = cat.children?.find((c: any) => c.id === id);
    if (child) return child.name;
  }
  return null;
};

const Header: React.FC<Props> = ({
  categories,
  activeIndex,
  refreshLanguage,
  collapsedMenu,
  setCollapsedMenu,
  activeParentId,
  activeCategoryId,
}) => {
  const participant = useCallStore((s) => s.participant);
  const setParticipant = useCallStore((s) => s.setParticipant);
  const config = useCallStore((s) => s.config);
  const giftEnabled = config?.giftOrder === true;
  const sitEnabled = config?.sitTogether === true;
  const { theme, isDark, toggleTheme } = useThemeStore();
  const [visible, setVisible] = useState(false);
  const { t, i18n } = useTranslation('language');
  const [loading, setLoading] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<Country>(countryByLang['en'] || countryList[0]);

  const { data: userData } = useQuery(ME, {
    onCompleted(data) {
      if (data?.me?.language) {
        const lang = data.me.language.toLowerCase();
        i18n.changeLanguage(lang);
        if (countryByLang[lang]) setSelectedCountry(countryByLang[lang]);
      }
    },
  });

  const [getBranch] = useLazyQuery(GET_BRANCH, {
    fetchPolicy: 'network-only',
    onCompleted(data) {
      if (data?.getParticipant) {
        setParticipant(data.getParticipant);
        refreshLanguage();
      }
      setLoading(false);
    },
    onError() {
      setLoading(false);
    },
  });

  const [updateProfile] = useMutation(UPDATE_PROFILE, {
    update(cache, { data: { updateProfile } }) {
      const caches = cache.readQuery<{ me: any }>({ query: ME });
      if (caches?.me) {
        cache.writeQuery({ query: ME, data: { me: caches.me.id === updateProfile.id ? updateProfile : caches.me } });
      }
    },
    onCompleted: () => {
      if (participant?.id) getBranch({ variables: { id: participant.id } });
      else setLoading(false);
    },
    onError() {
      setLoading(false);
    },
  });

  const availableLanguages = useMemo(() => {
    const langs = participant?.branch?.languages?.map((l: string) => l.toLowerCase()) || [];
    return langs.length === 0 ? countryList : countryList.filter((c) => langs.includes(c.i18n.toLowerCase()));
  }, [participant?.branch?.languages]);

  useEffect(() => {
    const loadLang = async () => {
      const cached = await getStorage('language');
      if (cached && countryByLang[cached]) {
        setSelectedCountry(countryByLang[cached]);
        i18n.changeLanguage(cached.toLowerCase());
      } else if (countryByLang[i18n.language]) setSelectedCountry(countryByLang[i18n.language]);
    };
    loadLang();
  }, []);

  const handleLanguageChange = useCallback(
    async (country: Country) => {
      setLoading(true);
      setSelectedCountry(country);
      setVisible(false);
      i18n.changeLanguage(country.i18n.toLowerCase());
      await setStorage('language', country.i18n.toLowerCase());
      updateProfile({
        variables: {
          input: {
            firstName: userData?.me?.firstName,
            lastName: userData?.me?.lastName,
            gender: userData?.me?.gender,
            birthday: null,
            email: isEmpty(userData?.me?.email) ? null : userData?.me?.email,
            language: country.i18n.toUpperCase(),
          },
        },
      });
    },
    [i18n, userData, updateProfile],
  );

  const activeCategoryName = useMemo(() => {
    const name =
      findCategoryName(categories, activeParentId) ||
      categories[activeIndex]?.name ||
      findCategoryName(categories, activeCategoryId) ||
      'MENU';
    return name.toLocaleUpperCase();
  }, [categories, activeIndex, activeParentId, activeCategoryId]);

  const tableName = useMemo(() => participant?.table?.name?.toLocaleUpperCase() || '', [participant?.table?.name]);

  return (
    <View style={[styles.wrap, { backgroundColor: theme.background, borderBottomColor: theme.border }]}>
      <View style={styles.header}>
        <View style={styles.left}>
          <Text style={[styles.title, { color: theme.text }]}>{activeCategoryName}</Text>
        </View>

        <View style={styles.right}>
          {tableName ? (
            <View style={[styles.headerBtn, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}>
              <Text style={[styles.tableText, { color: theme.text }]}>{tableName}</Text>
            </View>
          ) : null}

          {giftEnabled && <GiftHeaderButton />}
          {sitEnabled && <SitTogetherButton />}

          <TouchableOpacity
            onPress={toggleTheme}
            style={[styles.headerBtn, { borderColor: theme.border, backgroundColor: theme.backgroundSecondary }]}
            activeOpacity={0.7}
          >
            <Icon source={isDark ? 'weather-sunny' : 'weather-night'} size={28} color={theme.text} />
          </TouchableOpacity>

          <Menu
            visible={visible}
            onDismiss={() => setVisible(false)}
            contentStyle={[styles.menuContent, { backgroundColor: theme.card }]}
            anchor={
              <TouchableOpacity
                onPress={() => setVisible(true)}
                style={[styles.headerBtn, { borderColor: theme.border, backgroundColor: theme.backgroundSecondary }]}
                activeOpacity={0.7}
              >
                <Image source={selectedCountry.path} style={styles.flag} />
              </TouchableOpacity>
            }
          >
            {availableLanguages.map((country) => (
              <Menu.Item
                key={country.i18n}
                onPress={() => handleLanguageChange(country)}
                style={styles.menuItem}
                title={
                  <View style={styles.menuRow}>
                    {loading && selectedCountry.i18n === country.i18n ? (
                      <ActivityIndicator size="small" color={defaultColor} />
                    ) : (
                      <>
                        <Image source={country.path} style={styles.flag} />
                        <Text style={[styles.countryLabel, { color: theme.text }]}>{country.label}</Text>
                      </>
                    )}
                  </View>
                }
              />
            ))}
          </Menu>
        </View>
      </View>

    </View>
  );
};

export default memo(Header);

const styles = StyleSheet.create({
  wrap: { borderBottomWidth: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 22,
  },
  left: { flexDirection: 'row', alignItems: 'center' },
  title: {
    fontSize: 25,
    fontWeight: '800',
    color: accentColor,
    letterSpacing: 0.5,
  },
  right: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  headerBtn: {
    height: 58,
    minWidth: 58,
    paddingHorizontal: 18,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  tableText: { fontSize: 19, color: accentColor, fontWeight: '700', letterSpacing: 0.5 },
  flag: { height: 26, width: 38, borderRadius: 4 },
  menuContent: { borderRadius: 14, marginTop: 4 },
  menuItem: { paddingVertical: 6 },
  menuRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  countryLabel: { fontSize: 16, fontWeight: '600', color: accentColor },
});
