import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, SectionList } from 'react-native';
import { Map, Bus, Train, X, MapPin } from 'lucide-react-native';
import { SearchResults } from '../types/lta-api';
import RouteCard from './RouteCard';

interface SearchResultsProps {
  results: SearchResults;
  onSelectBusStop: (stopId: string, stopName: string) => void;
  onSelectBusService: (service: any) => void;
  onSelectTrainStation: (station: any) => void;
  onToggleFavorite: (routeId: string) => void;
  onClose: () => void;
}

const SearchResultsComponent: React.FC<SearchResultsProps> = ({
  results,
  onSelectBusStop,
  onSelectBusService,
  onSelectTrainStation,
  onToggleFavorite,
  onClose
}) => {
  // Combine all results into sections
  const sections = [
    {
      title: 'Bus Stops',
      data: results.busStops,
      icon: <MapPin size={18} color="#4BB377" />,
      onSelect: onSelectBusStop,
      renderItem: ({ item }) => (
        <TouchableOpacity 
          style={styles.resultItem}
          onPress={() => onSelectBusStop(item.BusStopCode, item.Description)}
        >
          <MapPin size={18} color="#4BB377" style={styles.resultIcon} />
          <View style={styles.resultTextContainer}>
            <Text style={styles.resultTitle}>{item.Description}</Text>
            <Text style={styles.resultSubtitle}>{item.RoadName} (#{item.BusStopCode})</Text>
          </View>
        </TouchableOpacity>
      )
    },
    {
      title: 'Bus Services',
      data: results.busServices,
      icon: <Bus size={18} color="#4BB377" />,
      onSelect: onSelectBusService,
      renderItem: ({ item }) => (
        <RouteCard
          key={item.id}
          type={item.type}
          routeNumber={item.routeNumber}
          destination={item.destination}
          time={item.time}
          isFavorite={item.isFavorite}
          onPress={() => onSelectBusService(item)}
          onFavoriteToggle={() => onToggleFavorite(item.id)}
        />
      )
    },
    {
      title: 'Train Stations',
      data: results.trainStations,
      icon: <Train size={18} color="#4BB377" />,
      onSelect: onSelectTrainStation,
      renderItem: ({ item }) => (
        <TouchableOpacity 
          style={styles.resultItem}
          onPress={() => onSelectTrainStation(item)}
        >
          <Train size={18} color="#4BB377" style={styles.resultIcon} />
          <View style={styles.resultTextContainer}>
            <Text style={styles.resultTitle}>{item.StationName}</Text>
            <Text style={styles.resultSubtitle}>{getLineName(item.Line)} ({item.StationCode})</Text>
          </View>
        </TouchableOpacity>
      )
    }
  ].filter(section => section.data.length > 0);

  const totalResults = 
    results.busStops.length + 
    results.busServices.length + 
    results.trainStations.length;

  // If no results, show empty state
  if (totalResults === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Search Results</Text>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <X size={20} color="#6B7280" />
          </TouchableOpacity>
        </View>
        <View style={styles.emptyContainer}>
          <Map size={40} color="#9CA3AF" />
          <Text style={styles.emptyText}>No results found</Text>
          <Text style={styles.emptySubtext}>Try searching for a bus number, stop name, or train station</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Search Results ({totalResults})</Text>
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <X size={20} color="#6B7280" />
        </TouchableOpacity>
      </View>
      
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        renderItem={({ item, section }) => {
          // @ts-ignore - Type safety handled by filtering
          return section.renderItem({ item });
        }}
        renderSectionHeader={({ section: { title, icon } }) => (
          <View style={styles.sectionHeader}>
            {icon}
            <Text style={styles.sectionTitle}>{title}</Text>
          </View>
        )}
        stickySectionHeadersEnabled={true}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
};

// Helper function to get line name
const getLineName = (lineCode: string): string => {
  switch (lineCode) {
    case 'NSL': return 'North-South Line';
    case 'EWL': return 'East-West Line';
    case 'CCL': return 'Circle Line';
    case 'DTL': return 'Downtown Line';
    case 'NEL': return 'North East Line';
    case 'TEL': return 'Thomson-East Coast Line';
    default: return lineCode;
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  closeButton: {
    padding: 5,
  },
  listContent: {
    paddingBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingVertical: 8,
    paddingHorizontal: 15,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4B5563',
    marginLeft: 8,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  resultIcon: {
    marginRight: 12,
  },
  resultTextContainer: {
    flex: 1,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1F2937',
  },
  resultSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '500',
    color: '#6B7280',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 8,
  },
});

export default SearchResultsComponent;