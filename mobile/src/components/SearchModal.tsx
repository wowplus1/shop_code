import React, { useState } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  Modal, 
  TextInput, 
  TouchableOpacity, 
  FlatList, 
  Image, 
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform
} from 'react-native';

export default function SearchModal({ isOpen, onClose, onSelectProduct }) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [searched, setSearched] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) return;

    setLoading(true);
    setSearched(true);
    setResults([]);

    try {
      const clientId = "3GZMhpS_2U1c6HhGMeWk";
      const clientSecret = "rv0kU8KUOX";
      
      const response = await fetch(`https://openapi.naver.com/v1/search/shop.json?query=${encodeURIComponent(query.trim())}&display=5`, {
        headers: {
          'X-Naver-Client-Id': clientId,
          'X-Naver-Client-Secret': clientSecret,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Search failed');
      }

      const resData = await response.json();
      const items = resData.items || [];

      const parsedResults = items.map(item => {
        const cleanName = item.title
          ? item.title.replace(/<\/?[^>]+(>|$)/g, "").replace(/&quot;/g, '"').replace(/&amp;/g, '&')
          : "상품명 정보 없음";

        const lowPriceVal = parseInt(item.lprice) || 0;
        const shippingFeeVal = lowPriceVal < 30000 ? 3000 : 0;

        return {
          barcode: '',
          name: cleanName,
          image: item.image || "https://images.unsplash.com/photo-1595079676339-1534801ad6cf?auto=format&fit=crop&q=80&w=400",
          lowPrice: lowPriceVal,
          shippingFee: shippingFeeVal,
          mallName: item.mallName || "네이버쇼핑",
          link: item.link || `https://search.shopping.naver.com/search/all?query=${encodeURIComponent(cleanName)}`
        };
      });

      setResults(parsedResults);
    } catch (err) {
      console.error("Search Error: ", err);
    } finally {
      setLoading(false);
    }
  };

  const renderProductItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.productCard}
      onPress={() => {
        onSelectProduct(item);
        onClose();
      }}
    >
      <Image 
        source={{ uri: item.image || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=200' }} 
        style={styles.productImage}
      />
      <View style={styles.productDetails}>
        <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
        <Text style={styles.productMall}>{item.mallName}</Text>
        <View style={styles.priceRow}>
          <Text style={styles.productPrice}>{Number(item.lowPrice).toLocaleString()}원</Text>
          <Text style={styles.shippingText}>
            {item.shippingFee === 0 ? '무료배송' : `배송비 ${Number(item.shippingFee).toLocaleString()}원`}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={isOpen}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalContainer}
      >
        {/* 모달 헤더 */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>수동 상품 검색</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Text style={{ fontSize: 18, color: '#E1E1E6' }}>❌</Text>
          </TouchableOpacity>
        </View>

        {/* 검색 인풋 영역 */}
        <View style={styles.searchBar}>
          <Text style={{ fontSize: 18, color: '#8D8D99', marginRight: 8 }}>🔍</Text>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="라면, 햇반 등 상품명 입력..."
            placeholderTextColor="#8D8D99"
            style={styles.input}
            returnKeyType="search"
            onSubmitEditing={handleSearch}
            autoFocus
          />
          {query.trim().length > 0 && (
            <TouchableOpacity onPress={handleSearch} style={styles.searchBtn}>
              <Text style={styles.searchBtnText}>검색</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* 결과 리스트 영역 */}
        <View style={styles.body}>
          {loading ? (
            <View style={styles.centerContainer}>
              <ActivityIndicator size="large" color="#FF4A6B" />
              <Text style={styles.loadingText}>실시간 최저가 조회 중...</Text>
            </View>
          ) : results.length > 0 ? (
            <FlatList
              data={results}
              keyExtractor={(item, index) => index.toString()}
              renderItem={renderProductItem}
              contentContainerStyle={styles.listContainer}
            />
          ) : searched ? (
            <View style={styles.centerContainer}>
              <Text style={{ fontSize: 44, color: '#323238', marginBottom: 12 }}>🛒</Text>
              <Text style={styles.emptyText}>해당 키워드의 검색 결과가 없습니다.</Text>
            </View>
          ) : (
            <View style={styles.centerContainer}>
              <Text style={{ fontSize: 44, color: '#323238', marginBottom: 12 }}>🔍</Text>
              <Text style={styles.emptyText}>검색어를 입력하고 검색을 실행해 주세요.</Text>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: '#121214',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderColor: '#202024',
  },
  headerTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeBtn: {
    padding: 4,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#202024',
    margin: 16,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 48,
  },
  searchIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    color: '#FFF',
    fontSize: 15,
  },
  searchBtn: {
    backgroundColor: '#FF4A6B',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 4,
  },
  searchBtnText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: 'bold',
  },
  body: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  loadingText: {
    color: '#8D8D99',
    marginTop: 12,
    fontSize: 14,
  },
  emptyText: {
    color: '#7C7C8A',
    marginTop: 12,
    fontSize: 14,
    textAlign: 'center',
  },
  listContainer: {
    padding: 16,
  },
  productCard: {
    flexDirection: 'row',
    backgroundColor: '#202024',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#29292E',
  },
  productImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#121214',
  },
  productDetails: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'space-between',
  },
  productName: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
    lineHeight: 18,
  },
  productMall: {
    color: '#FF4A6B',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginTop: 4,
  },
  productPrice: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  shippingText: {
    color: '#7C7C8A',
    fontSize: 11,
  },
});
