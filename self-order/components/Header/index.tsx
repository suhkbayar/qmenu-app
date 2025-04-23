import React, { useEffect, useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Menu, Text } from 'react-native-paper';
import { IMenuCategory } from '@/types';
import { useCallStore } from '@/cache/cart.store';
import { useTranslation } from 'react-i18next';
import { getStorage, setStorage } from '@/cache';
import { Image } from '../image';

type Props = {
  categories: IMenuCategory[];
  activeIndex: number;
};

const Header = ({ categories, activeIndex }: Props) => {
  const { participant } = useCallStore();
  const [visible, setVisible] = React.useState(false);
  const { i18n } = useTranslation('language');
  const [selectedCountry, setSelectedCountry] = useState({
    label: 'Mongolia',
    value: 'MN',
    i18n: 'mn',
    path: '../../assets/lang/MN.png',
  });

  const countryList = [
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

  useEffect(() => {
    const fetchLanguage = async () => {
      const cachedLanguage = await getStorage('language');
      if (cachedLanguage) {
        const foundCountry = countryList.find((country: any) => country.i18n === cachedLanguage);

        if (foundCountry) {
          setSelectedCountry(foundCountry);
          if (cachedLanguage) {
            i18n.changeLanguage(cachedLanguage.toLowerCase());
          }
        }
      } else {
        const foundedCountry = countryList.find((country: any) => country.i18n === i18n.language);

        if (foundedCountry) {
          setSelectedCountry(foundedCountry);
          i18n.changeLanguage(foundedCountry.i18n.toLowerCase());
        }
      }
    };
    fetchLanguage();
  }, []);

  const activeCategoryName = categories[activeIndex]?.name ?? 'Menu';

  return (
    <View style={styles.header}>
      <Text variant="titleMedium" style={{ marginLeft: 10, fontSize: 18, fontWeight: 700 }}>
        {activeCategoryName.toLocaleUpperCase()}
      </Text>

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <Text
          style={{
            fontSize: 18,
            color: '#333',
            fontWeight: 700,
          }}
        >
          {participant?.table && participant?.table.name}
        </Text>
        <View style={styles.cart}>
          <Menu
            visible={visible}
            onDismiss={() => setVisible(false)}
            anchor={
              <TouchableOpacity
                onPress={() => {
                  setVisible(true);
                }}
                style={{ flexDirection: 'row', padding: 10, alignItems: 'center' }}
              >
                <Image
                  source={selectedCountry.path}
                  style={{
                    height: 22,
                    width: 32,
                    borderRadius: 2,
                  }}
                />
              </TouchableOpacity>
            }
          >
            {countryList.map((country) => (
              <Menu.Item
                key={country.i18n}
                onPress={async () => {
                  setSelectedCountry(country);
                  i18n.changeLanguage(country.i18n.toLowerCase());
                  await setStorage('language', country.i18n.toLowerCase());
                  setVisible(false);
                }}
                title={
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Image
                      source={country.path}
                      style={{
                        height: 22,
                        width: 32,
                        borderRadius: 2,
                      }}
                    />

                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: '500',
                      }}
                    >
                      {country.label}
                    </Text>
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
    padding: 10,
  },
  cart: {
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: 2,
    right: 2,
  },
});

export default Header;
