import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { Clock, X, Search } from 'lucide-react-native';

interface SearchHistoryListProps {
  searchHistory: string[];
  onSelectHistoryItem: (query: string) => void;
  onClearHistory: () => void;
}

const SearchHistoryList: React.FC<SearchHistoryListProps> = ({
  searchHistory,
  onSelectHistoryItem,
  onClearHistory
}) => {
  if (searchHistory.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Clock size={30} color="#9CA3AF" />
        <Text style={styles.emptyText}>No recent searches</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Recent Searches</Text>
        <TouchableOpacity onPress={onClearHistory}>
          <Text style={styles.clearButton}>Clear All</Text>
        </TouchableOpacity>
      </View>
      
      <FlatList
        data={searchHistory}
        keyExtractor={(item, index) => `history-${index}-${item}`}
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={styles.historyItem}
            onPress={() => onSelectHistoryItem(item)}
          >
            <Clock size={16} color="#6B7280" style={styles.historyIcon} />
            <Text style={styles.historyText}>{item}</Text>
          </TouchableOpacity>
        )}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    marginVertical: 10,
    marginHorizontal: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4B5563',
  },
  clearButton: {
    fontSize: 14,
    color: '#4BB377',
    fontWeight: '500',
  },
  listContent: {
    paddingBottom: 5,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  historyIcon: {
    marginRight: 10,
  },
  historyText: {
    fontSize: 15,
    color: '#1F2937',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    marginVertical: 10,
    marginHorizontal: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  emptyText: {
    fontSize: 16,
    color: '#9CA3AF',
    marginTop: 10,
  },
});

export default SearchHistoryList;