import React, { useCallback, useEffect, useState, useMemo, memo } from 'react';
import { View, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Menu, Text } from 'react-native-paper';
import { useCallStore } from '@/src/store/cart.store';
import { useTranslation } from 'react-i18next';
import { getStorage, setStorage } from '@/src/store/storage';
import { Image } from './ui/Image';
import { IMenuCategory } from '@/src/types';
import { defaultColor, accentColor } from '@/src/constants/Colors';
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
  const { participant, setParticipant } = useCallStore();
  const [visible, setVisible] = useState(false);
  const { i18n } = useTranslation('language');
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
    <View style={styles.header}>
      <View style={styles.left}>
        <Text style={styles.title}>{activeCategoryName}</Text>
      </View>

      <View style={styles.right}>
        {tableName ? (
          <View style={styles.tableBadge}>
            <Text style={styles.tableText}>{tableName}</Text>
          </View>
        ) : null}

        <Menu
          visible={visible}
          onDismiss={() => setVisible(false)}
          contentStyle={styles.menuContent}
          anchor={
            <TouchableOpacity onPress={() => setVisible(true)} style={styles.langButton} activeOpacity={0.7}>
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
                      <Text style={styles.countryLabel}>{country.label}</Text>
                    </>
                  )}
                </View>
              }
            />
          ))}
        </Menu>
      </View>
    </View>
  );
};

export default memo(Header);

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  left: { flexDirection: 'row', alignItems: 'center' },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: accentColor,
    letterSpacing: 0.5,
  },
  right: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  tableBadge: {
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 20,
    paddingVertical: 6,
    borderRadius: 20,
  },
  tableText: { fontSize: 18, color: accentColor, fontWeight: '700', letterSpacing: 0.5 },
  langButton: {
    padding: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#EBEBEB',
    overflow: 'hidden',
  },
  flag: { height: 24, width: 36, borderRadius: 3 },
  menuContent: { borderRadius: 12, marginTop: 4 },
  menuItem: { paddingVertical: 4 },
  menuRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  countryLabel: { fontSize: 14, fontWeight: '600', color: accentColor },
});
