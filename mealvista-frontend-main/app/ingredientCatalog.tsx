import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, ScrollView, Image, TouchableOpacity,
    StyleSheet, StatusBar, TextInput, ActivityIndicator,
    RefreshControl,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCart } from '../contexts/CartContext';
import api from '../lib/api';

interface IngredientItem {
    id: string;
    name: string;
    category: string;
    subcategory: string;
    unit: string;
    price: number;
    stock: number;
    status: string;
    description: string;
    origin: string;
    image: string;
}

const STATUS_COLOR = { in_stock: '#10B981', low_stock: '#F59E0B', out_of_stock: '#EF4444' };
const STATUS_LABEL = { in_stock: 'In Stock', low_stock: 'Low Stock', out_of_stock: 'Out of Stock' };

export default function IngredientCatalog() {
    const router = useRouter();
    const { addToCart, getTotalItems, cartItems } = useCart();

    const [items, setItems] = useState<IngredientItem[]>([]);
    const [categories, setCategories] = useState<string[]>(['All']);
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [addedIds, setAddedIds] = useState<Set<string>>(new Set());

    const fetchCatalog = useCallback(async (cat?: string, q?: string) => {
        try {
            setError(null);
            const params: any = {};
            const catToUse = cat ?? selectedCategory;
            const searchToUse = q ?? search;
            if (catToUse && catToUse !== 'All') params.category = catToUse;
            if (searchToUse) params.search = searchToUse;

            const res = await api.get('/api/ingredients/catalog', { params });
            if (res.data.success) {
                setItems(res.data.items);
                setCategories(res.data.categories);
            }
        } catch (err: any) {
            setError('Could not load ingredients. Check your connection.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [selectedCategory, search]);

    useEffect(() => { fetchCatalog(); }, []);

    const handleCategoryChange = (cat: string) => {
        setSelectedCategory(cat);
        setLoading(true);
        fetchCatalog(cat, search);
    };

    const handleSearch = (text: string) => {
        setSearch(text);
        if (text.length === 0 || text.length >= 2) {
            setLoading(true);
            fetchCatalog(selectedCategory, text);
        }
    };

    const handleAddToCart = (item: IngredientItem) => {
        addToCart({
            id: `catalog-${item.id}`,
            name: item.name,
            price: item.price,
            category: item.category,
            image: item.image,
        });
        setAddedIds(prev => new Set([...prev, item.id]));
        setTimeout(() => {
            setAddedIds(prev => {
                const next = new Set(prev);
                next.delete(item.id);
                return next;
            });
        }, 1500);
    };

    const isInCart = (itemId: string) =>
        cartItems.some(c => c.id === `catalog-${itemId}`);

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#3C2253" />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Feather name="arrow-left" size={24} color="#fff" />
                </TouchableOpacity>
                <View style={styles.headerText}>
                    <Text style={styles.headerTitle}>Ingredient Catalog</Text>
                    <Text style={styles.headerSub}>Fresh ingredients delivered to you</Text>
                </View>
                <TouchableOpacity onPress={() => router.push('/viewCart')} style={styles.cartBtn}>
                    <Feather name="shopping-cart" size={22} color="#fff" />
                    {getTotalItems() > 0 && (
                        <View style={styles.cartBadge}>
                            <Text style={styles.cartBadgeText}>{getTotalItems()}</Text>
                        </View>
                    )}
                </TouchableOpacity>
            </View>

            {/* Search Bar */}
            <View style={styles.searchContainer}>
                <Feather name="search" size={18} color="#9CA3AF" style={styles.searchIcon} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search ingredients..."
                    placeholderTextColor="#9CA3AF"
                    value={search}
                    onChangeText={handleSearch}
                />
                {search.length > 0 && (
                    <TouchableOpacity onPress={() => handleSearch('')}>
                        <Feather name="x" size={16} color="#9CA3AF" />
                    </TouchableOpacity>
                )}
            </View>

            {/* Category Tabs */}
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.categoriesBar}
                contentContainerStyle={styles.categoriesContent}
            >
                {categories.map(cat => (
                    <TouchableOpacity
                        key={cat}
                        style={[styles.categoryTab, selectedCategory === cat && styles.categoryTabActive]}
                        onPress={() => handleCategoryChange(cat)}
                    >
                        <Text style={[styles.categoryTabText, selectedCategory === cat && styles.categoryTabTextActive]}>
                            {cat}
                        </Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            {/* Content */}
            {loading ? (
                <View style={styles.loadingBox}>
                    <ActivityIndicator size="large" color="#3C2253" />
                    <Text style={styles.loadingText}>Loading catalog...</Text>
                </View>
            ) : error ? (
                <View style={styles.errorBox}>
                    <Feather name="wifi-off" size={32} color="#DC2626" />
                    <Text style={styles.errorText}>{error}</Text>
                    <TouchableOpacity style={styles.retryBtn} onPress={() => { setLoading(true); fetchCatalog(); }}>
                        <Text style={styles.retryText}>Retry</Text>
                    </TouchableOpacity>
                </View>
            ) : items.length === 0 ? (
                <View style={styles.emptyBox}>
                    <Feather name="package" size={48} color="#D1D5DB" />
                    <Text style={styles.emptyTitle}>No ingredients found</Text>
                    <Text style={styles.emptyText}>Try a different category or search term.</Text>
                </View>
            ) : (
                <ScrollView
                    style={styles.list}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchCatalog(); }} colors={['#3C2253']} />}
                >
                    <Text style={styles.resultsCount}>{items.length} item{items.length !== 1 ? 's' : ''}</Text>
                    {items.map(item => {
                        const inCart = isInCart(item.id);
                        const justAdded = addedIds.has(item.id);
                        const statusColor = STATUS_COLOR[item.status as keyof typeof STATUS_COLOR] || '#10B981';
                        const statusLabel = STATUS_LABEL[item.status as keyof typeof STATUS_LABEL] || 'In Stock';
                        const isUnavailable = item.status === 'out_of_stock';

                        return (
                            <View key={item.id} style={[styles.itemCard, isUnavailable && styles.itemCardUnavailable]}>
                                <Image
                                    source={{ uri: item.image || 'https://images.unsplash.com/photo-1490818387583-1baba5e638af?w=400' }}
                                    style={styles.itemImage}
                                />
                                <View style={styles.itemInfo}>
                                    <View style={styles.itemTopRow}>
                                        <Text style={styles.itemName}>{item.name}</Text>
                                        <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                                    </View>
                                    <Text style={styles.itemCategory}>{item.category}{item.subcategory ? ` • ${item.subcategory}` : ''}</Text>

                                    {item.origin ? (
                                        <Text style={styles.itemOrigin}>🌍 {item.origin}</Text>
                                    ) : null}

                                    <View style={styles.itemBottomRow}>
                                        <View>
                                            <Text style={styles.itemPrice}>
                                                Rs {item.price > 0 ? item.price.toFixed(2) : 'Free'}
                                                <Text style={styles.itemUnit}> / {item.unit}</Text>
                                            </Text>
                                            <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
                                        </View>

                                        <TouchableOpacity
                                            style={[
                                                styles.addBtn,
                                                inCart && styles.addBtnInCart,
                                                isUnavailable && styles.addBtnDisabled,
                                                justAdded && styles.addBtnAdded,
                                            ]}
                                            onPress={() => !isUnavailable && !inCart && handleAddToCart(item)}
                                            disabled={isUnavailable}
                                        >
                                            <Feather
                                                name={justAdded ? 'check' : inCart ? 'check' : 'plus'}
                                                size={16}
                                                color={inCart || justAdded ? '#3C2253' : '#fff'}
                                            />
                                            <Text style={[styles.addBtnText, (inCart || justAdded) && styles.addBtnTextInCart]}>
                                                {justAdded ? 'Added!' : inCart ? 'In Cart' : 'Add'}
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </View>
                        );
                    })}
                </ScrollView>
            )}

            {/* Floating cart button */}
            {getTotalItems() > 0 && (
                <TouchableOpacity style={styles.floatingCart} onPress={() => router.push('/viewCart')}>
                    <Feather name="shopping-cart" size={18} color="#fff" />
                    <Text style={styles.floatingCartText}>View Cart ({getTotalItems()} items)</Text>
                    <Feather name="arrow-right" size={16} color="#fff" />
                </TouchableOpacity>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F9FAFB' },
    header: {
        backgroundColor: '#3C2253', paddingHorizontal: 16,
        paddingTop: 50, paddingBottom: 16,
        flexDirection: 'row', alignItems: 'center', gap: 12,
    },
    backBtn: { padding: 8 },
    headerText: { flex: 1 },
    headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
    headerSub: { fontSize: 12, color: '#D8B4FE', marginTop: 2 },
    cartBtn: { padding: 8, position: 'relative' },
    cartBadge: {
        position: 'absolute', top: 4, right: 4,
        backgroundColor: '#FF6B6B', borderRadius: 9, minWidth: 18, height: 18,
        alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4,
    },
    cartBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },

    searchContainer: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: '#fff', marginHorizontal: 16, marginTop: 12,
        borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10,
        borderWidth: 1, borderColor: '#E5E7EB', gap: 10,
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
    },
    searchIcon: {},
    searchInput: { flex: 1, fontSize: 14, color: '#1F2937' },

    categoriesBar: { maxHeight: 52 },
    categoriesContent: { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
    categoryTab: {
        paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
        backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#E5E7EB',
    },
    categoryTabActive: { backgroundColor: '#3C2253', borderColor: '#3C2253' },
    categoryTabText: { fontSize: 13, fontWeight: '600', color: '#6B7280' },
    categoryTabTextActive: { color: '#fff' },

    loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
    loadingText: { fontSize: 14, color: '#6B7280' },

    errorBox: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 32 },
    errorText: { fontSize: 14, color: '#DC2626', textAlign: 'center' },
    retryBtn: { backgroundColor: '#3C2253', paddingHorizontal: 24, paddingVertical: 10, borderRadius: 20 },
    retryText: { color: '#fff', fontWeight: '700' },

    emptyBox: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 32 },
    emptyTitle: { fontSize: 16, fontWeight: '700', color: '#374151' },
    emptyText: { fontSize: 13, color: '#9CA3AF', textAlign: 'center' },

    list: { flex: 1 },
    listContent: { padding: 16, paddingBottom: 100 },
    resultsCount: { fontSize: 12, color: '#9CA3AF', marginBottom: 12 },

    itemCard: {
        backgroundColor: '#fff', borderRadius: 14, flexDirection: 'row',
        marginBottom: 12, overflow: 'hidden',
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4,
        elevation: 2,
    },
    itemCardUnavailable: { opacity: 0.6 },
    itemImage: { width: 90, height: 90, backgroundColor: '#F3F4F6' },
    itemInfo: { flex: 1, padding: 12 },
    itemTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 },
    itemName: { fontSize: 15, fontWeight: '700', color: '#1F2937', flex: 1 },
    statusDot: { width: 8, height: 8, borderRadius: 4, marginLeft: 8 },
    itemCategory: { fontSize: 12, color: '#9CA3AF', marginBottom: 2 },
    itemOrigin: { fontSize: 11, color: '#6B7280', marginBottom: 6 },
    itemBottomRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 4 },
    itemPrice: { fontSize: 15, fontWeight: '700', color: '#3C2253' },
    itemUnit: { fontSize: 11, fontWeight: '400', color: '#9CA3AF' },
    statusText: { fontSize: 11, fontWeight: '600', marginTop: 2 },

    addBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        backgroundColor: '#3C2253', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20,
    },
    addBtnInCart: { backgroundColor: '#E0E7FF', borderWidth: 1.5, borderColor: '#3C2253' },
    addBtnAdded: { backgroundColor: '#D1FAE5', borderWidth: 1.5, borderColor: '#10B981' },
    addBtnDisabled: { backgroundColor: '#E5E7EB' },
    addBtnText: { fontSize: 13, fontWeight: '600', color: '#fff' },
    addBtnTextInCart: { color: '#3C2253' },

    floatingCart: {
        position: 'absolute', bottom: 20, left: 20, right: 20,
        backgroundColor: '#3C2253', borderRadius: 14, paddingVertical: 14, paddingHorizontal: 20,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        shadowColor: '#3C2253', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8,
        elevation: 6,
    },
    floatingCartText: { color: '#fff', fontSize: 15, fontWeight: '700', flex: 1, textAlign: 'center' },
});
