import AsyncStorage from '@react-native-async-storage/async-storage';

// Save data
export const setStorage = async (key: string, value: string) => {
  try {
    await AsyncStorage.setItem(key, value);
  } catch (e) {
    console.log('setStorage', e);
  }
};

// Retrieve data
export const getStorage = async (key: string): Promise<string | undefined> => {
  try {
    const value = await AsyncStorage.getItem(key);
    if (value !== null) {
      // value previously stored
      return value; // Return the value if needed
    }
  } catch (e) {
    console.log('getStorage', e);
  }
  return undefined;
};

export const removeStorage = async (key: string) => {
  try {
    await AsyncStorage.removeItem(key);
    console.log(`Storage item with key "${key}" removed.`);
  } catch (e) {
    console.log('removeStorage', e);
  }
};
