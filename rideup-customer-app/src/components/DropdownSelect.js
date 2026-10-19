import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
  TextInput,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const COLORS = {
  primary: '#0ea5e9',
  surface: '#FFFFFF',
  background: '#F8FAFC',
  text: '#0F172A',
  textMuted: '#64748B',
  border: '#E2E8F0',
};

export default function DropdownSelect({
  label,
  placeholder = 'Chọn một mục...',
  value,
  options = [],
  onSelect,
  disabled = false,
  showAllOption = false,
}) {
  const [open, setOpen] = useState(false);
  const [searchText, setSearchText] = useState('');

  const selectedItem = options?.find(
    (o) => String(o.id) === String(value)
  );

  const filteredOptions = options?.filter((item) =>
    (item?.name || '').toLowerCase().includes(searchText.toLowerCase())
  );

  const handleSelect = (id) => {
    onSelect?.(id);
    setOpen(false);
    setSearchText('');
  };

  return (
    <>
      <TouchableOpacity
        style={[styles.button, disabled && styles.buttonDisabled]}
        onPress={() => {
          if (!disabled) setOpen(true);
        }}
        activeOpacity={0.7}
      >
        <Text
          style={[
            styles.buttonText,
            !selectedItem && styles.placeholderText,
          ]}
          numberOfLines={1}
        >
          {selectedItem ? selectedItem.name : placeholder}
        </Text>
        <Ionicons
          name="chevron-down"
          size={16}
          color={disabled ? COLORS.border : COLORS.textMuted}
        />
      </TouchableOpacity>

      <Modal
        visible={open}
        transparent
        animationType="slide"
        onRequestClose={() => {
          Keyboard.dismiss();
          setOpen(false);
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardContainer}
        >
          <TouchableOpacity
            style={styles.overlay}
            activeOpacity={1}
            onPress={() => {
              Keyboard.dismiss();
              setOpen(false);
            }}
          />
          <View style={styles.sheet}>
            <SafeAreaView style={{ flex: 1 }}>
              {/* Header */}
              <View style={styles.header}>
                <Text style={styles.title}>{label || placeholder}</Text>
                <TouchableOpacity
                  onPress={() => {
                    Keyboard.dismiss();
                    setOpen(false);
                  }}
                  style={styles.closeBtn}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="close" size={22} color={COLORS.textMuted} />
                </TouchableOpacity>
              </View>

              {/* Search Input if list is large */}
              {options?.length > 5 && (
                <View style={styles.searchBox}>
                  <Ionicons name="search" size={16} color={COLORS.textMuted} />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Tìm kiếm..."
                    placeholderTextColor={COLORS.textMuted}
                    value={searchText}
                    onChangeText={setSearchText}
                    autoCorrect={false}
                    returnKeyType="done"
                    onSubmitEditing={Keyboard.dismiss}
                  />
                  {searchText.length > 0 && (
                    <TouchableOpacity onPress={() => setSearchText('')}>
                      <Ionicons name="close-circle" size={16} color={COLORS.textMuted} />
                    </TouchableOpacity>
                  )}
                </View>
              )}

              {/* List */}
              <FlatList
                data={filteredOptions}
                keyExtractor={(item) => String(item.id)}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
              ListHeaderComponent={
                showAllOption ? (
                  <TouchableOpacity
                    style={styles.item}
                    onPress={() => handleSelect('')}
                  >
                    <Text
                      style={[
                        styles.itemText,
                        !value && { color: COLORS.primary, fontWeight: '700' },
                      ]}
                    >
                      -- Tất cả --
                    </Text>
                    {!value && (
                      <Ionicons name="checkmark" size={18} color={COLORS.primary} />
                    )}
                  </TouchableOpacity>
                ) : null
              }
              renderItem={({ item }) => {
                const isSelected = String(item.id) === String(value);
                return (
                  <TouchableOpacity
                    style={[styles.item, isSelected && styles.itemSelected]}
                    onPress={() => handleSelect(item.id)}
                    activeOpacity={0.6}
                  >
                    <Text
                      style={[
                        styles.itemText,
                        isSelected && { color: COLORS.primary, fontWeight: '700' },
                      ]}
                      numberOfLines={1}
                    >
                      {item.name}
                    </Text>
                    {isSelected && (
                      <Ionicons name="checkmark" size={18} color={COLORS.primary} />
                    )}
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>Không tìm thấy kết quả nào</Text>
                </View>
              }
              contentContainerStyle={styles.listContent}
            />
          </SafeAreaView>
        </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 44,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    backgroundColor: COLORS.surface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
  },
  buttonDisabled: {
    backgroundColor: '#F1F5F9',
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '500',
    flex: 1,
    marginRight: 6,
  },
  placeholderText: {
    color: COLORS.textMuted,
    fontWeight: 'normal',
  },
  keyboardContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  overlay: {
    flex: 1,
  },
  sheet: {
    height: '65%',
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  closeBtn: {
    padding: 4,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    height: 40,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: COLORS.text,
  },
  listContent: {
    paddingBottom: 24,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  itemSelected: {
    backgroundColor: '#F0F9FF',
  },
  itemText: {
    fontSize: 15,
    color: COLORS.text,
    flex: 1,
    marginRight: 8,
  },
  emptyContainer: {
    padding: 30,
    alignItems: 'center',
  },
  emptyText: {
    color: COLORS.textMuted,
    fontSize: 14,
  },
});
