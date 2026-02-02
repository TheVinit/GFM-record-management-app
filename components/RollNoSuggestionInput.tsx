import React, { useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { COLORS } from '../constants/colors';
import { BRANCH_MAPPINGS, YEAR_MAPPINGS } from '../constants/Mappings';

interface RollNoSuggestion {
    value: string;
    label: string;
}

interface RollNoSuggestionInputProps {
    department?: string;
    year?: string;
    division?: string;
    value: string;
    onSelect: (value: string) => void;
    placeholder?: string;
}

/**
 * Smart Roll No Suggestion Component
 * Generates Roll No suggestions based on department, year, and division filters
 * 
 * Format Examples:
 * - CS2401 (Computer Science, Year 2024, Roll 01)
 * - ME2401 (Mechanical Engineering, Year 2024, Roll 01)
 */
export const RollNoSuggestionInput: React.FC<RollNoSuggestionInputProps> = ({
    department,
    year,
    division,
    value,
    onSelect,
    placeholder = 'Enter Roll number...'
}) => {
    const [suggestions, setSuggestions] = useState<RollNoSuggestion[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);

    useEffect(() => {
        generateSuggestions();
    }, [department, year, division, value]);

    const generateSuggestions = () => {
        if (!department || !year) {
            setSuggestions([]);
            return;
        }

        const suggestions: RollNoSuggestion[] = [];
        const deptCode = department;
        const yearNum = year.match(/\d+/)?.[0] || '24';
        const baseRoll = `${deptCode}${yearNum}`;

        if (division) {
            suggestions.push({
                value: `${baseRoll}${division}`,
                label: `${baseRoll}${division} (${BRANCH_MAPPINGS[deptCode]} ${YEAR_MAPPINGS[year]}, Div ${division})`
            });
        }

        const filtered = value
            ? suggestions.filter(s => s.value.toLowerCase().includes(value.toLowerCase()))
            : suggestions;

        setSuggestions(filtered);
        setShowSuggestions(filtered.length > 0 && value.length > 0);
    };

    const handleSelectSuggestion = (suggestion: RollNoSuggestion) => {
        onSelect(suggestion.value);
        setShowSuggestions(false);
    };

    return (
        <View style={styles.container}>
            {showSuggestions && suggestions.length > 0 && (
                <View style={styles.suggestionsContainer}>
                    <Text style={styles.suggestionsHeader}>Suggested Roll Numbers:</Text>
                    <FlatList
                        data={suggestions}
                        keyExtractor={(item) => item.value}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                style={styles.suggestionItem}
                                onPress={() => handleSelectSuggestion(item)}
                            >
                                <Text style={styles.suggestionValue}>{item.value}</Text>
                                <Text style={styles.suggestionLabel}>{item.label}</Text>
                            </TouchableOpacity>
                        )}
                        style={styles.suggestionsList}
                        nestedScrollEnabled
                    />
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'relative',
        zIndex: 1000,
    },
    suggestionsContainer: {
        backgroundColor: '#fff',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: COLORS.border,
        marginTop: 5,
        maxHeight: 250,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
    },
    suggestionsHeader: {
        fontSize: 12,
        fontWeight: '700',
        color: COLORS.textLight,
        padding: 12,
        paddingBottom: 8,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    suggestionsList: {
        maxHeight: 200,
    },
    suggestionItem: {
        padding: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    suggestionValue: {
        fontSize: 15,
        fontWeight: 'bold',
        color: COLORS.primary,
        marginBottom: 4,
    },
    suggestionLabel: {
        fontSize: 12,
        color: COLORS.textLight,
    },
});
