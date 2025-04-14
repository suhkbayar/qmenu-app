import { defaultColor } from '@/constants/Colors';
import { AuthContext } from '@/providers/auth';
import React, { useContext } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, IconButton } from 'react-native-paper';
import { router } from 'expo-router';
import { IMenuCategory } from '@/types';

type Props = {
  categories: IMenuCategory[];
  activeIndex: number;
};

const Header = ({ categories, activeIndex }: Props) => {
  const { signOut } = useContext(AuthContext);

  const activeCategoryName = categories[activeIndex]?.name ?? 'Menu';

  return (
    <View style={styles.header}>
      <Text variant="titleMedium" style={{ marginLeft: 10 }}>
        {activeCategoryName}
      </Text>
      <View style={styles.cart}>
        <IconButton
          icon="cog-outline"
          iconColor={defaultColor}
          size={24}
          onPress={() => {
            signOut();
            router.navigate('/');
          }}
        />
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
    padding: 8,
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
