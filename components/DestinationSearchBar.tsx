import React from 'react';
import { View, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
import { Search } from 'lucide-react-native';

interface DestinationSearchBarProps {
  onSearch: (text: string) => void;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  onSubmitEditing?: () => void;
  showSearchIcon?: boolean;
}

export default function DestinationSearchBar({
  onSearch,
  value,
  onChangeText,
  placeholder = 'Tell Tappy your stop!',
  onSubmitEditing,
  showSearchIcon = true
}: DestinationSearchBarProps) {
  return (
    <View style={styles.container}>
      <View style={styles.searchBar}>
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          value={value}
          onChangeText={onChangeText}
          onSubmitEditing={() => {
            onSearch(value);
            onSubmitEditing?.();
          }}
          placeholderTextColor="#9CA3AF"
          returnKeyType="search"
          autoCapitalize="none"
          autoCorrect={false}
        />
        {showSearchIcon && (
          <TouchableOpacity 
            style={styles.searchButton}
            onPress={() => onSearch(value)}
          >
            <Search size={20} color="#FFFFFF" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingHorizontal: 15,
    marginVertical: 10,
  },
  searchBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 30,
    paddingLeft: 15,
    paddingRight: 5,
    paddingVertical: 5,
    alignItems: 'center',
    height: 50,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#4B5563',
    paddingVertical: 8,
  },
  searchButton: {
    backgroundColor: '#4BB377',
    borderRadius: 25,
    padding: 8,
    marginLeft: 5,
  },
});