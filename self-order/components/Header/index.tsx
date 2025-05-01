import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity, ActivityIndicator, Pressable } from 'react-native';
import { Menu, Text } from 'react-native-paper';
import { useCallStore } from '@/cache/cart.store';
import { useTranslation } from 'react-i18next';
import { getStorage, setStorage } from '@/cache';
import { Image } from '../image';
import { IMenuCategory } from '@/types';
import { defaultColor } from '@/constants/Colors';
import CustomMessageIcon from '@/assets/collapsedMenu';
import CustomReplyIcon from '@/assets/unCollapsedMenu';

interface Country {
  label: string;
  value: string;
  i18n: string;
  path: any;
}

interface HeaderProps {
  categories: IMenuCategory[];
  activeIndex: number;
  collapsedMenu: boolean;
  setCollapsedMenu: React.Dispatch<React.SetStateAction<boolean>>;
  refreshLanguage: () => void;
}

// Pre-defined country list outside component to avoid recreation
const countryList: Country[] = [
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

// Create a map for faster lookups
const countryByLanguage: Record<string, Country> = countryList.reduce((map: Record<string, Country>, country) => {
  map[country.i18n] = country;
  return map;
}, {});

const Header: React.FC<HeaderProps> = ({
  categories,
  activeIndex,
  refreshLanguage,
  collapsedMenu,
  setCollapsedMenu,
}) => {
  const { participant } = useCallStore();
  const [visible, setVisible] = useState<boolean>(false);
  const { i18n } = useTranslation('language');
  const [loading, setLoading] = useState<boolean>(false);

  const [selectedCountry, setSelectedCountry] = useState<Country>(countryByLanguage['en'] || countryList[0]);

  const loadLanguageSetting = useCallback(async () => {
    try {
      const cachedLanguage = await getStorage('language');

      if (cachedLanguage && countryByLanguage[cachedLanguage]) {
        setSelectedCountry(countryByLanguage[cachedLanguage]);
        i18n.changeLanguage(cachedLanguage.toLowerCase());
      } else if (countryByLanguage[i18n.language]) {
        setSelectedCountry(countryByLanguage[i18n.language]);
      }
    } catch (error) {
      console.error('Error loading language setting:', error);
    }
  }, [i18n]);

  // Load language setting once on mount
  useEffect(() => {
    loadLanguageSetting();
  }, [loadLanguageSetting]);

  const handleLanguageChange = useCallback(
    async (country: Country) => {
      try {
        setSelectedCountry(country);

        // Change language in i18n first for immediate UI update
        i18n.changeLanguage(country.i18n.toLowerCase());

        // Then save to storage (don't await this operation to avoid delay)
        setStorage('language', country.i18n.toLowerCase()).catch((err) =>
          console.error('Error saving language setting:', err),
        );

        // Close the menu
        setVisible(false);
        setLoading(false);
      } catch (error) {
        console.error('Error changing language:', error);
      }
    },
    [i18n],
  );

  const toggleMenu = useCallback(() => {
    console.log('toggleMenu');
    setVisible((prev) => !prev);
  }, []);

  // Get active category name with fallback
  const activeCategoryName = useMemo(() => {
    return categories[activeIndex]?.name?.toLocaleUpperCase() || 'MENU';
  }, [categories, activeIndex]);

  // Memoize participant table name
  const tableName = useMemo(() => {
    return participant?.table?.name?.toLocaleUpperCase() || '';
  }, [participant?.table?.name]);

  const hideMenu = useCallback(() => {
    setCollapsedMenu(true);
  }, [setCollapsedMenu]);

  const showMenu = useCallback(() => {
    setCollapsedMenu(false);
  }, [setCollapsedMenu]);

  return (
    <View style={styles.header}>
      <View style={styles.leftContainer}>
        <View>
          {/* {collapsedMenu ? (
            <Pressable onPress={showMenu}>
              <View
                style={{
                  padding: 2,
                }}
              >
                <CustomReplyIcon color={'#696969'} size={26} />
              </View>
            </Pressable>
          ) : (
            <Pressable onPress={hideMenu}>
              <View
                style={{
                  padding: 2,
                }}
              >
                <CustomMessageIcon color={'#696969'} size={26} />
              </View>
            </Pressable>
          )} */}
        </View>

        <Text variant="titleMedium" style={styles.titleText}>
          {activeCategoryName}
        </Text>
      </View>

      <View style={styles.rightContainer}>
        {tableName && <Text style={styles.tableText}>{tableName}</Text>}

        <View style={styles.cart}>
          <Menu
            visible={visible}
            onDismiss={toggleMenu}
            anchor={
              <TouchableOpacity
                onPress={() => {
                  setVisible((prev) => !prev);
                }}
                style={styles.languageButton}
              >
                <Image source={selectedCountry.path} style={styles.flagImage} />
              </TouchableOpacity>
            }
          >
            {countryList.map((country) => (
              <Menu.Item
                key={country.i18n}
                onPress={() => {
                  setLoading(true);
                  console.log('Selected setLoading:', true);
                  refreshLanguage();
                  handleLanguageChange(country);
                }}
                title={
                  <View style={styles.menuItemContainer}>
                    {loading ? (
                      <ActivityIndicator size="large" color={defaultColor} />
                    ) : (
                      <>
                        <Image source={country.path} style={styles.flagImage} />
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
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 10,
  },
  leftContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  titleText: {
    marginLeft: 10,
    fontSize: 20,
    fontWeight: '700',
  },
  refreshButton: {
    marginLeft: 12,
    padding: 4,
  },
  rightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  tableText: {
    fontSize: 20,
    color: '#333',
    fontWeight: '700',
  },
  cart: {
    position: 'relative',
  },
  languageButton: {
    flexDirection: 'row',
    padding: 10,
    alignItems: 'center',
  },
  flagImage: {
    height: 28,
    width: 42,
    borderRadius: 2,
  },
  menuItemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  countryLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
});

export default React.memo(Header);
